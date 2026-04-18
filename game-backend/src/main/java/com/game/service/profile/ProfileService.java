package com.game.service.profile;

import com.game.dto.ProfileResponse;
import com.game.exception.NotFoundException;
import com.game.model.entity.User;
import com.game.model.enums.UserRole;
import com.game.repository.UserRepository;
import com.game.service.wallet.WalletService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ProfileService {

    private final WalletService walletService;
    private final UserRepository userRepository;

    public ProfileService(WalletService walletService, UserRepository userRepository) {
        this.walletService = walletService;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public ProfileResponse getMyProfile(User user) {
        ProfileResponse response = new ProfileResponse();
        response.setUserId(user.getId());
        response.setUsername(user.getUsername());
        response.setRole(user.getRole().name());
        response.setBalance(walletService.getBalance(user));
        return response;
    }

    @Transactional
    public ProfileResponse updateUserRole(UUID userId, UserRole role) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
        user.setRole(role);
        userRepository.save(user);
        return getMyProfile(user);
    }
}
