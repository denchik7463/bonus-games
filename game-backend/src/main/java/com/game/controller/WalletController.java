package com.game.controller;

import com.game.dto.BalanceResponse;
import com.game.dto.DepositRequest;
import com.game.dto.FinalizeReservationRequest;
import com.game.dto.ReservationResponse;
import com.game.dto.ReserveRequest;
import com.game.model.entity.User;
import com.game.model.enums.UserRole;
import com.game.security.RoleGuard;
import com.game.security.UserContext;
import com.game.service.wallet.WalletService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping("/balance")
    public BalanceResponse balance() {
        RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        User user = UserContext.getRequired();
        return walletService.getBalance(user);
    }

    @PostMapping("/deposit")
    public BalanceResponse deposit(
            @Valid @RequestBody DepositRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        User user = UserContext.getRequired();
        return walletService.deposit(user, request, idempotencyKey);
    }

    @PostMapping("/reserve")
    public ReservationResponse reserve(@Valid @RequestBody ReserveRequest request) {
        RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        User user = UserContext.getRequired();
        return walletService.reserve(user, request);
    }

    @PostMapping("/reservations/{reservationId}/release")
    public ReservationResponse release(
            @PathVariable UUID reservationId,
            @Valid @RequestBody FinalizeReservationRequest request
    ) {
        RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        User user = UserContext.getRequired();
        return walletService.release(user, reservationId, request);
    }

    @PostMapping("/reservations/{reservationId}/commit")
    public ReservationResponse commit(
            @PathVariable UUID reservationId,
            @Valid @RequestBody FinalizeReservationRequest request
    ) {
        RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        User user = UserContext.getRequired();
        return walletService.commit(user, reservationId, request);
    }
}
