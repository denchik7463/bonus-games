package com.game.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class RoomResponse {

    private UUID id;
    private String shortId;
    private UUID templateId;
    private Integer maxPlayers;
    private Integer entryCost;
    private Integer prizeFund;
    private Boolean boostAllowed;
    private Integer boostPrice;
    private Integer boostWeight;
    private Double currentChancePercent;
    private Double chanceWithBoostPercent;
    private Double boostAbsoluteGainPercent;
    private Integer timerSeconds;
    private String status;
    private Integer currentPlayers;
    private Integer botCount;
    private LocalDateTime createdAt;
    private Long remainingSeconds;
}
