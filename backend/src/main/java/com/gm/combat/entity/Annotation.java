package com.gm.combat.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "annotations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Annotation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "encounter_id", nullable = false)
    private UUID encounterId;

    @Column(name = "annotation_type", nullable = false)
    private String annotationType;

    private String label;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> position;

    @Column(nullable = false)
    private String color;

    @CreationTimestamp
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (color == null) color = "#ff6b35";
    }
}
