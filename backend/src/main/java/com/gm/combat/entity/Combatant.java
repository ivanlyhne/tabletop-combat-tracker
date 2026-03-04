package com.gm.combat.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "combatants")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Combatant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "encounter_id", nullable = false)
    private Encounter encounter;

    @Column(name = "character_id")
    private UUID characterId;

    @Column(name = "monster_id")
    private UUID monsterId;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "initiative_value")
    private Integer initiativeValue;

    @Column(name = "initiative_modifier")
    private int initiativeModifier;

    @Column(name = "current_hp")
    private int currentHp;

    @Column(name = "max_hp")
    private int maxHp;

    @Column(name = "temp_hp")
    private int tempHp;

    @Column(name = "armor_class")
    private int armorClass;

    @Column(name = "is_player_character", nullable = false)
    private boolean playerCharacter;

    @Column(name = "is_visible_to_players", nullable = false)
    private boolean visibleToPlayers;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CombatantStatus status;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<ConditionEntry> conditions;

    @Column(name = "position_x")
    private Integer positionX;

    @Column(name = "position_y")
    private Integer positionY;

    @Column(name = "token_color")
    private String tokenColor;

    @Column(name = "token_image_url")
    private String tokenImageUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "stats_override", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> statsOverride;

    @CreationTimestamp
    @Column(name = "created_at")
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (status == null) status = CombatantStatus.ALIVE;
        if (conditions == null) conditions = new ArrayList<>();
        if (statsOverride == null) statsOverride = new HashMap<>();
        if (armorClass == 0) armorClass = 10;
        if (tokenColor == null) tokenColor = "#4a90e2";
    }
}
