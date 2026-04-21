package com.game.model.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RoomTemplateRequest {

    @NotBlank
    private String templateName;

    @NotNull
    private Boolean active;

    @NotNull
    @Min(0)
    private Integer entryCost;

    @NotNull
    private Boolean bonusEnabled;

    @NotNull
    @Min(0)
    private Integer bonusPrice;

    @NotNull
    @Min(0)
    private Integer bonusWeight;

    @NotNull
    @Min(1)
    @Max(10)
    private Integer maxPlayers;

    @NotNull
    @Min(1)
    @Max(100)
    private Integer winnerPercent;

    @NotBlank
    private String gameMechanic;
}
