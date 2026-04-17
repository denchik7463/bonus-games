package com.game.controller;

import com.game.model.dto.CreateRoomRequest;
import com.game.model.dto.RoomResponse;
import com.game.service.room.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @PostMapping("/create")
    public RoomResponse createRoom(@RequestBody CreateRoomRequest request) {
        return roomService.createRoom(
                request.getMaxPlayers(),
                request.getEntryCost(),
                request.getBoostAllowed(),
                request.getTimerSeconds()
        );
    }

    @GetMapping("/{id}")
    public RoomResponse getRoomById(@PathVariable UUID id) {
        return roomService.getRoomById(id);
    }

    @GetMapping
    public List<RoomResponse> getAllRooms() {
        return roomService.getAllRooms();
    }

    @GetMapping("/waiting")
    public List<RoomResponse> getWaitingRooms() {
        return roomService.getWaitingRooms();
    }
}