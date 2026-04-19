package com.game.repository;

import com.game.model.entity.RoomConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface RoomConfigRepository extends JpaRepository<RoomConfig, UUID> {

    boolean existsByTemplateNameIgnoreCase(String templateName);

    boolean existsByTemplateNameIgnoreCaseAndIdNot(String templateName, UUID id);

    List<RoomConfig> findAllByOrderByCreatedAtDesc();

    @Query("select distinct rc.entryCost from RoomConfig rc order by rc.entryCost asc")
    List<Integer> findDistinctEntryCosts();
}