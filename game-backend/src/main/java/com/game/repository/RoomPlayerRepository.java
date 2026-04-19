package com.game.repository;

import com.game.model.entity.RoomPlayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoomPlayerRepository extends JpaRepository<RoomPlayer, Long> {
    boolean existsByRoom_IdAndUserId(UUID roomId, UUID userId);

    Optional<RoomPlayer> findByRoom_IdAndUserId(UUID roomId, UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select rp from RoomPlayer rp where rp.room.id = :roomId and rp.userId = :userId")
    Optional<RoomPlayer> findByRoomIdAndUserIdForUpdate(UUID roomId, UUID userId);

    List<RoomPlayer> findByRoom_IdOrderByPlayerOrderAsc(UUID roomId);
}
