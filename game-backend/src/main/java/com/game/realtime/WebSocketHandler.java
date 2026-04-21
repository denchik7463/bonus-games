package com.game.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.game.auth.AuthService;
import com.game.model.entity.Room;
import com.game.model.entity.RoomPlayer;
import com.game.model.entity.RoundEventLog;
import com.game.model.entity.User;
import com.game.repository.RoomPlayerRepository;
import com.game.repository.RoomRepository;
import com.game.repository.RoundEventLogRepository;
import com.game.realtime.dto.EventType;
import com.game.realtime.dto.WsEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
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

    private final AuthService authService;
    private final ObjectMapper objectMapper;
    private final RoomRepository roomRepository;
    private final RoomPlayerRepository roomPlayerRepository;
    private final RoundEventLogRepository roundEventLogRepository;
    private final Map<UUID, Set<WebSocketSession>> roomSessions = new ConcurrentHashMap<>();

    public WebSocketHandler(AuthService authService,
                            ObjectMapper objectMapper,
                            RoomRepository roomRepository,
                            RoomPlayerRepository roomPlayerRepository,
                            RoundEventLogRepository roundEventLogRepository) {
        this.authService = authService;
        this.objectMapper = objectMapper;
        this.roomRepository = roomRepository;
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

    private void pushInitialSnapshot(UUID roomId) {
        Room room = roomRepository.findById(roomId).orElse(null);
        if (room != null) {
            List<RoomPlayer> players = roomPlayerRepository.findByRoom_IdOrderByPlayerOrderAsc(roomId);
            Map<String, Object> roomState = new LinkedHashMap<>();
            roomState.put("roomId", room.getId());
            roomState.put("shortId", room.getShortId());
            roomState.put("status", room.getStatus());
            roomState.put("currentPlayers", room.getCurrentPlayers());
            roomState.put("maxPlayers", room.getMaxPlayers());
            roomState.put("entryCost", room.getEntryCost());
            roomState.put("prizeFund", room.getPrizeFund());
            roomState.put("timerSeconds", room.getTimerSeconds());
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
                p.put("roundId", player.getRoundId());
                p.put("playerOrder", player.getPlayerOrder());
                p.put("winner", player.getWinner());
                p.put("status", player.getStatus());
                p.put("joinTime", player.getJoinTime());
                return p;
            }).toList());
            sendRoomState(roomId, roomState);
        }

        List<RoundEventLog> events = roundEventLogRepository.findByRoomIdOrderByCreatedAtAsc(roomId);
        sendRoomEvents(roomId, events);
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
