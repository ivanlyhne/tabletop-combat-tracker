package com.gm.combat.dto.campaign;

import com.gm.combat.entity.Campaign;

import java.time.Instant;
import java.util.UUID;

public record CampaignResponse(
        UUID id,
        String name,
        String description,
        String ruleset,
        Instant createdAt,
        Instant updatedAt
) {
    public static CampaignResponse from(Campaign c) {
        return new CampaignResponse(
                c.getId(),
                c.getName(),
                c.getDescription(),
                c.getRuleset(),
                c.getCreatedAt(),
                c.getUpdatedAt());
    }
}
