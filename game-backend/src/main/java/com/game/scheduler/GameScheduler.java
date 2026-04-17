package com.game.scheduler;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class GameScheduler {

    @Scheduled(fixedDelay = 60000)
    public void run() {
    }
}
