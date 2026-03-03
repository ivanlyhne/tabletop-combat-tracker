package com.gm.combat.repository;

import com.gm.combat.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/gm_combat",
        "spring.datasource.username=gm_user",
        "spring.datasource.password=gm_pass",
        "spring.flyway.enabled=false"
})
@Transactional
class UserRepositoryTest {

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
