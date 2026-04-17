package com.game.repository;

import com.game.model.entity.WalletReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;

public interface WalletReservationRepository extends JpaRepository<WalletReservation, UUID> {
    Optional<WalletReservation> findByOperationId(String operationId);
    Optional<WalletReservation> findByIdAndUserId(UUID id, UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from WalletReservation r where r.id = :id and r.userId = :userId")
    Optional<WalletReservation> findByIdAndUserIdForUpdate(UUID id, UUID userId);
}
