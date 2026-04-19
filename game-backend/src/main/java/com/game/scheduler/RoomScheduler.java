package com.game.scheduler;

import com.game.service.room.RoomLifecycleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RoomScheduler {

    private final RoomLifecycleService roomLifecycleService;

    @Scheduled(fixedDelay = 5000)
    public void run() {
        int processed = roomLifecycleService.handleTimeouts();
        if (processed > 0) {
            log.info("RoomScheduler processed {} timed-out waiting room(s)", processed);
        }
    }
}
