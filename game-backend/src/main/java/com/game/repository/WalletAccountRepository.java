package com.game.repository;

import com.game.model.dto.TopPlayerBalanceResponse;
import com.game.model.entity.WalletAccount;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WalletAccountRepository extends JpaRepository<WalletAccount, UUID> {

    Optional<WalletAccount> findByUserId(UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from WalletAccount w where w.userId = :userId")
    Optional<WalletAccount> findByUserIdForUpdate(UUID userId);

    @Query("""
            select new com.game.model.dto.TopPlayerBalanceResponse(
                u.id,
                u.username,
                w.availableBalance,
                w.reservedBalance,
                (w.availableBalance + w.reservedBalance)
            )
            from WalletAccount w
            join User u on u.id = w.userId
            order by (w.availableBalance + w.reservedBalance) desc, u.username asc
            """)
    List<TopPlayerBalanceResponse> findTopPlayerBalances(Pageable pageable);
}
