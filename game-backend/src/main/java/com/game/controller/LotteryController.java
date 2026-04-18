package com.game.controller;

import com.game.service.lottery.LotteryService;
import com.game.service.lottery.LotteryReportService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/config")
@CrossOrigin
public class LotteryController {

    private final LotteryService lotteryService;
    private final LotteryReportService lotteryReportService;

    public LotteryController(LotteryService lotteryService, LotteryReportService lotteryReportService) {
        this.lotteryService = lotteryService;
        this.lotteryReportService = lotteryReportService;
    }

    @PostMapping("/test")
    public Map<String, Object> run(@RequestBody Map<String, Object> body) {
        return lotteryService.run(body);
    }

    @GetMapping("/report")
    public void report(
            @RequestParam(defaultValue = "100") double baseWeight,
            @RequestParam(defaultValue = "10") double boostBonus,
            @RequestParam(defaultValue = "50") double boostCost,
            @RequestParam(defaultValue = "1000") double entryCost,
            @RequestParam(defaultValue = "80") double winnerPercent,
            @RequestParam(defaultValue = "10000") int simRounds,
            @RequestParam(defaultValue = "Player1,Player2,Player3") String players,
            @RequestParam(defaultValue = "") String boosted,
            HttpServletResponse response
    ) throws IOException {
        Set<String> boostedSet = new HashSet<>(Arrays.stream(boosted.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet()));

        List<Map<String, Object>> playerList = Arrays.stream(players.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(name -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("name", name);
                    item.put("boost", boostedSet.contains(name));
                    return item;
                })
                .collect(Collectors.toList());

        Map<String, Object> body = new HashMap<>();
        body.put("players", playerList);
        body.put("baseWeight", baseWeight);
        body.put("boostBonus", boostBonus);
        body.put("boostCost", boostCost);
        body.put("entryCost", entryCost);
        body.put("winnerPercent", winnerPercent);
        body.put("simRounds", simRounds);

        Map<String, Object> result = lotteryService.run(body);
        byte[] pdf = lotteryReportService.generate(
                result,
                baseWeight,
                boostBonus,
                boostCost,
                entryCost,
                winnerPercent,
                simRounds,
                players,
                boosted
        );

        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "attachment; filename=\"lottery-report.pdf\"");
        response.getOutputStream().write(pdf);
    }
}
