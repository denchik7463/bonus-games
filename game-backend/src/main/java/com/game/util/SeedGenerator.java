package com.game.util;

import java.security.SecureRandom;

public final class SeedGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();

    private SeedGenerator() {
    }

    public static long nextSeed() {
        return RANDOM.nextLong();
    }
}
