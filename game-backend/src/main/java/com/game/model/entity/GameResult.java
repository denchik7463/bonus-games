package com.game.model.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "game_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameResult {

    @Id
    private UUID id;

    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    @Column(name = "max_players", nullable = false)
    private Integer maxPlayers;

    @Column(name = "entry_cost", nullable = false)
    private Integer entryCost;

    @Column(name = "prize_fund", nullable = false)
    private Integer prizeFund;

    @Column(name = "boost_allowed", nullable = false)
    private Boolean boostAllowed;

    @Column(name = "bot_count", nullable = false)
    private Integer botCount;

    @Column(name = "room_status", nullable = false, length = 50)
    private String roomStatus;

    @Column(name = "winner_player_external_id", nullable = false, length = 100)
    private String winnerPlayerExternalId;

    @Column(name = "winner_player_name", nullable = false, length = 100)
    private String winnerPlayerName;

    @Column(name = "winner_position_index", nullable = false)
    private Integer winnerPositionIndex;

    @Column(name = "base_weight")
    private Integer baseWeight;

    @Column(name = "boost_bonus")
    private Integer boostBonus;

    @Column(name = "total_weight")
    private Integer totalWeight;

    @Column(name = "roll")
    private Integer roll;

    @Column(name = "random_hash", length = 255)
    private String randomHash;

    @Column(name = "random_seed", length = 255)
    private String randomSeed;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @OneToMany(mappedBy = "gameResult", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("positionIndex ASC")
    @Builder.Default
    private List<GameResultPlayer> participants = new ArrayList<>();

    public void addParticipant(GameResultPlayer participant) {
        if (participants == null) {
            participants = new ArrayList<>();
        }
        participants.add(participant);
        participant.setGameResult(this);
    }
}