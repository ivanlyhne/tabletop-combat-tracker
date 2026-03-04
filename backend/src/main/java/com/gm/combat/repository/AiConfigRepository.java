package com.gm.combat.repository;

import com.gm.combat.entity.AiConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface AiConfigRepository extends JpaRepository<AiConfig, UUID> {

    Optional<AiConfig> findByUserId(UUID userId);

    @Query("SELECT a FROM AiConfig a JOIN User u ON u.id = a.userId WHERE u.email = :email")
    Optional<AiConfig> findByUserEmail(String email);
}
