package com.random.dto;

import java.time.Instant;
import java.util.List;

public class RandomResponse {
    private final List<Integer> values;
    private final String hash;
    private final long seed;
    private final int min;
    private final int max;
    private final int count;
    private final Instant generatedAt;

    public RandomResponse(List<Integer> values, String hash, long seed, int min, int max, int count, Instant generatedAt) {
        this.values = values;
        this.hash = hash;
        this.seed = seed;
        this.min = min;
        this.max = max;
        this.count = count;
        this.generatedAt = generatedAt;
    }

    public List<Integer> getValues() {
        return values;
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

    public int getCount() {
        return count;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }
}
