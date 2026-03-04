package com.gm.combat.dto.map;

import com.gm.combat.entity.MapEntity;

import java.time.Instant;
import java.util.UUID;

public record MapResponse(
        UUID id,
        UUID campaignId,
        String name,
        String backgroundImageUrl,
        int widthCells,
        int heightCells,
        int cellSizePx,
        int cellSizeFt,
        String gridType,
        String gridColor,
        Instant createdAt,
        Instant updatedAt
) {
    public static MapResponse from(MapEntity e) {
        return new MapResponse(
                e.getId(), e.getCampaignId(), e.getName(), e.getBackgroundImageUrl(),
                e.getWidthCells(), e.getHeightCells(), e.getCellSizePx(), e.getCellSizeFt(),
                e.getGridType(), e.getGridColor(), e.getCreatedAt(), e.getUpdatedAt()
        );
    }
}
