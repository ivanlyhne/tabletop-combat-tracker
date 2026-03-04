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
    private String terrainNotes;
    private String lootNotes;

    @Column(nullable = false)
    private String ruleset;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EncounterStatus status;

    private int currentRound;
    private int activeCombatantIndex;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<UUID> initiativeOrder;

    private String environmentTag;
    private String difficultyTarget;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (ruleset == null) ruleset = "DND_5E";
        if (status == null) status = EncounterStatus.DRAFT;
        if (initiativeOrder == null) initiativeOrder = new ArrayList<>();
    }
}
