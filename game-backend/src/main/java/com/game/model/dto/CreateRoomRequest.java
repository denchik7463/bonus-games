package com.game.model.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateRoomRequest {

    private Integer maxPlayers;
    private Integer entryCost;
    private Boolean boostAllowed;
}