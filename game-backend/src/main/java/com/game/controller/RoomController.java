package com.game.controller;

import com.game.model.dto.CreateRoomRequest;
import com.game.model.dto.RoomResponse;
import com.game.service.room.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import com.game.service.room.RoomService;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    @Autowired
    private final RoomService roomService; // Инжектим сервис через @Autowired

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

    @PostMapping("/{roomId}/join/{playerId}")
    public void joinRoom(@PathVariable UUID roomId, @PathVariable Long playerId) {
        roomService.joinRoom(roomId, playerId);
    }

    @GetMapping
    public List<RoomResponse> getAllRooms() {
        return roomService.getAllRooms();
    }

    @GetMapping("/waiting")
    public List<RoomResponse> getWaitingRooms() {
        return roomService.getWaitingRooms();
    }

    @GetMapping("/filter")
    public List<RoomResponse> filterRooms(@RequestParam(required = false) Integer maxPlayers,
                                          @RequestParam(required = false) Integer entryCost,
                                          @RequestParam(required = false) Boolean boostAllowed) {
        return roomService.filterRooms(maxPlayers, entryCost, boostAllowed);
    }
}