package com.game.model.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class RoomStateResponse {
    UUID roomId;
    String status;
    Integer currentPlayers;
    Integer maxPlayers;
    Integer entryCost;
    Integer prizeFund;
    Integer timerSeconds;
    Long remainingSeconds;
    LocalDateTime createdAt;
    LocalDateTime firstPlayerJoinedAt;
    LocalDateTime startedAt;
    LocalDateTime finishedAt;
    List<RoomPlayerResponse> players;
}
