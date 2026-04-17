package com.game.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class SelectWinnerRequest {

    @Valid
    @NotEmpty
    private List<PlayerInput> players;

    private Integer baseWeight;
    private Integer boostBonus;

    public List<PlayerInput> getPlayers() {
        return players;
    }

    public void setPlayers(List<PlayerInput> players) {
        this.players = players;
    }

    public Integer getBaseWeight() {
        return baseWeight;
    }

    public void setBaseWeight(Integer baseWeight) {
        this.baseWeight = baseWeight;
    }

    public Integer getBoostBonus() {
        return boostBonus;
    }

    public void setBoostBonus(Integer boostBonus) {
        this.boostBonus = boostBonus;
    }

    public static class PlayerInput {
        @NotBlank
        private String name;

        private boolean boost;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public boolean isBoost() {
            return boost;
        }

        public void setBoost(boolean boost) {
            this.boost = boost;
        }
    }
}
