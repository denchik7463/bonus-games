package com.game.repository;

import com.game.model.entity.Room;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;

import java.util.UUID;
import java.util.List;
import java.time.LocalDateTime;


public interface RoomRepository extends JpaRepository<Room, UUID> {

    List<Room> findByStatus(String status);

    List<Room> findByStatusIn(List<String> statuses);

    List<Room> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select r
            from Room r
            where r.templateId = :templateId
              and r.status = 'WAITING'
              and r.currentPlayers < r.maxPlayers
            order by r.createdAt asc
            """)
    List<Room> findJoinableWaitingRoomsByTemplateIdForUpdate(UUID templateId, Pageable pageable);

}
