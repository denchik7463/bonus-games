package com.game.model.dto;

import jakarta.validation.constraints.Min;
import lombok.Data;

import java.util.List;

@Data
public class JoinRoomRequest {

    private List<Integer> seats;

    @Min(1)
    private Integer seatsCount;
}
