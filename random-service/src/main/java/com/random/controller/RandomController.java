package com.random.controller;

import com.random.dto.RandomResponse;
import com.random.service.RandomNumberService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/random")
public class RandomController {

    private final RandomNumberService randomNumberService;

    public RandomController(RandomNumberService randomNumberService) {
        this.randomNumberService = randomNumberService;
    }

    @PostMapping("/generate")
    public RandomResponse generate(@RequestParam int min, @RequestParam int max) {
        return randomNumberService.generate(min, max);
    }

    @GetMapping("/replay/{hash}")
    public RandomResponse replay(@PathVariable String hash) {
        return randomNumberService.replay(hash);
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleIllegalArgument(IllegalArgumentException e) {
        return Map.of("error", e.getMessage());
    }
}