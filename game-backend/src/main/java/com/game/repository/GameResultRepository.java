package com.game.repository;

import com.game.model.entity.GameResult;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GameResultRepository extends JpaRepository<GameResult, UUID> {

    @Override
    @EntityGraph(attributePaths = "participants")
    Optional<GameResult> findById(UUID id);

    @EntityGraph(attributePaths = "participants")
    List<GameResult> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = "participants")
    List<GameResult> findByRoomIdOrderByCreatedAtDesc(UUID roomId);

    @EntityGraph(attributePaths = "participants")
    @Query("""
            select distinct gr
            from GameResult gr
            join gr.participants p
            where p.playerExternalId = :playerExternalId
               or lower(p.username) = lower(:username)
            order by gr.createdAt desc
            """)
    List<GameResult> findUserHistory(@Param("playerExternalId") String playerExternalId,
                                     @Param("username") String username);

    @Query("""
            select count(gr) > 0
            from GameResult gr
            join gr.participants p
            where gr.id = :gameResultId
              and (
                    p.playerExternalId = :playerExternalId
                    or lower(p.username) = lower(:username)
                  )
            """)
    boolean existsUserParticipation(@Param("gameResultId") UUID gameResultId,
                                    @Param("playerExternalId") String playerExternalId,
                                    @Param("username") String username);
}