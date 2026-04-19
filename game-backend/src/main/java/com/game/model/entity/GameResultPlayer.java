package com.game.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "game_result_players")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameResultPlayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "game_result_id", nullable = false)
    private GameResult gameResult;

    @Column(name = "position_index", nullable = false)
    private Integer positionIndex;

    @Column(name = "player_external_id", nullable = false, length = 100)
    private String playerExternalId;

    @Column(name = "username", nullable = false, length = 100)
    private String username;

    @Column(name = "is_bot", nullable = false)
    private Boolean bot;

    @Column(name = "boost_used", nullable = false)
    private Boolean boostUsed;

    @Column(name = "final_weight", nullable = false)
    private Integer finalWeight;

    @Column(name = "balance_before")
    private Long balanceBefore;

    @Column(name = "balance_after")
    private Long balanceAfter;

    @Column(name = "balance_delta")
    private Long balanceDelta;

    @Column(name = "status", length = 50)
    private String status;

    @Column(name = "is_winner", nullable = false)
    private Boolean winner;
}