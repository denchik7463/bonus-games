package com.random.model;

import java.time.Instant;
import java.util.List;

public class RandomRecord {
    private final long seed;
    private final int min;
    private final int max;
    private final int count;
    private final List<Integer> values;
    private final String hash;
    private final Instant generatedAt;

    public RandomRecord(long seed, int min, int max, int count, List<Integer> values, String hash, Instant generatedAt) {
        this.seed = seed;
        this.min = min;
        this.max = max;
        this.count = count;
        this.values = values;
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

    public int getCount() {
        return count;
    }

    public List<Integer> getValues() {
        return values;
    }

    public String getHash() {
        return hash;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }
}
