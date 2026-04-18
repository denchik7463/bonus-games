package com.game.service.room;

import com.game.exception.RoomNotFoundException;
import com.game.model.dto.RoomResponse;
import com.game.model.entity.Room;
import com.game.model.entity.RoomPlayer;
import com.game.repository.RoomPlayerRepository;
import com.game.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomPlayerRepository roomPlayerRepository;

    public RoomResponse createRoom(Integer maxPlayers,
                                   Integer entryCost,
                                   Boolean boostAllowed,
                                   Integer timerSeconds) {
        if (maxPlayers == null || maxPlayers < 1 || maxPlayers > 10) {
            throw new IllegalArgumentException("Максимальное количество игроков должно быть от 1 до 10.");
        }
        if (entryCost == null || entryCost < 0) {
            throw new IllegalArgumentException("Стоимость входа не может быть отрицательной.");
        }
        if (boostAllowed == null) {
            throw new IllegalArgumentException("Поле 'boostAllowed' не может быть пустым.");
        }
        if (timerSeconds == null || timerSeconds <= 0) {
            throw new IllegalArgumentException("Таймер ожидания должен быть больше 0.");
        }

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
        return toResponse(saved);
    }

    public RoomResponse getRoomById(UUID id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new RoomNotFoundException("Комната не найдена: " + id));
        return toResponse(room);
    }

    public List<RoomResponse> getAllRooms() {
        return roomRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<RoomResponse> getWaitingRooms() {
        return roomRepository.findByStatus("WAITING")
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<RoomResponse> getRoomsPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Room> rooms = roomRepository.findAll(pageable);

        return rooms.getContent()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void joinRoom(UUID roomId, Long playerId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RoomNotFoundException("Комната не найдена"));

        if (room.getCurrentPlayers() >= room.getMaxPlayers()) {
            throw new IllegalStateException("Комната полна, нет мест для присоединения.");
        }

        if (room.getCurrentPlayers() == 0) {
            room.startWaitingTimer();
        }

        RoomPlayer roomPlayer = RoomPlayer.builder()
                .room(room)
                .playerId(playerId)
                .joinTime(LocalDateTime.now())
                .status("JOINED")
                .build();

        room.addPlayer(roomPlayer);
        room.setCurrentPlayers(room.getCurrentPlayers() + 1);

        roomPlayerRepository.save(roomPlayer);
        roomRepository.save(room);
    }

    private RoomResponse toResponse(Room room) {
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

    public List<RoomResponse> filterRooms(Integer maxPlayers, Integer entryCost, Boolean boostAllowed) {
        System.out.println("Фильтрация: maxPlayers=" + maxPlayers + ", entryCost=" + entryCost + ", boostAllowed=" + boostAllowed);
        return roomRepository.findAll()
                .stream()
                .filter(room -> (maxPlayers == null || room.getMaxPlayers().equals(maxPlayers)) &&
                        (entryCost == null || room.getEntryCost().equals(entryCost)) &&
                        (boostAllowed == null || room.getBoostAllowed().equals(boostAllowed)))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
}