package com.game.scheduler;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class RoomScheduler {

    @Scheduled(fixedDelay = 60000)
    public void run() {
    }
}
