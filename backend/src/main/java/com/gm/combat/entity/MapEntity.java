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

    @Column(name = "background_image_url")
    private String backgroundImageUrl;

    @Column(name = "width_cells", nullable = false)
    private int widthCells = 20;

    @Column(name = "height_cells", nullable = false)
    private int heightCells = 20;

    @Column(name = "cell_size_px", nullable = false)
    private int cellSizePx = 60;

    @Column(name = "cell_size_ft", nullable = false)
    private int cellSizeFt = 5;

    @Column(name = "grid_type", nullable = false)
    private String gridType = "SQUARE";

    @Column(name = "grid_color", nullable = false)
    private String gridColor = "#cccccc80";

    @CreationTimestamp
    @Column(name = "created_at")
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
