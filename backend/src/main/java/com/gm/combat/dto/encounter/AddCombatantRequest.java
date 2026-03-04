package com.gm.combat.dto.encounter;

import java.util.UUID;

public record AddCombatantRequest(
        String sourceType,
        UUID sourceId,
        String displayName,
        Integer initiativeValue,
        Integer initiativeModifier) {}
