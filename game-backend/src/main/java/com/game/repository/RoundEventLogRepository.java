package com.game.repository;

import com.game.model.entity.RoundEventLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RoundEventLogRepository extends JpaRepository<RoundEventLog, UUID> {

    List<RoundEventLog> findByGameResultIdOrderByCreatedAtAsc(UUID gameResultId);

    List<RoundEventLog> findByRoomIdOrderByCreatedAtAsc(UUID roomId);
}