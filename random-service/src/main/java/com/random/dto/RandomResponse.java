package com.random.dto;

import java.time.Instant;

public class RandomResponse {
    private final int value;
    private final String hash;
    private final long seed;
    private final int min;
    private final int max;
    private final Instant generatedAt;

    public RandomResponse(int value, String hash, long seed, int min, int max, Instant generatedAt) {
        this.value = value;
        this.hash = hash;
        this.seed = seed;
        this.min = min;
        this.max = max;
        this.generatedAt = generatedAt;
    }

    public int getValue() {
        return value;
    }

    public String getHash() {
        return hash;
    }

    public long getSeed() {
        return seed;
    }

    public int getMin() {
        return min;
    }

    public int getMax() {
        return max;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }
}