package com.game.model.dto;

import lombok.Value;

import java.util.UUID;

@Value
public class TopPlayerBalanceResponse {
    UUID userId;
    String username;
    Long availableBalance;
    Long reservedBalance;
    Long totalBalance;
}
