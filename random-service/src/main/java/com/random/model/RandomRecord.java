package com.random.model;

import java.time.Instant;

public class RandomRecord {
    private final long seed;
    private final int min;
    private final int max;
    private final int value;
    private final String hash;
    private final Instant generatedAt;

    public RandomRecord(long seed, int min, int max, int value, String hash, Instant generatedAt) {
        this.seed = seed;
        this.min = min;
        this.max = max;
        this.value = value;
        this.hash = hash;
        this.generatedAt = generatedAt;
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

    public int getValue() {
        return value;
    }

    public String getHash() {
        return hash;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }
}