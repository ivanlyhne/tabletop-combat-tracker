package com.gm.combat.dto.ai;

import java.util.List;

public record GenerateEncounterRequest(
        String ruleset,
        List<String> partyMembers,
        String environment,
        String difficultyTarget,
        String freeText,
        int maxMonsterCount
) {}
