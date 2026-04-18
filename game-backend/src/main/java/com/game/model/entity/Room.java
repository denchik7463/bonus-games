package com.game.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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

    @Column(name = "first_player_joined_at")
    private LocalDateTime firstPlayerJoinedAt;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RoomPlayer> players = new ArrayList<>();

    public void addPlayer(RoomPlayer player) {
        if (players == null) {
            players = new ArrayList<>();
        }
        players.add(player);
        player.setRoom(this);
    }

    public void startWaitingTimer() {
        if (firstPlayerJoinedAt == null) {
            firstPlayerJoinedAt = LocalDateTime.now();
        }
    }

    public boolean hasTimedOut() {
        if (firstPlayerJoinedAt == null) {
            return false;
        }
        return false;
    }
}