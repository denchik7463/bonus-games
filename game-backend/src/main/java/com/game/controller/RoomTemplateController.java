package com.game.controller;

import com.game.model.dto.RoomTemplateRequest;
import com.game.model.dto.RoomTemplateResponse;
import com.game.service.room.RoomConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/room-templates")
@RequiredArgsConstructor
public class RoomTemplateController {

    private final RoomConfigService roomConfigService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoomTemplateResponse createTemplate(@Valid @RequestBody RoomTemplateRequest request) {
        return roomConfigService.createTemplate(request);
    }

    @PutMapping("/{id}")
    public RoomTemplateResponse updateTemplate(@PathVariable UUID id,
                                               @Valid @RequestBody RoomTemplateRequest request) {
        return roomConfigService.updateTemplate(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTemplate(@PathVariable UUID id) {
        roomConfigService.deleteTemplate(id);
    }

    @GetMapping("/{id}")
    public RoomTemplateResponse getTemplateById(@PathVariable UUID id) {
        return roomConfigService.getTemplateById(id);
    }

    @GetMapping
    public List<RoomTemplateResponse> getAllTemplates() {
        return roomConfigService.getAllTemplates();
    }
}
