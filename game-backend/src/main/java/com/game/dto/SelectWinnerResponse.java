package com.game.dto;

import java.time.OffsetDateTime;
import java.util.List;

public class SelectWinnerResponse {
    private String winner;
    private int winnerIndex;
    private int roll;
    private int totalWeight;
    private String randomHash;
    private long randomSeed;
    private OffsetDateTime generatedAt;
    private List<PlayerWeight> players;

    public String getWinner() {
        return winner;
    }

    public void setWinner(String winner) {
        this.winner = winner;
    }

    public int getWinnerIndex() {
        return winnerIndex;
    }

    public void setWinnerIndex(int winnerIndex) {
        this.winnerIndex = winnerIndex;
    }

    public int getRoll() {
        return roll;
    }

    public void setRoll(int roll) {
        this.roll = roll;
    }

    public int getTotalWeight() {
        return totalWeight;
    }

    public void setTotalWeight(int totalWeight) {
        this.totalWeight = totalWeight;
    }

    public String getRandomHash() {
        return randomHash;
    }

    public void setRandomHash(String randomHash) {
        this.randomHash = randomHash;
    }

    public long getRandomSeed() {
        return randomSeed;
    }

    public void setRandomSeed(long randomSeed) {
        this.randomSeed = randomSeed;
    }

    public OffsetDateTime getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(OffsetDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }

    public List<PlayerWeight> getPlayers() {
        return players;
    }

    public void setPlayers(List<PlayerWeight> players) {
        this.players = players;
    }

    public static class PlayerWeight {
        private String name;
        private boolean boost;
        private int weight;

        public PlayerWeight() {
        }

        public PlayerWeight(String name, boolean boost, int weight) {
            this.name = name;
            this.boost = boost;
            this.weight = weight;
        }

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

        public int getWeight() {
            return weight;
        }

        public void setWeight(int weight) {
            this.weight = weight;
        }
    }
}
