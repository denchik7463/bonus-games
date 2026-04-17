package com.random.controller;

import com.random.model.dto.RandomRequest;
import com.random.model.dto.RandomResponse;
import com.random.service.RandomizerService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/random")
public class RandomController {

    private final RandomizerService randomizerService;

    public RandomController(RandomizerService randomizerService) {
        this.randomizerService = randomizerService;
    }

    @PostMapping
    public RandomResponse randomize(@RequestBody RandomRequest request) {
        return randomizerService.randomize(request);
    }
}
