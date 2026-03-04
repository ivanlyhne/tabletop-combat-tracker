package com.gm.combat.security;

import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtils {

    public static String currentUserEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    private SecurityUtils() {}
}
