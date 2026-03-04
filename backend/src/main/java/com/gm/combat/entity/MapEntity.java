package com.gm.combat.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "maps")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MapEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "campaign_id", nullable = false)
    private UUID campaignId;

    @Column(nullable = false)
    private String name;

    private String backgroundImageUrl;

    @Column(nullable = false)
    private int widthCells = 20;

    @Column(nullable = false)
    private int heightCells = 20;

    @Column(nullable = false)
    private int cellSizePx = 60;

    @Column(nullable = false)
    private int cellSizeFt = 5;

    @Column(nullable = false)
    private String gridType = "SQUARE";

    @Column(nullable = false)
    private String gridColor = "#cccccc80";

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
