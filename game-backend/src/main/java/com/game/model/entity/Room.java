package com.game.model.entity;

import lombok.*;
import jakarta.persistence.*;
import java.util.List;

import java.util.UUID;
import java.time.LocalDateTime;


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

    // Связь с игроками
    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL)
    private List<RoomPlayer> players;

    public void addPlayer(RoomPlayer player) {
        if (currentPlayers < maxPlayers) {
            players.add(player);
            currentPlayers++;
        } else {
            throw new RuntimeException("Room is full");
        }
    }
}