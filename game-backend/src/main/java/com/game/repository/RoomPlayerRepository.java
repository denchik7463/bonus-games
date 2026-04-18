package com.game.repository;

import com.game.model.entity.RoomPlayer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomPlayerRepository extends JpaRepository<RoomPlayer, Long> {
    // можно добавить дополнительные методы, если нужно
}