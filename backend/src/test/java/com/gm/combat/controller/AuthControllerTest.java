package com.gm.combat.controller;

import com.gm.combat.dto.auth.AuthResponse;
import com.gm.combat.dto.auth.LoginRequest;
import com.gm.combat.dto.auth.RegisterRequest;
import com.gm.combat.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/gm_combat",
        "spring.datasource.username=gm_user",
        "spring.datasource.password=gm_pass"
})
class AuthControllerTest {

    @Autowired
    TestRestTemplate rest;

    @Autowired
    UserRepository userRepository;

    @BeforeEach
    void cleanUp() {
        // Remove any users created by previous test runs to keep tests idempotent
        userRepository.findByEmail("auth-test-gm@example.com").ifPresent(userRepository::delete);
        userRepository.findByEmail("auth-test-dup@example.com").ifPresent(userRepository::delete);
    }

    @Test
    void registerAndLogin_returnsToken() {
        var reg = new RegisterRequest("auth-test-gm@example.com", "password123", "GM Dave");
        ResponseEntity<AuthResponse> regRes = rest.postForEntity(
                "/api/auth/register", reg, AuthResponse.class);
        assertThat(regRes.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(regRes.getBody()).isNotNull();
        assertThat(regRes.getBody().token()).isNotBlank();
        assertThat(regRes.getBody().email()).isEqualTo("auth-test-gm@example.com");
        assertThat(regRes.getBody().displayName()).isEqualTo("GM Dave");

        var login = new LoginRequest("auth-test-gm@example.com", "password123");
        ResponseEntity<AuthResponse> logRes = rest.postForEntity(
                "/api/auth/login", login, AuthResponse.class);
        assertThat(logRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(logRes.getBody().token()).isNotBlank();
    }

    @Test
    void login_wrongPassword_returns401() {
        var login = new LoginRequest("nonexistent@example.com", "wrongpass");
        ResponseEntity<String> res = rest.postForEntity("/api/auth/login", login, String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void register_duplicateEmail_returns409() {
        var reg = new RegisterRequest("auth-test-dup@example.com", "password123", "User1");
        rest.postForEntity("/api/auth/register", reg, AuthResponse.class);

        var reg2 = new RegisterRequest("auth-test-dup@example.com", "password456", "User2");
        ResponseEntity<String> res = rest.postForEntity("/api/auth/register", reg2, String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }
}
