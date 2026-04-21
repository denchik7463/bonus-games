package com.game.config;

import com.game.realtime.WebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final WebSocketHandler webSocketHandler;

    public WebSocketConfig(WebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(webSocketHandler, "/ws/rooms")
                .setAllowedOrigins(
                        "http://localhost:63342",
                        "http://127.0.0.1:63342",
                        "http://localhost:3100",
                        "http://127.0.0.1:3100",
                        "http://localhost:8081",
                        "http://127.0.0.1:8081"
                );
    }
}
