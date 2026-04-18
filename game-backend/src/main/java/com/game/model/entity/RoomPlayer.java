package com.game.model.entity;

import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

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

    private Long playerId;
    private LocalDateTime joinTime;
    private String status;
}