package com.game.service.random;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class RandomClient {

    private final RestClient restClient;

    public RandomClient(@Qualifier("randomRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    public RandomNumberResponse generate(int min, int max) {
        return generate(min, max, 1);
    }

    public RandomNumberResponse generate(int min, int max, int count) {
        RandomNumberResponse response = restClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/random/generate")
                        .queryParam("min", min)
                        .queryParam("max", max)
                        .queryParam("count", count)
                        .build())
                .retrieve()
                .body(RandomNumberResponse.class);

        if (response == null) {
            throw new IllegalStateException("Random service returned empty response");
        }
        return response;
    }

    public RandomNumberResponse replay(String hash) {
        RandomNumberResponse response = restClient.get()
                .uri("/api/random/replay/{hash}", hash)
                .retrieve()
                .body(RandomNumberResponse.class);

        if (response == null) {
            throw new IllegalStateException("Random service returned empty replay response");
        }
        return response;
    }
}
