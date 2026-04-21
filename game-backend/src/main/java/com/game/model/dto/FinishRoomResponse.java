package com.game.model.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;
import java.util.UUID;

@Value
@Builder
public class FinishRoomResponse {
    UUID roomId;
    String roomStatus;
    String winnerUsername;
    UUID winnerUserId;
    Integer winnerIndex;
    Integer roll;
    Integer totalWeight;
    String randomHash;
    Long randomSeed;
    Long prizeFund;
    List<RoomPlayerSettlement> players;

    @Value
    @Builder
    public static class RoomPlayerSettlement {
        UUID userId;
        String username;
        Boolean bot;
        UUID reservationId;
        String reservationStatus;
        Long balanceAfter;
        Boolean winner;
    }
}
