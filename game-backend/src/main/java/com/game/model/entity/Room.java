package com.game.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room {

    @Id
    private UUID id;

    @Column(name = "max_players", nullable = false)
    private Integer maxPlayers;

    @Column(name = "entry_cost", nullable = false)
    private Integer entryCost;

    @Column(name = "prize_fund", nullable = false)
    private Integer prizeFund;

    @Column(name = "boost_allowed", nullable = false)
    private Boolean boostAllowed;

    @Column(name = "timer_seconds", nullable = false)
    private Integer timerSeconds;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "current_players", nullable = false)
    private Integer currentPlayers;

    @Column(name = "bot_count", nullable = false)
    private Integer botCount;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}