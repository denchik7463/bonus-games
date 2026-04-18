package com.game.security;

import com.game.exception.ForbiddenException;
import com.game.model.entity.User;
import com.game.model.enums.UserRole;

import java.util.Arrays;

public final class RoleGuard {

    private RoleGuard() {
    }

    public static User requireAny(UserRole... roles) {
        User user = UserContext.getRequired();
        UserRole role = user.getRole();
        boolean allowed = Arrays.stream(roles).anyMatch(r -> r == role);
        if (!allowed) {
            throw new ForbiddenException("Insufficient role");
        }
        return user;
    }

    public static User require(UserRole role) {
        return requireAny(role);
    }
}
