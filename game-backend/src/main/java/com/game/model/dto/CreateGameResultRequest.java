package com.game.model.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class CreateGameResultRequest {

    @NotNull
    private UUID roomId;

    @NotNull
    private Integer maxPlayers;

    @NotNull
    private Integer entryCost;

    @NotNull
    private Integer prizeFund;

    @NotNull
    private Boolean boostAllowed;

    @NotNull
    private Integer botCount;

    @NotBlank
    private String roomStatus;

    private Integer baseWeight;
    private Integer boostBonus;
    private Integer totalWeight;
    private Integer roll;
    private String randomHash;
    private String randomSeed;

    @Valid
    @NotEmpty
    private List<PlayerInput> participants;

    @Getter
    @Setter
    public static class PlayerInput {

        @NotBlank
        private String playerExternalId;

        @NotBlank
        private String username;

        private Boolean bot;
        private Boolean boostUsed;

        @NotNull
        private Integer finalWeight;

        private Long balanceBefore;
        private Long balanceAfter;
        private Long balanceDelta;
        private String status;
        private Boolean winner;
    }
}