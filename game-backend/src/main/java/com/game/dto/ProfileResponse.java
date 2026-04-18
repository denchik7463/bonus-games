package com.game.dto;

import java.util.UUID;

public class ProfileResponse {
    private UUID userId;
    private String username;
    private String role;
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

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public BalanceResponse getBalance() {
        return balance;
    }

    public void setBalance(BalanceResponse balance) {
        this.balance = balance;
    }
}
