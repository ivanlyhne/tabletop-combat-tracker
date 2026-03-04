package com.gm.combat.dto.encounter;

import com.gm.combat.ruleset.dnd5e.DifficultyResult;

public record DifficultyResponse(String level, int adjustedXp, int rawXp) {

    public static DifficultyResponse from(DifficultyResult r) {
        return new DifficultyResponse(r.level().name(), r.adjustedXp(), r.rawXp());
    }
}
