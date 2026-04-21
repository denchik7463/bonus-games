package com.game.model.dto;

import lombok.Value;

import java.util.UUID;

@Value
public class PopularRoomTemplateResponse {
    UUID templateId;
    String templateName;
    Long roomCount;
    Integer maxPlayers;
    Integer entryCost;
    Boolean bonusEnabled;
}
