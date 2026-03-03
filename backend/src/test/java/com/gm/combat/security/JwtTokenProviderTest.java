package com.gm.combat.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    // Direct instantiation - no Spring context needed
    private final JwtTokenProvider jwtProvider = new JwtTokenProvider(
            "dGVzdFNlY3JldEtleUZvckp3dFRlc3RpbmdPbmx5MTIzNDU2Nzg=",
            3600000L
    );

    @Test
    void generateAndValidate_roundTrip() {
        String token = jwtProvider.generateToken("user@test.com");
        assertThat(jwtProvider.validateToken(token)).isTrue();
        assertThat(jwtProvider.getEmailFromToken(token)).isEqualTo("user@test.com");
    }

    @Test
    void invalidToken_failsValidation() {
        assertThat(jwtProvider.validateToken("garbage.token.here")).isFalse();
    }
}
