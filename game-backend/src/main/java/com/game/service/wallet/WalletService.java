package com.game.service.wallet;

import com.game.dto.BalanceResponse;
import com.game.dto.DepositRequest;
import com.game.dto.FinalizeReservationRequest;
import com.game.dto.ReservationResponse;
import com.game.dto.ReserveRequest;
import com.game.exception.ConflictException;
import com.game.exception.InsufficientBalanceException;
import com.game.exception.NotFoundException;
import com.game.model.entity.Transaction;
import com.game.model.entity.User;
import com.game.model.entity.WalletAccount;
import com.game.model.entity.WalletReservation;
import com.game.model.enums.ReservationStatus;
import com.game.model.enums.TransactionType;
import com.game.repository.TransactionRepository;
import com.game.repository.WalletAccountRepository;
import com.game.repository.WalletReservationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class WalletService {

    private final WalletAccountRepository walletAccountRepository;
    private final WalletReservationRepository walletReservationRepository;
    private final TransactionRepository transactionRepository;

    public WalletService(
            WalletAccountRepository walletAccountRepository,
            WalletReservationRepository walletReservationRepository,
            TransactionRepository transactionRepository
    ) {
        this.walletAccountRepository = walletAccountRepository;
        this.walletReservationRepository = walletReservationRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional(readOnly = true)
    public BalanceResponse getBalance(User user) {
        WalletAccount account = walletAccountRepository.findByUserId(user.getId())
                .orElseThrow(() -> new NotFoundException("Wallet not found"));
        return toBalance(account);
    }

    @Transactional(readOnly = true)
    public BalanceResponse getBalanceByUserId(UUID userId) {
        WalletAccount account = walletAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("Wallet not found"));
        return toBalance(account);
    }

    @Transactional
    public BalanceResponse deposit(User user, DepositRequest request, String operationId) {
        WalletAccount account = walletAccountRepository.findByUserIdForUpdate(user.getId())
                .orElseThrow(() -> new NotFoundException("Wallet not found"));

        account.setAvailableBalance(account.getAvailableBalance() + request.getAmount());
        account.setUpdatedAt(OffsetDateTime.now());
        walletAccountRepository.save(account);

        createTransaction(
                user.getId(),
                null,
                TransactionType.DEPOSIT,
                request.getAmount(),
                request.getDescription() == null ? "Manual deposit" : request.getDescription(),
                operationId
        );

        return toBalance(account);
    }

    @Transactional
    public ReservationResponse reserve(User user, ReserveRequest request) {
        WalletReservation existing = walletReservationRepository.findByOperationId(request.getOperationId()).orElse(null);
        if (existing != null) {
            if (!existing.getUserId().equals(user.getId())) {
                throw new ConflictException("Operation id already used by another user");
            }
            WalletAccount account = walletAccountRepository.findByUserId(user.getId())
                    .orElseThrow(() -> new NotFoundException("Wallet not found"));
            return toReservationResponse(existing, account);
        }

        WalletAccount account = walletAccountRepository.findByUserIdForUpdate(user.getId())
                .orElseThrow(() -> new NotFoundException("Wallet not found"));

        long amount = request.getAmount();
        if (account.getAvailableBalance() < amount) {
            throw new InsufficientBalanceException("Insufficient available balance for reservation");
        }

        account.setAvailableBalance(account.getAvailableBalance() - amount);
        account.setReservedBalance(account.getReservedBalance() + amount);
        account.setUpdatedAt(OffsetDateTime.now());
        walletAccountRepository.save(account);

        OffsetDateTime now = OffsetDateTime.now();
        WalletReservation reservation = new WalletReservation();
        reservation.setId(UUID.randomUUID());
        reservation.setUserId(user.getId());
        reservation.setRoomId(request.getRoomId());
        reservation.setRoundId(request.getRoundId());
        reservation.setAmount(amount);
        reservation.setStatus(ReservationStatus.RESERVED);
        reservation.setOperationId(request.getOperationId());
        reservation.setExpiresAt(request.getExpiresAt() == null ? now.plusMinutes(1) : request.getExpiresAt());
        reservation.setCreatedAt(now);
        reservation.setUpdatedAt(now);
        walletReservationRepository.save(reservation);

        createTransaction(
                user.getId(),
                reservation.getId(),
                TransactionType.RESERVE,
                amount,
                "Reserve points for room " + request.getRoomId(),
                request.getOperationId()
        );

        return toReservationResponse(reservation, account);
    }

    @Transactional
    public ReservationResponse reserveForRoomJoin(
            User user,
            String roomId,
            String roundId,
            long amount,
            OffsetDateTime expiresAt,
            String operationId
    ) {
        ReserveRequest request = new ReserveRequest();
        request.setRoomId(roomId);
        request.setRoundId(roundId);
        request.setAmount(amount);
        request.setOperationId(operationId);
        request.setExpiresAt(expiresAt);
        return reserve(user, request);
    }

    @Transactional
    public ReservationResponse release(User user, UUID reservationId, FinalizeReservationRequest request) {
        WalletReservation reservation = getOwnedReservation(user, reservationId);
        WalletAccount account = walletAccountRepository.findByUserIdForUpdate(user.getId())
                .orElseThrow(() -> new NotFoundException("Wallet not found"));

        if (reservation.getStatus() == ReservationStatus.RELEASED) {
            return toReservationResponse(reservation, account);
        }
        if (reservation.getStatus() == ReservationStatus.COMMITTED) {
            throw new ConflictException("Reservation is already committed");
        }

        account.setReservedBalance(account.getReservedBalance() - reservation.getAmount());
        account.setAvailableBalance(account.getAvailableBalance() + reservation.getAmount());
        account.setUpdatedAt(OffsetDateTime.now());
        walletAccountRepository.save(account);

        reservation.setStatus(ReservationStatus.RELEASED);
        reservation.setUpdatedAt(OffsetDateTime.now());
        walletReservationRepository.save(reservation);

        createTransaction(
                user.getId(),
                reservation.getId(),
                TransactionType.RELEASE,
                reservation.getAmount(),
                "Release reservation",
                request.getOperationId()
        );

        return toReservationResponse(reservation, account);
    }

    @Transactional
    public ReservationResponse releaseSystem(UUID reservationId, String operationId, String description) {
        WalletReservation reservation = getReservationForUpdate(reservationId);
        WalletAccount account = walletAccountRepository.findByUserIdForUpdate(reservation.getUserId())
                .orElseThrow(() -> new NotFoundException("Wallet not found"));

        if (reservation.getStatus() == ReservationStatus.RELEASED) {
            return toReservationResponse(reservation, account);
        }
        if (reservation.getStatus() == ReservationStatus.COMMITTED) {
            throw new ConflictException("Reservation is already committed");
        }

        account.setReservedBalance(account.getReservedBalance() - reservation.getAmount());
        account.setAvailableBalance(account.getAvailableBalance() + reservation.getAmount());
        account.setUpdatedAt(OffsetDateTime.now());
        walletAccountRepository.save(account);

        reservation.setStatus(ReservationStatus.RELEASED);
        reservation.setUpdatedAt(OffsetDateTime.now());
        walletReservationRepository.save(reservation);

        createTransaction(
                reservation.getUserId(),
                reservation.getId(),
                TransactionType.RELEASE,
                reservation.getAmount(),
                description == null ? "Release reservation" : description,
                operationId
        );

        return toReservationResponse(reservation, account);
    }

    @Transactional
    public ReservationResponse commit(User user, UUID reservationId, FinalizeReservationRequest request) {
        WalletReservation reservation = getOwnedReservation(user, reservationId);
        WalletAccount account = walletAccountRepository.findByUserIdForUpdate(user.getId())
                .orElseThrow(() -> new NotFoundException("Wallet not found"));

        if (reservation.getStatus() == ReservationStatus.COMMITTED) {
            return toReservationResponse(reservation, account);
        }
        if (reservation.getStatus() == ReservationStatus.RELEASED) {
            throw new ConflictException("Reservation is already released");
        }

        account.setReservedBalance(account.getReservedBalance() - reservation.getAmount());
        account.setUpdatedAt(OffsetDateTime.now());
        walletAccountRepository.save(account);

        reservation.setStatus(ReservationStatus.COMMITTED);
        reservation.setUpdatedAt(OffsetDateTime.now());
        walletReservationRepository.save(reservation);

        createTransaction(
                user.getId(),
                reservation.getId(),
                TransactionType.BET,
                reservation.getAmount(),
                "Commit reservation",
                request.getOperationId()
        );

        return toReservationResponse(reservation, account);
    }

    @Transactional
    public ReservationResponse commitSystem(UUID reservationId, String operationId, String description) {
        WalletReservation reservation = getReservationForUpdate(reservationId);
        WalletAccount account = walletAccountRepository.findByUserIdForUpdate(reservation.getUserId())
                .orElseThrow(() -> new NotFoundException("Wallet not found"));

        if (reservation.getStatus() == ReservationStatus.COMMITTED) {
            return toReservationResponse(reservation, account);
        }
        if (reservation.getStatus() == ReservationStatus.RELEASED) {
            throw new ConflictException("Reservation is already released");
        }

        account.setReservedBalance(account.getReservedBalance() - reservation.getAmount());
        account.setUpdatedAt(OffsetDateTime.now());
        walletAccountRepository.save(account);

        reservation.setStatus(ReservationStatus.COMMITTED);
        reservation.setUpdatedAt(OffsetDateTime.now());
        walletReservationRepository.save(reservation);

        createTransaction(
                reservation.getUserId(),
                reservation.getId(),
                TransactionType.BET,
                reservation.getAmount(),
                description == null ? "Commit reservation" : description,
                operationId
        );

        return toReservationResponse(reservation, account);
    }

    @Transactional
    public BalanceResponse creditWin(UUID userId, long amount, String operationId, String description) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Win amount must be > 0");
        }

        WalletAccount account = walletAccountRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new NotFoundException("Wallet not found"));

        account.setAvailableBalance(account.getAvailableBalance() + amount);
        account.setUpdatedAt(OffsetDateTime.now());
        walletAccountRepository.save(account);

        createTransaction(
                userId,
                null,
                TransactionType.WIN,
                amount,
                description == null ? "Win payout" : description,
                operationId
        );

        return toBalance(account);
    }

    @Transactional
    public BalanceResponse chargeBoost(UUID userId, long amount, String operationId, String description) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Boost amount must be > 0");
        }

        WalletAccount account = walletAccountRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new NotFoundException("Wallet not found"));

        if (account.getAvailableBalance() < amount) {
            throw new InsufficientBalanceException("Insufficient balance to activate boost");
        }

        account.setAvailableBalance(account.getAvailableBalance() - amount);
        account.setUpdatedAt(OffsetDateTime.now());
        walletAccountRepository.save(account);

        createTransaction(
                userId,
                null,
                TransactionType.BOOST_PURCHASE,
                amount,
                description == null ? "Boost activation" : description,
                operationId
        );

        return toBalance(account);
    }

    private WalletReservation getOwnedReservation(User user, UUID reservationId) {
        return walletReservationRepository.findByIdAndUserIdForUpdate(reservationId, user.getId())
                .orElseThrow(() -> new NotFoundException("Reservation not found"));
    }

    private WalletReservation getReservationForUpdate(UUID reservationId) {
        return walletReservationRepository.findByIdForUpdate(reservationId)
                .orElseThrow(() -> new NotFoundException("Reservation not found"));
    }

    private void createTransaction(
            UUID userId,
            UUID reservationId,
            TransactionType type,
            long amount,
            String description,
            String operationId
    ) {
        Transaction transaction = new Transaction();
        transaction.setId(UUID.randomUUID());
        transaction.setUserId(userId);
        transaction.setReservationId(reservationId);
        transaction.setType(type);
        transaction.setAmount(amount);
        transaction.setDescription(description);
        transaction.setOperationId(operationId);
        transaction.setCreatedAt(OffsetDateTime.now());
        transactionRepository.save(transaction);
    }

    private BalanceResponse toBalance(WalletAccount account) {
        BalanceResponse response = new BalanceResponse();
        response.setAvailable(account.getAvailableBalance());
        response.setReserved(account.getReservedBalance());
        response.setTotal(account.getAvailableBalance() + account.getReservedBalance());
        return response;
    }

    private ReservationResponse toReservationResponse(WalletReservation reservation, WalletAccount account) {
        ReservationResponse response = new ReservationResponse();
        response.setReservationId(reservation.getId());
        response.setRoomId(reservation.getRoomId());
        response.setRoundId(reservation.getRoundId());
        response.setAmount(reservation.getAmount());
        response.setStatus(reservation.getStatus());
        response.setOperationId(reservation.getOperationId());
        response.setExpiresAt(reservation.getExpiresAt());
        response.setBalance(toBalance(account));
        return response;
    }
}
