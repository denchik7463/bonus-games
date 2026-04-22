package com.game.auth;

import com.game.dto.AuthResponse;
import com.game.dto.BalanceResponse;
import com.game.dto.LoginRequest;
import com.game.dto.RegisterRequest;
import com.game.exception.ConflictException;
import com.game.exception.UnauthorizedException;
import com.game.model.entity.AuthSession;
import com.game.model.entity.User;
import com.game.model.entity.WalletAccount;
import com.game.repository.AuthSessionRepository;
import com.game.repository.UserRepository;
import com.game.repository.WalletAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final WalletAccountRepository walletAccountRepository;
    private final AuthSessionRepository authSessionRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom secureRandom = new SecureRandom();
    private final long tokenTtlHours;

    public AuthService(
            UserRepository userRepository,
            WalletAccountRepository walletAccountRepository,
            AuthSessionRepository authSessionRepository,
            @Value("${app.auth.token-ttl-hours:2400}") long tokenTtlHours
    ) {
        this.userRepository = userRepository;
        this.walletAccountRepository = walletAccountRepository;
        this.authSessionRepository = authSessionRepository;
        this.tokenTtlHours = tokenTtlHours;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedUsername = request.getUsername().trim().toLowerCase();
        userRepository.findByUsername(normalizedUsername).ifPresent(user -> {
            throw new ConflictException("Username is already taken");
        });

        OffsetDateTime now = OffsetDateTime.now();
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername(normalizedUsername);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        userRepository.save(user);

        WalletAccount wallet = new WalletAccount();
        wallet.setId(UUID.randomUUID());
        wallet.setUserId(user.getId());
        wallet.setAvailableBalance(request.getInitialBalance() == null ? 0L : request.getInitialBalance());
        wallet.setReservedBalance(0L);
        wallet.setCreatedAt(now);
        wallet.setUpdatedAt(now);
        walletAccountRepository.save(wallet);

        AuthSession session = createSession(user.getId(), now);
        return toAuthResponse(user, wallet, session);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String normalizedUsername = request.getUsername().trim().toLowerCase();
        User user = userRepository.findByUsername(normalizedUsername)
                .orElseThrow(() -> new UnauthorizedException("Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid username or password");
        }

        WalletAccount wallet = walletAccountRepository.findByUserId(user.getId())
                .orElseThrow(() -> new UnauthorizedException("Wallet is not found"));

        AuthSession session = createSession(user.getId(), OffsetDateTime.now());
        return toAuthResponse(user, wallet, session);
    }

    public User authenticate(String token) {
        AuthSession session = authSessionRepository.findByToken(token)
                .orElseThrow(() -> new UnauthorizedException("Invalid token"));

        if (session.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new UnauthorizedException("Token expired");
        }

        return userRepository.findById(session.getUserId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }

    private AuthSession createSession(UUID userId, OffsetDateTime now) {
        AuthSession session = new AuthSession();
        session.setId(UUID.randomUUID());
        session.setUserId(userId);
        session.setToken(generateToken());
        session.setCreatedAt(now);
        session.setExpiresAt(now.plusHours(tokenTtlHours));
        return authSessionRepository.save(session);
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private AuthResponse toAuthResponse(User user, WalletAccount wallet, AuthSession session) {
        AuthResponse response = new AuthResponse();
        response.setUserId(user.getId());
        response.setUsername(user.getUsername());
        response.setRole(user.getRole().name());
        response.setToken(session.getToken());
        response.setExpiresAt(session.getExpiresAt());

        BalanceResponse balance = new BalanceResponse();
        balance.setAvailable(wallet.getAvailableBalance());
        balance.setReserved(wallet.getReservedBalance());
        balance.setTotal(wallet.getAvailableBalance() + wallet.getReservedBalance());
        response.setBalance(balance);

        return response;
    }
}
