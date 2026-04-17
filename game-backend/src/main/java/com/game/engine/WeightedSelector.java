package com.game.engine;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class WeightedSelector {

    public int selectIndex(List<Integer> weights, int roll) {
        int cumulative = 0;
        for (int i = 0; i < weights.size(); i++) {
            cumulative += weights.get(i);
            if (roll <= cumulative) {
                return i;
            }
        }
        return weights.size() - 1;
    }
}
