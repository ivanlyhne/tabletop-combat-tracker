package com.gm.combat.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "characters")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Character {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String characterType;

    @Column(nullable = false)
    private String ruleset;

    private int initiativeModifier;
    private int armorClass;
    private int maxHp;
    private int currentHp;
    private int tempHp;
    private int speed;
    private Integer passivePerception;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private String externalId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> extraAttributes;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (characterType == null) characterType = "PC";
        if (ruleset == null) ruleset = "DND_5E";
        if (speed == 0) speed = 30;
        if (armorClass == 0) armorClass = 10;
        if (extraAttributes == null) extraAttributes = new HashMap<>();
    }
}
