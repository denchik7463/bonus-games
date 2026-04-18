package com.game.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "room_templates",
        uniqueConstraints = @UniqueConstraint(columnNames = "template_name")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomConfig {

    @Id
    private UUID id;

    @Column(name = "template_name", nullable = false, length = 100)
    private String templateName;

    @Column(name = "active", nullable = false)
    private Boolean active;

    @Column(name = "entry_cost", nullable = false)
    private Integer entryCost;

    @Column(name = "bonus_enabled", nullable = false)
    private Boolean bonusEnabled;

    @Column(name = "bonus_price", nullable = false)
    private Integer bonusPrice;

    @Column(name = "bonus_weight", nullable = false)
    private Integer bonusWeight;

    @Column(name = "max_players", nullable = false)
    private Integer maxPlayers;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
