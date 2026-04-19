package com.game.model.dto;

import com.game.dto.BalanceResponse;
import lombok.Builder;
import lombok.Value;

import java.util.UUID;

@Value
@Builder
public class BoostActivationResponse {
    UUID roomId;
    UUID userId;
    String username;
    Boolean boostUsed;
    Integer boostPrice;
    Integer boostWeight;
    BalanceResponse balance;
}
