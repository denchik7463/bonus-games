package com.game.model.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BoostActivateRequest {

    @NotNull
    @Min(1)
    private Integer seatNumber;
}

