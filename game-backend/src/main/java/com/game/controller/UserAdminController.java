package com.game.controller;

import com.game.dto.ProfileResponse;
import com.game.dto.UpdateUserRoleRequest;
import com.game.model.entity.User;
import com.game.model.enums.UserRole;
import com.game.security.RoleGuard;
import com.game.service.profile.ProfileService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
public class UserAdminController {

    private final ProfileService profileService;

    public UserAdminController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @PatchMapping("/{userId}/role")
    public ProfileResponse updateRole(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserRoleRequest request
    ) {
        RoleGuard.require(UserRole.ADMIN);
        return profileService.updateUserRole(userId, request.getRole());
    }

    @PatchMapping("/me/role")
    public ProfileResponse updateMyRole(@Valid @RequestBody UpdateUserRoleRequest request) {
        User caller = RoleGuard.require(UserRole.ADMIN);
        return profileService.updateUserRole(caller.getId(), request.getRole());
    }
}
