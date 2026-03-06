package com.gm.combat.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "enemies")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Enemy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id")
    private Campaign campaign;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String ruleset;

    @Column(name = "challenge_rating", precision = 5, scale = 3)
    private BigDecimal challengeRating;

    @Column(name = "xp_value")
    private Integer xpValue;

    @Column(name = "armor_class")
    private int armorClass;

    @Column(name = "hp_formula")
    private String hpFormula;

    @Column(name = "hp_average")
    private int hpAverage;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> speed;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "saving_throws", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> savingThrows;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> skills;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "damage_resistances", columnDefinition = "text[]", nullable = false)
    private String[] damageResistances;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "damage_immunities", columnDefinition = "text[]", nullable = false)
    private String[] damageImmunities;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "damage_vulnerabilities", columnDefinition = "text[]", nullable = false)
    private String[] damageVulnerabilities;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "condition_immunities", columnDefinition = "text[]", nullable = false)
    private String[] conditionImmunities;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<Map<String, Object>> traits;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<Map<String, Object>> actions;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "environment_tags", columnDefinition = "text[]", nullable = false)
    private String[] environmentTags;

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
        if (ruleset == null) ruleset = "DND_5E";
        if (armorClass == 0) armorClass = 10;
        if (speed == null) { speed = new HashMap<>(); speed.put("walk", 30); }
        if (savingThrows == null) savingThrows = new HashMap<>();
        if (skills == null) skills = new HashMap<>();
        if (damageResistances == null) damageResistances = new String[0];
        if (damageImmunities == null) damageImmunities = new String[0];
        if (damageVulnerabilities == null) damageVulnerabilities = new String[0];
        if (conditionImmunities == null) conditionImmunities = new String[0];
        if (traits == null) traits = new ArrayList<>();
        if (actions == null) actions = new ArrayList<>();
        if (environmentTags == null) environmentTags = new String[0];
        if (extraAttributes == null) extraAttributes = new HashMap<>();
    }
}
