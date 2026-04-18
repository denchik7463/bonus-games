package com.game.controller;

import com.game.dto.ProfileResponse;
import com.game.model.entity.User;
import com.game.model.enums.UserRole;
import com.game.security.RoleGuard;
import com.game.security.UserContext;
import com.game.service.profile.ProfileService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me")
    public ProfileResponse me() {
        RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        User user = UserContext.getRequired();
        return profileService.getMyProfile(user);
    }
}
