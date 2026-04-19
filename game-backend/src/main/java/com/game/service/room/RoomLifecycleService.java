package com.game.service.room;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RoomLifecycleService {

    private final RoomService roomService;

    public int handleTimeouts() {
        return roomService.cancelTimedOutWaitingRooms();
    }
}
