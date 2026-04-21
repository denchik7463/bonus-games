package com.game.repository;

import com.game.model.dto.PopularRoomTemplateResponse;
import com.game.model.entity.RoomConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoomConfigRepository extends JpaRepository<RoomConfig, UUID> {

    boolean existsByTemplateNameIgnoreCase(String templateName);

    boolean existsByTemplateNameIgnoreCaseAndIdNot(String templateName, UUID id);

    List<RoomConfig> findAllByOrderByCreatedAtDesc();

    Optional<RoomConfig> findFirstByActiveTrueAndMaxPlayersAndEntryCostAndBonusEnabledOrderByCreatedAtDesc(
            Integer maxPlayers,
            Integer entryCost,
            Boolean bonusEnabled
    );

    @Query("select distinct rc.entryCost from RoomConfig rc order by rc.entryCost asc")
    List<Integer> findDistinctEntryCosts();

    @Query("""
            select new com.game.model.dto.PopularRoomTemplateResponse(
                rc.id,
                rc.templateName,
                count(r.id),
                rc.maxPlayers,
                rc.entryCost,
                rc.bonusEnabled
            )
            from RoomConfig rc
            left join Room r on r.templateId = rc.id
            group by rc.id, rc.templateName, rc.maxPlayers, rc.entryCost, rc.bonusEnabled
            order by count(r.id) desc, rc.templateName asc
            """)
    List<PopularRoomTemplateResponse> findPopularTemplates();
}
