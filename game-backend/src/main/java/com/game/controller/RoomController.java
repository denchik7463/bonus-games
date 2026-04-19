package com.game.controller;

import com.game.model.dto.CreateRoomRequest;
import com.game.model.dto.FinishRoomRequest;
import com.game.model.dto.FinishRoomResponse;
import com.game.model.dto.JoinRoomRequest;
import com.game.model.dto.JoinRoomResponse;
import com.game.model.dto.RoomResponse;
import com.game.model.dto.RoomStateResponse;
import com.game.model.dto.RoundEventResponse;
import com.game.model.entity.User;
import com.game.model.enums.UserRole;
import com.game.security.RoleGuard;
import com.game.security.UserContext;
import com.game.service.game.RoundEventLogService;
import com.game.service.room.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;
    private final RoundEventLogService roundEventLogService;

    @PostMapping("/create")
    @ResponseStatus(HttpStatus.CREATED)
    public RoomResponse createRoom(@Valid @RequestBody CreateRoomRequest request) {
        RoleGuard.requireAny(UserRole.EXPERT, UserRole.ADMIN);
        return roomService.createRoom(request);
    }

    @GetMapping("/{id}")
    public RoomResponse getRoomById(@PathVariable UUID id) {
        RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        return roomService.getRoomById(id);
    }

    @GetMapping("/{roomId}/state")
    public RoomStateResponse roomState(@PathVariable UUID roomId) {
        RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        return roomService.getRoomState(roomId);
    }

    @GetMapping("/{roomId}/events")
    public List<RoundEventResponse> roomEvents(@PathVariable UUID roomId) {
        RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        return roundEventLogService.getByRoomId(roomId);
    }

    @PostMapping("/{roomId}/join")
    public JoinRoomResponse joinRoom(@PathVariable UUID roomId, @RequestBody(required = false) JoinRoomRequest request) {
        RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        User user = UserContext.getRequired();
        return roomService.joinRoom(roomId, user, request);
    }

    @PostMapping("/{roomId}/finish")
    public FinishRoomResponse finishRoom(@PathVariable UUID roomId,
                                         @RequestBody(required = false) FinishRoomRequest request) {
        RoleGuard.requireAny(UserRole.EXPERT, UserRole.ADMIN);
        return roomService.finishRoom(roomId, request);
    }

    @PostMapping("/{roomId}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelRoom(@PathVariable UUID roomId,
                           @RequestParam(required = false) String reason) {
        RoleGuard.requireAny(UserRole.EXPERT, UserRole.ADMIN);
        roomService.cancelRoom(roomId, reason == null ? "Cancelled by operator" : reason);
    }

    @GetMapping
    public List<RoomResponse> getAllRooms() {
        RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        return roomService.getAllRooms();
    }

    @GetMapping("/waiting")
    public List<RoomResponse> getWaitingRooms() {
        RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        return roomService.getWaitingRooms();
    }

    @GetMapping("/filter")
    public List<RoomResponse> filterRooms(@RequestParam(required = false) Integer maxPlayers,
                                          @RequestParam(required = false) Integer entryCost,
                                          @RequestParam(required = false) Boolean boostAllowed) {
        RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        return roomService.filterRooms(maxPlayers, entryCost, boostAllowed);
    }
}
