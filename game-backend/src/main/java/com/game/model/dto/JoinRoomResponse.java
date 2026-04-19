package com.game.model.dto;

import com.game.dto.BalanceResponse;
import lombok.Builder;
import lombok.Value;

import java.util.UUID;

@Value
@Builder
public class JoinRoomResponse {
    UUID roomId;
    String roomStatus;
    Integer currentPlayers;
    Integer maxPlayers;
    Long entryCost;
    String roundId;
    UUID reservationId;
    BalanceResponse balance;
}
