package com.game.service.dashboard;

import com.game.model.dto.DashboardMetricPointResponse;
import com.game.model.dto.DashboardResponse;
import com.game.model.dto.PopularRoomTemplateResponse;
import com.game.model.dto.TopPlayerBalanceResponse;
import com.game.model.entity.Room;
import com.game.model.entity.RoomPlayer;
import com.game.repository.RoomConfigRepository;
import com.game.repository.RoomPlayerRepository;
import com.game.repository.RoomRepository;
import com.game.repository.WalletAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final int DEFAULT_BUCKET_MINUTES = 60;
    private static final int DEFAULT_RANGE_HOURS = 24;
    private static final int TOP_BALANCES_LIMIT = 100;
    private static final List<String> ACTIVE_ROOM_STATUSES = List.of("WAITING", "FULL");

    private final RoomRepository roomRepository;
    private final RoomPlayerRepository roomPlayerRepository;
    private final RoomConfigRepository roomConfigRepository;
    private final WalletAccountRepository walletAccountRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(LocalDateTime start, LocalDateTime end, Integer bucketMinutes) {
        DateRange range = normalizeRange(start, end);
        int bucketSize = normalizeBucketMinutes(bucketMinutes);

        return DashboardResponse.builder()
                .generatedAt(OffsetDateTime.now(ZoneOffset.UTC))
                .currentActivePlayers(getCurrentActivePlayers())
                .currentActiveRooms(getCurrentActiveRooms())
                .activePlayersTimeline(getActivePlayersTimeline(range.start(), range.end(), bucketSize))
                .roomCountTimeline(getRoomCountTimeline(range.start(), range.end(), bucketSize))
                .popularTemplates(getPopularTemplates())
                .topBalances(getTopBalances())
                .build();
    }

    @Transactional(readOnly = true)
    public List<DashboardMetricPointResponse> getActivePlayersTimeline(LocalDateTime start,
                                                                       LocalDateTime end,
                                                                       Integer bucketMinutes) {
        DateRange range = normalizeRange(start, end);
        return getActivePlayersTimeline(range.start(), range.end(), normalizeBucketMinutes(bucketMinutes));
    }

    @Transactional(readOnly = true)
    public List<DashboardMetricPointResponse> getRoomCountTimeline(LocalDateTime start,
                                                                   LocalDateTime end,
                                                                   Integer bucketMinutes) {
        DateRange range = normalizeRange(start, end);
        return getRoomCountTimeline(range.start(), range.end(), normalizeBucketMinutes(bucketMinutes));
    }

    @Transactional(readOnly = true)
    public List<PopularRoomTemplateResponse> getPopularTemplates() {
        return roomConfigRepository.findPopularTemplates();
    }

    @Transactional(readOnly = true)
    public List<TopPlayerBalanceResponse> getTopBalances() {
        return walletAccountRepository.findTopPlayerBalances(PageRequest.of(0, TOP_BALANCES_LIMIT));
    }

    private Long getCurrentActivePlayers() {
        Long count = roomPlayerRepository.countDistinctRealUsersInRoomStatuses(ACTIVE_ROOM_STATUSES);
        return count == null ? 0L : count;
    }

    private Long getCurrentActiveRooms() {
        return (long) roomRepository.findByStatusIn(ACTIVE_ROOM_STATUSES).size();
    }

    private List<DashboardMetricPointResponse> getActivePlayersTimeline(LocalDateTime start,
                                                                       LocalDateTime end,
                                                                       int bucketMinutes) {
        Map<LocalDateTime, Long> buckets = createEmptyBuckets(start, end, bucketMinutes);
        LocalDateTime endExclusive = end.plusNanos(1);
        List<RoomPlayer> players = roomPlayerRepository.findRealPlayersForOnlineTimeline(start, endExclusive);

        for (LocalDateTime bucketStart : buckets.keySet()) {
            LocalDateTime bucketEndExclusive = bucketStart.plusMinutes(bucketMinutes);
            if (bucketEndExclusive.isAfter(endExclusive)) {
                bucketEndExclusive = endExclusive;
            }
            Set<UUID> uniqueUsers = new HashSet<>();
            for (RoomPlayer player : players) {
                if (isRealPlayerOnlineInInterval(player, bucketStart, bucketEndExclusive)) {
                    uniqueUsers.add(player.getUserId());
                }
            }
            buckets.put(bucketStart, (long) uniqueUsers.size());
        }

        return toSortedPoints(buckets);
    }

    private boolean isRealPlayerOnlineInInterval(RoomPlayer player,
                                                  LocalDateTime intervalStart,
                                                  LocalDateTime intervalEndExclusive) {
        if (player == null || player.getUserId() == null || player.getJoinTime() == null) {
            return false;
        }
        if (!player.getJoinTime().isBefore(intervalEndExclusive)) {
            return false;
        }
        Room room = player.getRoom();
        if (room == null) {
            return false;
        }
        LocalDateTime finishedAt = room.getFinishedAt();
        return finishedAt == null || finishedAt.isAfter(intervalStart);
    }

    private List<DashboardMetricPointResponse> getRoomCountTimeline(LocalDateTime start,
                                                                    LocalDateTime end,
                                                                    int bucketMinutes) {
        List<Room> rooms = roomRepository.findByCreatedAtBetween(start, end);
        Map<LocalDateTime, Long> buckets = createEmptyBuckets(start, end, bucketMinutes);

        for (Room room : rooms) {
            LocalDateTime bucket = toBucket(room.getCreatedAt(), start, bucketMinutes);
            buckets.put(bucket, buckets.getOrDefault(bucket, 0L) + 1);
        }

        return toSortedPoints(buckets);
    }

    private List<DashboardMetricPointResponse> toSortedPoints(Map<LocalDateTime, Long> buckets) {
        return buckets.entrySet()
                .stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new DashboardMetricPointResponse(entry.getKey().atOffset(ZoneOffset.UTC), entry.getValue()))
                .toList();
    }

    private Map<LocalDateTime, Long> createEmptyBuckets(LocalDateTime start,
                                                       LocalDateTime end,
                                                       int bucketMinutes) {
        Map<LocalDateTime, Long> buckets = new LinkedHashMap<>();
        LocalDateTime cursor = start;

        while (!cursor.isAfter(end)) {
            buckets.put(cursor, 0L);
            cursor = cursor.plusMinutes(bucketMinutes);
        }

        return buckets;
    }

    private LocalDateTime toBucket(LocalDateTime value, LocalDateTime rangeStart, int bucketMinutes) {
        long minutesFromStart = Duration.between(rangeStart, value).toMinutes();
        long bucketOffset = (minutesFromStart / bucketMinutes) * bucketMinutes;
        return rangeStart.plusMinutes(bucketOffset);
    }

    private DateRange normalizeRange(LocalDateTime start, LocalDateTime end) {
        LocalDateTime normalizedEnd = end == null ? LocalDateTime.now() : end;
        LocalDateTime normalizedStart = start == null ? normalizedEnd.minusHours(DEFAULT_RANGE_HOURS) : start;

        if (normalizedStart.isAfter(normalizedEnd)) {
            throw new IllegalArgumentException("start must be before end");
        }

        return new DateRange(normalizedStart, normalizedEnd);
    }

    private int normalizeBucketMinutes(Integer bucketMinutes) {
        int value = bucketMinutes == null ? DEFAULT_BUCKET_MINUTES : bucketMinutes;
        if (value <= 0) {
            throw new IllegalArgumentException("bucketMinutes must be > 0");
        }
        if (value > 24 * 60) {
            throw new IllegalArgumentException("bucketMinutes must be <= 1440");
        }
        return value;
    }

    private record DateRange(LocalDateTime start, LocalDateTime end) {
    }
}
