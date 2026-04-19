package com.game.model.dto;

import lombok.Getter;
import lombok.Setter;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

@Getter
@Setter
public class CreateRoomRequest {

    @NotNull
    private UUID templateId;
}
