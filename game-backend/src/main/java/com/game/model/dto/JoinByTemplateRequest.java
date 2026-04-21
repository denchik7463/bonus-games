package com.game.model.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class JoinByTemplateRequest {

    private UUID templateId;

    @NotNull
    @Min(1)
    @Max(10)
    private Integer maxPlayers;

    @NotNull
    @Min(0)
    private Integer entryCost;

    @NotNull
    private Boolean boostAllowed;

    private List<Integer> seats;

    @Min(1)
    private Integer seatsCount;
}
