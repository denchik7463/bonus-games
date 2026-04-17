package com.game.dto;

import com.game.model.enums.ReservationStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public class ReservationResponse {
    private UUID reservationId;
    private String roomId;
    private String roundId;
    private long amount;
    private ReservationStatus status;
    private String operationId;
    private OffsetDateTime expiresAt;
    private BalanceResponse balance;

    public UUID getReservationId() {
        return reservationId;
    }

    public void setReservationId(UUID reservationId) {
        this.reservationId = reservationId;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getRoundId() {
        return roundId;
    }

    public void setRoundId(String roundId) {
        this.roundId = roundId;
    }

    public long getAmount() {
        return amount;
    }

    public void setAmount(long amount) {
        this.amount = amount;
    }

    public ReservationStatus getStatus() {
        return status;
    }

    public void setStatus(ReservationStatus status) {
        this.status = status;
    }

    public String getOperationId() {
        return operationId;
    }

    public void setOperationId(String operationId) {
        this.operationId = operationId;
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
