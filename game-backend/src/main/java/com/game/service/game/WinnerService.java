package com.game.service.game;

import com.game.dto.SelectWinnerRequest;
import com.game.dto.SelectWinnerResponse;
import com.game.engine.WeightedSelector;
import com.game.service.random.RandomClient;
import com.game.service.random.RandomNumberResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class WinnerService {

    private static final int DEFAULT_BASE_WEIGHT = 100;
    private static final int DEFAULT_BOOST_BONUS = 10;

    private final WeightedSelector weightedSelector;
    private final RandomClient randomClient;

    public WinnerService(WeightedSelector weightedSelector, RandomClient randomClient) {
        this.weightedSelector = weightedSelector;
        this.randomClient = randomClient;
    }

    public SelectWinnerResponse selectWinner(SelectWinnerRequest request) {
        int baseWeight = request.getBaseWeight() == null ? DEFAULT_BASE_WEIGHT : request.getBaseWeight();
        int boostBonus = request.getBoostBonus() == null ? DEFAULT_BOOST_BONUS : request.getBoostBonus();

        if (baseWeight <= 0) {
            throw new IllegalArgumentException("baseWeight must be > 0");
        }

        List<Integer> weights = new ArrayList<>();
        List<SelectWinnerResponse.PlayerWeight> players = new ArrayList<>();
        int totalWeight = 0;

        for (SelectWinnerRequest.PlayerInput player : request.getPlayers()) {
            int weight = baseWeight + (player.isBoost() ? boostBonus : 0);
            if (weight <= 0) {
                throw new IllegalArgumentException("Each player weight must be > 0");
            }
            weights.add(weight);
            players.add(new SelectWinnerResponse.PlayerWeight(player.getName(), player.isBoost(), weight));
            totalWeight += weight;
        }

        RandomNumberResponse random = randomClient.generate(1, totalWeight);
        int winnerIndex = weightedSelector.selectIndex(weights, random.getValue());

        SelectWinnerResponse response = new SelectWinnerResponse();
        response.setWinner(request.getPlayers().get(winnerIndex).getName());
        response.setWinnerIndex(winnerIndex);
        response.setRoll(random.getValue());
        response.setTotalWeight(totalWeight);
        response.setRandomHash(random.getHash());
        response.setRandomSeed(random.getSeed());
        response.setGeneratedAt(random.getGeneratedAt());
        response.setPlayers(players);
        return response;
    }
}
