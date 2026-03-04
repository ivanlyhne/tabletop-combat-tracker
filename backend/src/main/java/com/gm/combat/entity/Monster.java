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
@Table(name = "monsters")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Monster {

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

    @Column(precision = 5, scale = 3)
    private BigDecimal challengeRating;

    private Integer xpValue;
    private int armorClass;
    private String hpFormula;
    private int hpAverage;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> speed;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> savingThrows;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> skills;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]", nullable = false)
    private String[] damageResistances;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]", nullable = false)
    private String[] damageImmunities;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]", nullable = false)
    private String[] damageVulnerabilities;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]", nullable = false)
    private String[] conditionImmunities;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<Map<String, Object>> traits;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<Map<String, Object>> actions;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]", nullable = false)
    private String[] environmentTags;

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
