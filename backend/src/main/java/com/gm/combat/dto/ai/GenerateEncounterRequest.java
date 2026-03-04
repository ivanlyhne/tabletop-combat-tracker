package com.gm.combat.dto.ai;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.List;

public record GenerateEncounterRequest(
        String ruleset,
        List<String> partyMembers,
        String environment,
        String difficultyTarget,
        String freeText,
        @Min(1) @Max(20) int maxMonsterCount
) {}
