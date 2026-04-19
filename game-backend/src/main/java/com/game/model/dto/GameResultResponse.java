package com.game.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameResultResponse {

    private UUID id;
    private UUID roomId;
    private Integer maxPlayers;
    private Integer entryCost;
    private Integer prizeFund;
    private Boolean boostAllowed;
    private Integer botCount;
    private String roomStatus;

    private String winnerPlayerExternalId;
    private String winnerPlayerName;
    private Integer winnerPositionIndex;

    private Integer baseWeight;
    private Integer boostBonus;
    private Integer totalWeight;
    private Integer roll;
    private String randomHash;
    private String randomSeed;

    private OffsetDateTime createdAt;
    private List<PlayerResultResponse> participants;
    private List<RoundEventResponse> events;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PlayerResultResponse {
        private Integer positionIndex;
        private String playerExternalId;
        private String username;
        private Boolean bot;
        private Boolean boostUsed;
        private Integer finalWeight;
        private Long balanceBefore;
        private Long balanceAfter;
        private Long balanceDelta;
        private String status;
        private Boolean winner;
    }
}
