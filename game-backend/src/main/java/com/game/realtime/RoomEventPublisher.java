package com.game.realtime;

import com.game.model.dto.RoomStateResponse;
import com.game.model.dto.RoundEventResponse;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class RoomEventPublisher {

    private final WebSocketHandler webSocketHandler;

    public RoomEventPublisher(WebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
    }

    public void publishRoomState(RoomStateResponse roomState) {
        if (roomState == null || roomState.getRoomId() == null) {
            return;
        }
        webSocketHandler.sendRoomState(roomState.getRoomId(), roomState);
    }

    public void publishRoomEvents(UUID roomId, List<RoundEventResponse> events) {
        if (roomId == null) {
            return;
        }
        webSocketHandler.sendRoomEvents(roomId, events);
    }
}
