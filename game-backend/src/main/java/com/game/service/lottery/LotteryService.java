package com.game.service.lottery;

import com.game.service.random.RandomClient;
import com.game.service.random.RandomNumberResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class LotteryService {

    private final RandomClient randomClient;

    public LotteryService(RandomClient randomClient) {
        this.randomClient = randomClient;
    }

    public Map<String, Object> run(Map<String, Object> body) {
        List<Map<String, Object>> playersIn = castPlayers(body.get("players"));

        List<Player> players = new ArrayList<>();
        for (Map<String, Object> p : playersIn) {
            players.add(new Player(
                    String.valueOf(p.getOrDefault("name", "Igrok")),
                    Boolean.TRUE.equals(p.get("boost"))
            ));
        }

        Config cfg = new Config();
        cfg.baseWeight = toDouble(body.get("baseWeight"), 100);
        cfg.boostBonus = toDouble(body.get("boostBonus"), 10);
        cfg.boostCost = toDouble(body.get("boostCost"), 0);
        cfg.entryCost = toDouble(body.get("entryCost"), 1000);
        cfg.simRounds = toInt(body.get("simRounds"), 10000);
        cfg.winnerPercent = clamp(toDouble(body.get("winnerPercent"), 80), 0, 100);

        return runEngine(players, cfg);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> castPlayers(Object raw) {
        if (raw instanceof List<?>) {
            return (List<Map<String, Object>>) raw;
        }
        return Collections.emptyList();
    }

    private Map<String, Object> runEngine(List<Player> players, Config cfg) {
        String[] names = players.stream().map(p -> p.name).toArray(String[]::new);
        double[] weights = computeWeights(players, cfg);
        double[] probs = computeProbs(weights);
        int playerCount = players.size();

        double totalEntry = cfg.entryCost * playerCount;
        double prizePool = totalEntry * (cfg.winnerPercent / 100.0);
        double houseProfit = totalEntry - prizePool;
        double houseMargin = totalEntry > 0 ? houseProfit / totalEntry : 0;

        double[] playerRoi = new double[playerCount];
        int unprofitable = 0;
        double sumRoi = 0;
        double minRoi = Double.POSITIVE_INFINITY;

        for (int i = 0; i < playerCount; i++) {
            double cost = cfg.entryCost + (players.get(i).boost ? cfg.boostCost : 0);
            double prize = probs[i] * prizePool;
            playerRoi[i] = cost > 0 ? prize / cost : 0;
            sumRoi += playerRoi[i];
            minRoi = Math.min(minRoi, playerRoi[i]);
            if (prize - cost < 0) {
                unprofitable++;
            }
        }

        double avgRoi = playerCount > 0 ? sumRoi / playerCount : 0;
        double minPlayerRoi = playerCount > 0 ? minRoi : 0;
        double unprofitShare = playerCount > 0 ? (double) unprofitable / playerCount : 0;
        double boostImpact = computeBoostImpactShare(players, probs);
        double boostEfficiency = computeBoostEfficiencyVsCosts(players, probs, cfg, prizePool);

        List<Warning> warnings = buildWarnings(players, cfg, houseProfit, houseMargin, avgRoi, boostImpact, boostEfficiency);
        boolean blocked = warnings.stream().anyMatch(w -> w.level == WarnLevel.ERROR);

        SimulationResult simulationResult = blocked
                ? SimulationResult.empty()
                : simulate(names, weights, cfg.simRounds);

        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("totalEntry", round2(totalEntry));
        metrics.put("prizePool", round2(prizePool));
        metrics.put("houseProfit", round2(houseProfit));
        metrics.put("houseMargin", round4(houseMargin));
        metrics.put("averagePlayerROI", round4(avgRoi));
        metrics.put("minPlayerROI", round4(minPlayerRoi));
        metrics.put("unprofitableShare", round4(unprofitShare));
        metrics.put("boostImpactShare", round4(boostImpact));
        metrics.put("boostEfficiencyVsCosts", round4(boostEfficiency));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("names", names);
        result.put("weights", weights);
        result.put("probs", probs);
        result.put("wins", simulationResult.wins);
        result.put("metrics", metrics);
        result.put("blocked", blocked);
        result.put("warnings", warningsToList(warnings));
        result.put("randomProof", simulationResult.randomProof);
        return result;
    }

    private List<Warning> buildWarnings(
            List<Player> players,
            Config cfg,
            double houseProfit,
            double houseMargin,
            double avgRoi,
            double boostImpact,
            double boostEfficiency
    ) {
        List<Warning> warnings = new ArrayList<>();
        int playerCount = players.size();

        if (playerCount < 2) {
            warnings.add(new Warning(WarnLevel.ERROR, "NOT_ENOUGH_PLAYERS", "Недостаточно игроков", "Для запуска нужно минимум 2 игрока."));
        }
        if (cfg.baseWeight <= 0) {
            warnings.add(new Warning(WarnLevel.ERROR, "ZERO_BASE_WEIGHT", "Нулевой базовый вес", "Базовый вес должен быть больше 0."));
        }
        if (cfg.entryCost < 1000 || cfg.entryCost > 10000) {
            warnings.add(new Warning(WarnLevel.ERROR, "ENTRY_COST_OUT_OF_RANGE", "Цена входа вне диапазона", "Нормальный диапазон 1000-10000."));
        }
        if (cfg.boostCost <= 0) {
            warnings.add(new Warning(WarnLevel.ERROR, "BOOST_COST_NON_POSITIVE", "Некорректная цена буста", "Цена буста должна быть больше 0."));
        }
        if (cfg.boostCost >= cfg.entryCost) {
            warnings.add(new Warning(WarnLevel.ERROR, "BOOST_TOO_EXPENSIVE", "Слишком дорогой буст", "Цена буста должна быть ниже цены входа."));
        }
        if (cfg.winnerPercent < 50 || cfg.winnerPercent > 95) {
            warnings.add(new Warning(WarnLevel.ERROR, "WINNER_PERCENT_BLOCKED", "Критическое значение выплаты победителю", "Допустимый диапазон 50%-95%."));
        } else if (Math.abs(cfg.winnerPercent - 80.0) > 0.0001) {
            warnings.add(new Warning(WarnLevel.WARNING, "WINNER_PERCENT_NOT_RECOMMENDED", "Нерекомендуемая выплата победителю", "Рекомендовано 80%."));
        }
        if (houseProfit < 0) {
            warnings.add(new Warning(WarnLevel.ERROR, "HOUSE_PROFIT_NEGATIVE", "Отрицательная прибыль организатора", "Комната убыточна для организатора."));
        }
        if (avgRoi < 0.75) {
            warnings.add(new Warning(WarnLevel.WARNING, "AVG_ROI_CRITICAL", "Критически низкая привлекательность", "Средний ROI ниже порога 0.75."));
        }
        if (boostImpact > 0.10) {
            warnings.add(new Warning(WarnLevel.ERROR, "BOOST_IMPACT_HIGH", "Сильное влияние буста", "Буст дает слишком большой перекос (>10%)."));
        }
        if (cfg.boostCost > 0 && boostEfficiency < 0.05) {
            warnings.add(new Warning(WarnLevel.WARNING, "BOOST_VALUE_LOW", "Буст не оправдывает цену", "Эффективность буста ниже 5%."));
        }
        if (cfg.boostCost > 0 && boostEfficiency > 0.10) {
            warnings.add(new Warning(WarnLevel.WARNING, "BOOST_UNFAIR_ADVANTAGE", "Слишком высокая эффективность буста", "Эффективность буста выше 10%."));
        }
        if (houseMargin > 0.35) {
            warnings.add(new Warning(WarnLevel.WARNING, "HOUSE_MARGIN_TOO_HIGH", "Слишком высокая доля организатора", "Доля организатора выше 35%."));
        }

        return warnings;
    }

    private List<Map<String, Object>> warningsToList(List<Warning> warnings) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Warning warning : warnings) {
            result.add(warning.toMap());
        }
        return result;
    }

    private double[] computeWeights(List<Player> players, Config cfg) {
        double[] weights = new double[players.size()];
        for (int i = 0; i < players.size(); i++) {
            weights[i] = cfg.baseWeight + (players.get(i).boost ? cfg.boostBonus : 0);
        }
        return weights;
    }

    private double[] computeProbs(double[] weights) {
        double sum = 0;
        for (double weight : weights) {
            sum += weight;
        }
        double[] probs = new double[weights.length];
        for (int i = 0; i < weights.length; i++) {
            probs[i] = sum > 0 ? weights[i] / sum : 0;
        }
        return probs;
    }

    private double computeBoostImpactShare(List<Player> players, double[] probs) {
        if (players.isEmpty()) {
            return 0;
        }
        double sumLift = 0;
        int boostedCount = 0;
        double plain = 1.0 / players.size();
        for (int i = 0; i < players.size(); i++) {
            if (players.get(i).boost) {
                sumLift += Math.max(0, probs[i] - plain);
                boostedCount++;
            }
        }
        return boostedCount == 0 ? 0 : sumLift / boostedCount;
    }

    private double computeBoostEfficiencyVsCosts(List<Player> players, double[] probs, Config cfg, double prizePool) {
        if (players.isEmpty() || cfg.boostCost <= 0) {
            return 0;
        }
        double plain = 1.0 / players.size();
        double sumLift = 0;
        int boostedCount = 0;
        for (int i = 0; i < players.size(); i++) {
            if (players.get(i).boost) {
                sumLift += Math.max(0, probs[i] - plain);
                boostedCount++;
            }
        }
        if (boostedCount == 0) {
            return 0;
        }
        double totalCost = cfg.entryCost + cfg.boostCost;
        return totalCost <= 0 ? 0 : (sumLift / boostedCount) * prizePool / totalCost;
    }

    private SimulationResult simulate(String[] names, double[] weights, int rounds) {
        int[] intWeights = new int[weights.length];
        int total = 0;
        for (int i = 0; i < weights.length; i++) {
            intWeights[i] = Math.max(1, (int) Math.round(weights[i]));
            total += intWeights[i];
        }
        if (total <= 0) {
            return SimulationResult.empty();
        }

        Map<String, Integer> wins = new LinkedHashMap<>();
        for (String name : names) {
            wins.put(name, 0);
        }

        Map<String, Object> randomProof = new LinkedHashMap<>();
        RandomNumberResponse randomBatch = randomClient.generate(1, total, rounds);
        List<Integer> rolls = randomBatch.getValues();
        if (rolls == null || rolls.size() != rounds) {
            throw new IllegalStateException("Random service returned invalid values count: expected=" + rounds
                    + ", actual=" + (rolls == null ? 0 : rolls.size()));
        }

        for (int roll : rolls) {
            int cumulative = 0;
            for (int j = 0; j < intWeights.length; j++) {
                cumulative += intWeights[j];
                if (roll <= cumulative) {
                    wins.put(names[j], wins.get(names[j]) + 1);
                    break;
                }
            }
        }

        if (randomBatch != null) {
            randomProof.put("lastHash", randomBatch.getHash());
            randomProof.put("lastSeed", randomBatch.getSeed());
            randomProof.put("lastGeneratedAt", randomBatch.getGeneratedAt());
            randomProof.put("replayUrl", "/api/random/replay/" + randomBatch.getHash());
        }

        return new SimulationResult(wins, randomProof);
    }

    private double toDouble(Object value, double defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }

    private int toInt(Object value, int defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private double round4(double value) {
        if (Double.isNaN(value)) {
            return 0;
        }
        return Math.round(value * 10000.0) / 10000.0;
    }

    private double round2(double value) {
        if (Double.isNaN(value)) {
            return 0;
        }
        return Math.round(value * 100.0) / 100.0;
    }

    private static class Player {
        private final String name;
        private final boolean boost;

        private Player(String name, boolean boost) {
            this.name = name;
            this.boost = boost;
        }
    }

    private static class Config {
        private double baseWeight = 100;
        private double boostBonus = 10;
        private double boostCost = 0;
        private double entryCost = 1000;
        private double winnerPercent = 80;
        private int simRounds = 10000;
    }

    private enum WarnLevel {
        ERROR,
        WARNING
    }

    private static class Warning {
        private final WarnLevel level;
        private final String code;
        private final String title;
        private final String message;

        private Warning(WarnLevel level, String code, String title, String message) {
            this.level = level;
            this.code = code;
            this.title = title;
            this.message = message;
        }

        private Map<String, Object> toMap() {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("level", level.name().toLowerCase());
            map.put("code", code);
            map.put("title", title);
            map.put("message", message);
            return map;
        }
    }

    private static class SimulationResult {
        private final Map<String, Integer> wins;
        private final Map<String, Object> randomProof;

        private SimulationResult(Map<String, Integer> wins, Map<String, Object> randomProof) {
            this.wins = wins;
            this.randomProof = randomProof;
        }

        private static SimulationResult empty() {
            return new SimulationResult(Collections.emptyMap(), Collections.emptyMap());
        }
    }
}
