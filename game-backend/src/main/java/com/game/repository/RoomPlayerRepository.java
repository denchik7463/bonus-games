package com.game.repository;

import com.game.model.entity.RoomPlayer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RoomPlayerRepository extends JpaRepository<RoomPlayer, Long> {
    boolean existsByRoom_IdAndUserId(UUID roomId, UUID userId);

    List<RoomPlayer> findByRoom_IdOrderByPlayerOrderAsc(UUID roomId);
}
