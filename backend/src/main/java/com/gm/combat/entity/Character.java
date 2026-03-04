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

    @Column(name = "character_type", nullable = false)
    private String characterType;

    @Column(nullable = false)
    private String ruleset;

    @Column(name = "initiative_modifier")
    private int initiativeModifier;

    @Column(name = "armor_class")
    private int armorClass;

    @Column(name = "max_hp")
    private int maxHp;

    @Column(name = "current_hp")
    private int currentHp;

    @Column(name = "temp_hp")
    private int tempHp;

    private int speed;

    @Column(name = "passive_perception")
    private Integer passivePerception;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "external_id")
    private String externalId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extra_attributes", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> extraAttributes;

    @CreationTimestamp
    @Column(name = "created_at")
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
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
