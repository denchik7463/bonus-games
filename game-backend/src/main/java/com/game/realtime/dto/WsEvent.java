package com.game.realtime.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WsEvent {
    private EventType type;
    private UUID roomId;
    private Object payload;
    private OffsetDateTime sentAt;
}
