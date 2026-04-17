package com.game.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public class AuthResponse {
    private UUID userId;
    private String username;
    private String token;
    private OffsetDateTime expiresAt;
    private BalanceResponse balance;

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public BalanceResponse getBalance() {
        return balance;
    }

    public void setBalance(BalanceResponse balance) {
        this.balance = balance;
    }
}
