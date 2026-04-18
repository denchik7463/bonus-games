package com.game.model.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class RoomTemplateResponse {
    UUID id;
    String templateName;
    Boolean active;
    Integer entryCost;
    Boolean bonusEnabled;
    Integer bonusPrice;
    Integer bonusWeight;
    Integer maxPlayers;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
