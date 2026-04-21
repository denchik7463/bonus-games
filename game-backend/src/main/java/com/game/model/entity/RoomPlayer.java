package com.game.model.entity;

import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "room_players")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomPlayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "username", nullable = false, length = 100)
    private String username;

    @Column(name = "wallet_reservation_id", nullable = false)
    private UUID walletReservationId;

    @Column(name = "boost_used", nullable = false)
    private Boolean boostUsed;

    @Column(name = "boost_reservation_id")
    private UUID boostReservationId;

    @Column(name = "is_bot", nullable = false)
    private Boolean bot;

    @Column(name = "round_id", nullable = false, length = 128)
    private String roundId;

    @Column(name = "player_order", nullable = false)
    private Integer playerOrder;

    @Column(name = "is_winner", nullable = false)
    private Boolean winner;

    private LocalDateTime joinTime;

    private String status;
}
