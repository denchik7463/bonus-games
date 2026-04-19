package com.game.model.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class RoomPlayerResponse {
    UUID userId;
    String username;
    UUID walletReservationId;
    Boolean boostUsed;
    String roundId;
    Integer playerOrder;
    Boolean winner;
    String status;
    LocalDateTime joinTime;
}
