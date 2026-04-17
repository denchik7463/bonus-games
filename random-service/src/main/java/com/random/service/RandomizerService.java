package com.random.service;

import com.random.model.RandomResult;
import com.random.model.dto.RandomRequest;
import com.random.model.dto.RandomResponse;
import org.springframework.stereotype.Service;

import java.util.concurrent.ThreadLocalRandom;

@Service
public class RandomizerService {

    public RandomResponse randomize(RandomRequest request) {
        int min = request.getMin();
        int max = request.getMax();
        int value = ThreadLocalRandom.current().nextInt(min, max + 1);
        RandomResult result = new RandomResult(value, min, max);
        return new RandomResponse(result);
    }
}
