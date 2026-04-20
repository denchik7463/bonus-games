package com.game.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserWinStreakResponse {

    private UUID userId;
    private String username;
    private Integer currentWinStreak;
    private UUID latestGameResultId;
    private OffsetDateTime latestGameAt;
    private OffsetDateTime calculatedAt;
}