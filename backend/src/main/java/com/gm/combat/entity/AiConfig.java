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

    @Column(name = "encrypted_api_key")
    private String encryptedApiKey;

    @Column(name = "model_name")
    private String modelName;

    @Column(name = "max_tokens", nullable = false)
    private int maxTokens;

    @Column(nullable = false, precision = 3, scale = 2)
    private BigDecimal temperature;

    @CreationTimestamp
    @Column(name = "created_at")
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (provider == null) provider = "NONE";
        if (maxTokens == 0) maxTokens = 4096;
        if (temperature == null) temperature = new BigDecimal("0.70");
    }
}
