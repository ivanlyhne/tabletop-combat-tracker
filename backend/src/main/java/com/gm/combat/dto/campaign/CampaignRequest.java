package com.gm.combat.dto.campaign;

import jakarta.validation.constraints.NotBlank;

public record CampaignRequest(
        @NotBlank String name,
        String description,
        String ruleset
) {}
