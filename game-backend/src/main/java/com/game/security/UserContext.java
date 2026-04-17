package com.game.security;

import com.game.model.entity.User;

public final class UserContext {

    private static final ThreadLocal<User> HOLDER = new ThreadLocal<>();

    private UserContext() {
    }

    public static void set(User user) {
        HOLDER.set(user);
    }

    public static User getRequired() {
        User user = HOLDER.get();
        if (user == null) {
            throw new IllegalStateException("No authenticated user in context");
        }
        return user;
    }

    public static void clear() {
        HOLDER.remove();
    }
}
