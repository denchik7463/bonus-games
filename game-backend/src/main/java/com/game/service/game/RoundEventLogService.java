package com.game.service.game;

import com.game.model.dto.RoundEventResponse;
import com.game.model.entity.RoundEventLog;
import com.game.repository.RoundEventLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoundEventLogService {

    private final RoundEventLogRepository roundEventLogRepository;

    @Transactional
    public void logSystemEvent(UUID roomId,
                               UUID gameResultId,
                               String eventType,
                               String eventTitle,
                               String description,
                               String payloadJson) {
        RoundEventLog event = RoundEventLog.builder()
                .id(UUID.randomUUID())
                .roomId(roomId)
                .gameResultId(gameResultId)
                .eventType(eventType)
                .eventTitle(eventTitle)
                .description(description)
                .payloadJson(payloadJson)
                .actorUserId(null)
                .actorUsername("system")
                .actorRole("SYSTEM")
                .createdAt(OffsetDateTime.now())
                .build();

        roundEventLogRepository.save(event);
    }

    @Transactional(readOnly = true)
    public List<RoundEventResponse> getByGameResultId(UUID gameResultId) {
        return roundEventLogRepository.findByGameResultIdOrderByCreatedAtAsc(gameResultId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RoundEventResponse> getByRoomId(UUID roomId) {
        return roundEventLogRepository.findByRoomIdOrderByCreatedAtAsc(roomId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private RoundEventResponse toResponse(RoundEventLog event) {
        return RoundEventResponse.builder()
                .id(event.getId())
                .roomId(event.getRoomId())
                .gameResultId(event.getGameResultId())
                .eventType(event.getEventType())
                .eventTitle(event.getEventTitle())
                .description(event.getDescription())
                .payloadJson(event.getPayloadJson())
                .actorUserId(event.getActorUserId())
                .actorUsername(event.getActorUsername())
                .actorRole(event.getActorRole())
                .createdAt(event.getCreatedAt())
                .build();
    }
}