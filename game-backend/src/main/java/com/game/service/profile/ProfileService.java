package com.game.service.profile;

import com.game.dto.ProfileResponse;
import com.game.model.entity.User;
import com.game.service.wallet.WalletService;
import org.springframework.stereotype.Service;

@Service
public class ProfileService {

    private final WalletService walletService;

    public ProfileService(WalletService walletService) {
        this.walletService = walletService;
    }

    public ProfileResponse getMyProfile(User user) {
        ProfileResponse response = new ProfileResponse();
        response.setUserId(user.getId());
        response.setUsername(user.getUsername());
        response.setBalance(walletService.getBalance(user));
        return response;
    }
}
