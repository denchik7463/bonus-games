package com.random.crypto;

import org.springframework.stereotype.Component;

@Component
public class ProvablyFairRandomizer {

    public int generate(int min, int max) {
        return min + (int) (Math.random() * ((max - min) + 1));
    }
}
