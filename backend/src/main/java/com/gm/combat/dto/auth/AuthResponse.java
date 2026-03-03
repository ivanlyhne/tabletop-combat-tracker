package com.gm.combat.dto.auth;

public record AuthResponse(
        String token,
        String email,
        String displayName
) {}
