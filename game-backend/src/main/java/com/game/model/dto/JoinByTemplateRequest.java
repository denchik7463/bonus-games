package com.game.model.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class JoinByTemplateRequest {

    @NotNull
    private UUID templateId;
}
