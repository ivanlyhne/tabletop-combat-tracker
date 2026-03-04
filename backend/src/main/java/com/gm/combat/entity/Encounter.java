package com.gm.combat.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "encounters")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Encounter {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(name = "map_id")
    private UUID mapId;

    @Column(nullable = false)
    private String name;

    private String description;
    private String objectives;

    @Column(name = "terrain_notes")
    private String terrainNotes;

    @Column(name = "loot_notes")
    private String lootNotes;

    @Column(nullable = false)
    private String ruleset;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EncounterStatus status;

    @Column(name = "current_round")
    private int currentRound;

    @Column(name = "active_combatant_index")
    private int activeCombatantIndex;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "initiative_order", columnDefinition = "jsonb", nullable = false)
    private List<UUID> initiativeOrder;

    @Column(name = "environment_tag")
    private String environmentTag;

    @Column(name = "difficulty_target")
    private String difficultyTarget;

    @CreationTimestamp
    @Column(name = "created_at")
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (ruleset == null) ruleset = "DND_5E";
        if (status == null) status = EncounterStatus.DRAFT;
        if (initiativeOrder == null) initiativeOrder = new ArrayList<>();
    }
}
