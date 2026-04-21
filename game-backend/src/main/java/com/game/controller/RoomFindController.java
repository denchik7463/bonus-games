package com.game.controller;

import com.game.model.dto.JoinByTemplateRequest;
import com.game.model.dto.RoomResponse;
import com.game.model.enums.UserRole;
import com.game.security.RoleGuard;
import com.game.service.room.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/room")
@RequiredArgsConstructor
public class RoomFindController {

    private final RoomService roomService;

    @PostMapping("/find")
    public RoomResponse findRoom(@Valid @RequestBody JoinByTemplateRequest request) {
        RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        return roomService.joinByTemplate(request);
    }
}
