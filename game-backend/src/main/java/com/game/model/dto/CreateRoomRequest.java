package com.game.model.dto;

import lombok.Data;

@Data
public class CreateRoomRequest {

    private Integer maxPlayers;
    private Integer entryCost;
    private Boolean boostAllowed;
    private Integer timerSeconds;
}