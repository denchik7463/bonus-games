package com.game.service.random;

import java.time.OffsetDateTime;
import java.util.List;

public class RandomNumberResponse {
    private List<Integer> values;
    private String hash;
    private long seed;
    private int min;
    private int max;
    private int count;
    private OffsetDateTime generatedAt;

    public int getValue() {
        if (values == null || values.isEmpty()) {
            throw new IllegalStateException("Random response does not contain values");
        }
        return values.get(0);
    }

    public void setValue(int value) {
        this.values = List.of(value);
    }

    public List<Integer> getValues() {
        return values;
    }

    public void setValues(List<Integer> values) {
        this.values = values;
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

    public long getSeed() {
        return seed;
    }

    public void setSeed(long seed) {
        this.seed = seed;
    }

    public int getMin() {
        return min;
    }

    public void setMin(int min) {
        this.min = min;
    }

    public int getMax() {
        return max;
    }

    public void setMax(int max) {
        this.max = max;
    }

    public int getCount() {
        return count;
    }

    public void setCount(int count) {
        this.count = count;
    }

    public OffsetDateTime getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(OffsetDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }
}
