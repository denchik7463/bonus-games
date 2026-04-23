package com.game.repository;

import com.game.model.entity.RoomPlayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;

public interface RoomPlayerRepository extends JpaRepository<RoomPlayer, Long> {
    boolean existsByRoom_IdAndPlayerOrder(UUID roomId, Integer playerOrder);

    long countByRoom_IdAndUserId(UUID roomId, UUID userId);

    List<RoomPlayer> findByRoom_IdAndPlayerOrderIn(UUID roomId, List<Integer> playerOrders);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select rp from RoomPlayer rp where rp.room.id = :roomId and rp.userId = :userId")
    List<RoomPlayer> findByRoomIdAndUserIdForUpdate(UUID roomId, UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select rp
            from RoomPlayer rp
            where rp.room.id = :roomId
              and rp.userId = :userId
              and rp.playerOrder = :playerOrder
            """)
    java.util.Optional<RoomPlayer> findByRoomIdAndUserIdAndPlayerOrderForUpdate(UUID roomId, UUID userId, Integer playerOrder);

    @Query("""
        select rp
        from RoomPlayer rp
        join fetch rp.room r
        where rp.userId = :userId
          and r.status in :statuses
        order by rp.joinTime desc, rp.id desc
        """)
    List<RoomPlayer> findActiveByUserIdOrderByJoinTimeDesc(UUID userId, List<String> statuses);

    List<RoomPlayer> findByRoom_IdOrderByPlayerOrderAsc(UUID roomId);

    List<RoomPlayer> findByUserIdOrderByJoinTimeDescIdDesc(UUID userId);

    List<RoomPlayer> findByJoinTimeBetweenOrderByJoinTimeAsc(LocalDateTime start, LocalDateTime end);

    @Query("""
        select count(distinct rp.userId)
        from RoomPlayer rp
        join rp.room r
        where rp.bot = false
          and r.status in :statuses
        """)
    Long countDistinctRealUsersInRoomStatuses(List<String> statuses);

    @Query("""
        select rp
        from RoomPlayer rp
        join fetch rp.room r
        where rp.bot = false
          and rp.joinTime is not null
          and rp.joinTime <= :end
          and (r.finishedAt is null or r.finishedAt >= :start)
        order by rp.joinTime asc, rp.id asc
        """)
    List<RoomPlayer> findRealPlayersForOnlineTimeline(LocalDateTime start, LocalDateTime end);
}
