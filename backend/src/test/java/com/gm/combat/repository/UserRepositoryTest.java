package com.gm.combat.repository;

import com.gm.combat.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
@Transactional
class UserRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        // Let Flyway run migrations on the fresh container to create the schema
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired
    UserRepository repo;

    @Test
    void findByEmail_returnsUser() {
        User u = User.builder()
                .email("repo-test-find@test.com")
                .passwordHash("hash")
                .displayName("GM")
                .build();
        repo.saveAndFlush(u);
        assertThat(repo.findByEmail("repo-test-find@test.com")).isPresent();
    }

    @Test
    void existsByEmail_trueWhenExists() {
        User u = User.builder()
                .email("repo-test-exists@test.com")
                .passwordHash("hash")
                .build();
        repo.saveAndFlush(u);
        assertThat(repo.existsByEmail("repo-test-exists@test.com")).isTrue();
        assertThat(repo.existsByEmail("nope@test.com")).isFalse();
    }
}
