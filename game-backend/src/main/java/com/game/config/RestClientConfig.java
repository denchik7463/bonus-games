package com.game.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Bean
    public RestClient randomRestClient(
            RestClient.Builder builder,
            @Value("${app.random-service.base-url:http://localhost:9095}") String baseUrl
    ) {
        return builder
                .baseUrl(baseUrl)
                .build();
    }
}
