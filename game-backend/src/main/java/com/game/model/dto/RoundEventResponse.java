package com.game.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoundEventResponse {

    private UUID id;
    private UUID roomId;
    private UUID gameResultId;
    private String eventType;
    private String eventTitle;
    private String description;
    private String payloadJson;
    private UUID actorUserId;
    private String actorUsername;
    private String actorRole;
    private OffsetDateTime createdAt;
}