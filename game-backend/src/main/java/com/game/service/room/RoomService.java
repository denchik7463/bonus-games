package com.game.service.room;

import com.game.model.dto.RoomResponse;
import com.game.model.entity.Room;
import com.game.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.game.model.entity.RoomPlayer;
import com.game.repository.RoomPlayerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomService {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private RoomPlayerRepository roomPlayerRepository;

    public RoomResponse createRoom(Integer maxPlayers,
                                   Integer entryCost,
                                   Boolean boostAllowed,
                                   Integer timerSeconds) {

        Room room = Room.builder()
                .id(UUID.randomUUID())
                .maxPlayers(maxPlayers)
                .entryCost(entryCost)
                .prizeFund(0)
                .boostAllowed(boostAllowed)
                .timerSeconds(timerSeconds)
                .status("WAITING")
                .currentPlayers(0)
                .botCount(0)
                .createdAt(LocalDateTime.now())
                .build();

        Room saved = roomRepository.save(room);

        return RoomResponse.builder()
                .id(room.getId())
                .maxPlayers(room.getMaxPlayers())
                .entryCost(room.getEntryCost())
                .prizeFund(room.getPrizeFund())
                .boostAllowed(room.getBoostAllowed())
                .timerSeconds(room.getTimerSeconds())
                .status(room.getStatus())
                .currentPlayers(room.getCurrentPlayers())
                .botCount(room.getBotCount())
                .createdAt(room.getCreatedAt())
                .build();
    }

    public RoomResponse getRoomById(UUID id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Room not found: " + id));

        return RoomResponse.builder()
                .id(room.getId())
                .maxPlayers(room.getMaxPlayers())
                .entryCost(room.getEntryCost())
                .prizeFund(room.getPrizeFund())
                .boostAllowed(room.getBoostAllowed())
                .timerSeconds(room.getTimerSeconds())
                .status(room.getStatus())
                .currentPlayers(room.getCurrentPlayers())
                .botCount(room.getBotCount())
                .createdAt(room.getCreatedAt())
                .build();
    }

    public List<RoomResponse> getAllRooms() {
        return roomRepository.findAll()
                .stream()
                .map(room -> RoomResponse.builder()
                        .id(room.getId())
                        .maxPlayers(room.getMaxPlayers())
                        .entryCost(room.getEntryCost())
                        .prizeFund(room.getPrizeFund())
                        .boostAllowed(room.getBoostAllowed())
                        .timerSeconds(room.getTimerSeconds())
                        .status(room.getStatus())
                        .currentPlayers(room.getCurrentPlayers())
                        .botCount(room.getBotCount())
                        .createdAt(room.getCreatedAt())
                        .build())
                .toList();
    }

    public List<RoomResponse> getWaitingRooms() {
        return roomRepository.findByStatus("WAITING")
                .stream()
                .map(room -> RoomResponse.builder()
                        .id(room.getId())
                        .maxPlayers(room.getMaxPlayers())
                        .entryCost(room.getEntryCost())
                        .prizeFund(room.getPrizeFund())
                        .boostAllowed(room.getBoostAllowed())
                        .timerSeconds(room.getTimerSeconds())
                        .status(room.getStatus())
                        .currentPlayers(room.getCurrentPlayers())
                        .botCount(room.getBotCount())
                        .createdAt(room.getCreatedAt())
                        .build())
                .toList();
    }

    @Transactional
    public void joinRoom(UUID roomId, Long playerId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        // Проверяем, есть ли свободные места
        if (room.getCurrentPlayers() >= room.getMaxPlayers()) {
            throw new RuntimeException("Room is full");
        }

        // Создаем запись о присоединившемся игроке
        RoomPlayer roomPlayer = new RoomPlayer();
        roomPlayer.setRoom(room);
        roomPlayer.setPlayerId(playerId);
        roomPlayer.setJoinTime(LocalDateTime.now());
        roomPlayer.setStatus("joined");

        roomPlayerRepository.save(roomPlayer);

        // Обновляем количество игроков в комнате
        room.addPlayer(roomPlayer); // вызываем метод для добавления игрока
        roomRepository.save(room);
    }
}