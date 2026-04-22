package com.game.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.game.auth.AuthService;
import com.game.model.entity.Room;
import com.game.model.entity.RoomConfig;
import com.game.model.entity.RoomPlayer;
import com.game.model.entity.RoundEventLog;
import com.game.model.entity.User;
import com.game.repository.RoomConfigRepository;
import com.game.repository.RoomPlayerRepository;
import com.game.repository.RoomRepository;
import com.game.repository.RoundEventLogRepository;
import com.game.realtime.dto.EventType;
import com.game.realtime.dto.WsEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.List;
import java.util.LinkedHashMap;

@Component
@Slf4j
public class WebSocketHandler extends TextWebSocketHandler {

    private static final String ATTR_ROOM_ID = "roomId";
    private static final String ATTR_USER_ID = "userId";
    private static final Set<String> TIMER_ACTIVE_STATUSES = Set.of("WAITING", "FULL");

    private final AuthService authService;
    private final ObjectMapper objectMapper;
    private final RoomRepository roomRepository;
    private final RoomConfigRepository roomConfigRepository;
    private final RoomPlayerRepository roomPlayerRepository;
    private final RoundEventLogRepository roundEventLogRepository;
    private final Map<UUID, Set<WebSocketSession>> roomSessions = new ConcurrentHashMap<>();

    public WebSocketHandler(AuthService authService,
                            ObjectMapper objectMapper,
                            RoomRepository roomRepository,
                            RoomConfigRepository roomConfigRepository,
                            RoomPlayerRepository roomPlayerRepository,
                            RoundEventLogRepository roundEventLogRepository) {
        this.authService = authService;
        this.objectMapper = objectMapper;
        this.roomRepository = roomRepository;
        this.roomConfigRepository = roomConfigRepository;
        this.roomPlayerRepository = roomPlayerRepository;
        this.roundEventLogRepository = roundEventLogRepository;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        try {
            Map<String, String> query = parseQuery(session.getUri());
            String token = query.get("token");
            String roomIdRaw = query.get("roomId");

            if (token == null || token.isBlank() || roomIdRaw == null || roomIdRaw.isBlank()) {
                session.close(CloseStatus.POLICY_VIOLATION.withReason("token and roomId are required"));
                return;
            }

            User user = authService.authenticate(token);
            UUID roomId = UUID.fromString(roomIdRaw);

            session.getAttributes().put(ATTR_ROOM_ID, roomId);
            session.getAttributes().put(ATTR_USER_ID, user.getId());

            roomSessions.computeIfAbsent(roomId, ignored -> ConcurrentHashMap.newKeySet()).add(session);
            log.info("WS connected: roomId={}, userId={}, session={}", roomId, user.getId(), session.getId());
            pushInitialSnapshot(roomId);
        } catch (Exception ex) {
            log.warn("WS handshake failed: {}", ex.getMessage());
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Unauthorized websocket connection"));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        UUID roomId = (UUID) session.getAttributes().get(ATTR_ROOM_ID);
        if (roomId != null) {
            Set<WebSocketSession> sessions = roomSessions.get(roomId);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    roomSessions.remove(roomId);
                }
            }
        }
        log.info("WS disconnected: roomId={}, session={}, code={}", roomId, session.getId(), status.getCode());
    }

    public void sendRoomState(UUID roomId, Object payload) {
        send(roomId, EventType.ROOM_STATE, payload);
    }

    public void sendRoomEvents(UUID roomId, Object payload) {
        send(roomId, EventType.ROOM_EVENTS, payload);
    }

    @Scheduled(fixedDelay = 1000)
    public void pushRealtimeRoomStates() {
        if (roomSessions.isEmpty()) {
            return;
        }
        for (UUID roomId : List.copyOf(roomSessions.keySet())) {
            Room room = roomRepository.findById(roomId).orElse(null);
            if (room == null || !isTimerTickRequired(room)) {
                continue;
            }
            pushRoomStateSnapshot(roomId, room);
        }
    }

    private void pushInitialSnapshot(UUID roomId) {
        pushRoomStateSnapshot(roomId, null);

        List<RoundEventLog> events = roundEventLogRepository.findByRoomIdOrderByCreatedAtAsc(roomId);
        sendRoomEvents(roomId, events);
    }

    private void pushRoomStateSnapshot(UUID roomId, Room room) {
        Map<String, Object> roomState = buildRoomStatePayload(roomId, room);
        if (roomState != null) {
            sendRoomState(roomId, roomState);
        }
    }

    private Map<String, Object> buildRoomStatePayload(UUID roomId, Room roomSnapshot) {
        Room room = roomSnapshot != null ? roomSnapshot : roomRepository.findById(roomId).orElse(null);
        if (room == null) {
            return null;
        }

        List<RoomPlayer> players = roomPlayerRepository.findByRoom_IdOrderByPlayerOrderAsc(roomId);
        BoostContext boostContext = resolveBoostContext(room);
        RoomChanceSummary chanceSummary = calculateRoomChanceSummary(room.getMaxPlayers(), boostContext);
        List<Integer> occupiedSeats = players.stream()
                .map(RoomPlayer::getPlayerOrder)
                .filter(java.util.Objects::nonNull)
                .sorted()
                .toList();

        int maxPlayers = room.getMaxPlayers() == null ? 0 : room.getMaxPlayers();
        List<Integer> freeSeats = new java.util.ArrayList<>();
        for (int seat = 1; seat <= maxPlayers; seat++) {
            if (!occupiedSeats.contains(seat)) {
                freeSeats.add(seat);
            }
        }

        Map<String, Object> roomState = new LinkedHashMap<>();
        roomState.put("roomId", room.getId());
        roomState.put("shortId", room.getShortId());
        roomState.put("status", room.getStatus());
        roomState.put("currentPlayers", room.getCurrentPlayers());
        roomState.put("maxPlayers", room.getMaxPlayers());
        roomState.put("entryCost", room.getEntryCost());
        roomState.put("prizeFund", resolveRoomPrizeFund(room));
        roomState.put("boostPrice", boostContext.boostPrice());
        roomState.put("boostWeight", boostContext.boostWeight());
        roomState.put("currentChancePercent", chanceSummary.currentChancePercent());
        roomState.put("chanceWithBoostPercent", chanceSummary.chanceWithBoostPercent());
        roomState.put("boostAbsoluteGainPercent", chanceSummary.boostAbsoluteGainPercent());
        roomState.put("timerSeconds", room.getTimerSeconds());
        roomState.put("remainingSeconds", remainingSeconds(room));
        roomState.put("occupiedSeats", occupiedSeats);
        roomState.put("freeSeats", freeSeats);
        roomState.put("createdAt", room.getCreatedAt());
        roomState.put("firstPlayerJoinedAt", room.getFirstPlayerJoinedAt());
        roomState.put("startedAt", room.getStartedAt());
        roomState.put("finishedAt", room.getFinishedAt());
        roomState.put("players", players.stream().map(player -> {
            Map<String, Object> p = new LinkedHashMap<>();
            p.put("userId", player.getUserId());
            p.put("username", player.getUsername());
            p.put("walletReservationId", player.getWalletReservationId());
            p.put("boostUsed", player.getBoostUsed());
            p.put("boostReservationId", player.getBoostReservationId());
            p.put("bot", player.getBot());
            p.put("roundId", player.getRoundId());
            p.put("playerOrder", player.getPlayerOrder());
            p.put("winner", player.getWinner());
            p.put("status", player.getStatus());
            p.put("joinTime", player.getJoinTime());
            return p;
        }).toList());
        return roomState;
    }

    private boolean isTimerTickRequired(Room room) {
        if (room.getFirstPlayerJoinedAt() == null) {
            return false;
        }
        if (room.getTimerSeconds() == null || room.getTimerSeconds() <= 0) {
            return false;
        }
        if (!TIMER_ACTIVE_STATUSES.contains(room.getStatus())) {
            return false;
        }
        Long remaining = remainingSeconds(room);
        return remaining != null && remaining > 0;
    }

    private Long remainingSeconds(Room room) {
        if (room.getFirstPlayerJoinedAt() == null) {
            return null;
        }
        if (room.getTimerSeconds() == null || room.getTimerSeconds() <= 0) {
            return 0L;
        }
        LocalDateTime timeoutAt = room.getFirstPlayerJoinedAt().plusSeconds(room.getTimerSeconds());
        long millisLeft = Duration.between(LocalDateTime.now(), timeoutAt).toMillis();
        if (millisLeft <= 0) {
            return 0L;
        }
        return (long) Math.ceil(millisLeft / 1000.0d);
    }

    private double round4(double value) {
        return Math.round(value * 10_000.0d) / 10_000.0d;
    }

    private RoomChanceSummary calculateRoomChanceSummary(Integer maxPlayers, BoostContext boostContext) {
        if (maxPlayers == null || maxPlayers <= 0) {
            return new RoomChanceSummary(0.0d, 0.0d, 0.0d);
        }
        int baseWeight = Math.max(1, boostContext.baseWeight());
        int boostWeight = Math.max(0, boostContext.boostWeight());
        double currentChance = 100.0d / (double) maxPlayers;
        double chanceWithBoost;
        if (!boostContext.boostAllowed()) {
            chanceWithBoost = currentChance;
        } else {
            int denominator = (baseWeight * (maxPlayers - 1)) + (baseWeight + boostWeight);
            chanceWithBoost = denominator <= 0
                    ? 0.0d
                    : ((double) (baseWeight + boostWeight) * 100.0d / (double) denominator);
        }
        double absoluteGain = chanceWithBoost - currentChance;
        return new RoomChanceSummary(
                round4(currentChance),
                round4(chanceWithBoost),
                round4(absoluteGain)
        );
    }

    private long resolveRoomPrizeFund(Room room) {
        if (room.getEntryCost() == null || room.getMaxPlayers() == null) {
            return 0L;
        }
        int winnerPercent = resolveWinnerPercent(room);
        long totalPool = (long) room.getEntryCost() * room.getMaxPlayers();
        return Math.floorDiv(totalPool * winnerPercent, 100);
    }

    private int resolveWinnerPercent(Room room) {
        if (room.getTemplateId() == null) {
            return 100;
        }
        return roomConfigRepository.findById(room.getTemplateId())
                .map(RoomConfig::getWinnerPercent)
                .filter(value -> value != null && value > 0)
                .orElse(100);
    }

    private BoostContext resolveBoostContext(Room room) {
        int boostWeight = 10;
        Integer boostPrice = null;
        boolean boostAllowed = Boolean.TRUE.equals(room.getBoostAllowed());

        if (room.getTemplateId() != null) {
            RoomConfig template = roomConfigRepository.findById(room.getTemplateId()).orElse(null);
            if (template != null) {
                boostWeight = template.getBonusWeight() == null ? 10 : template.getBonusWeight();
                boostPrice = template.getBonusPrice();
                boostAllowed = Boolean.TRUE.equals(template.getBonusEnabled()) && boostWeight > 0;
            }
        }
        return new BoostContext(boostAllowed, 100, Math.max(0, boostWeight), boostPrice);
    }

    private record BoostContext(boolean boostAllowed, int baseWeight, int boostWeight, Integer boostPrice) {
    }

    private record RoomChanceSummary(double currentChancePercent,
                                     double chanceWithBoostPercent,
                                     double boostAbsoluteGainPercent) {
    }

    private void send(UUID roomId, EventType eventType, Object payload) {
        Set<WebSocketSession> sessions = roomSessions.get(roomId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        WsEvent event = WsEvent.builder()
                .type(eventType)
                .roomId(roomId)
                .payload(payload)
                .sentAt(OffsetDateTime.now())
                .build();

        String json;
        try {
            json = objectMapper.writeValueAsString(event);
        } catch (Exception ex) {
            log.error("WS serialization failed for roomId={}: {}", roomId, ex.getMessage(), ex);
            return;
        }

        TextMessage message = new TextMessage(json);
        sessions.removeIf(session -> !session.isOpen());

        for (WebSocketSession session : sessions) {
            try {
                session.sendMessage(message);
            } catch (IOException ex) {
                log.warn("WS send failed: roomId={}, session={}, error={}", roomId, session.getId(), ex.getMessage());
            }
        }
    }

    private Map<String, String> parseQuery(URI uri) {
        Map<String, String> result = new ConcurrentHashMap<>();
        if (uri == null || uri.getRawQuery() == null || uri.getRawQuery().isBlank()) {
            return result;
        }

        String[] parts = uri.getRawQuery().split("&");
        for (String part : parts) {
            String[] kv = part.split("=", 2);
            String key = URLDecoder.decode(kv[0], StandardCharsets.UTF_8);
            String value = kv.length > 1 ? URLDecoder.decode(kv[1], StandardCharsets.UTF_8) : "";
            result.put(key, value);
        }
        return result;
    }
}
