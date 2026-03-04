package com.gm.combat.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_configs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AiConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(nullable = false)
    private String provider;

    private String encryptedApiKey;

    private String modelName;

    @Column(nullable = false)
    private int maxTokens;

    @Column(nullable = false, precision = 3, scale = 2)
    private BigDecimal temperature;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (provider == null) provider = "NONE";
        if (maxTokens == 0) maxTokens = 4096;
        if (temperature == null) temperature = new BigDecimal("0.70");
    }
}
