package com.gm.combat.ai;

/**
 * Returned by {@link AiProvider#generateEnemy}.
 */
public record GenerateEnemyResult(
        String name,
        String challengeRating,
        Integer xpValue,
        String hpFormula,
        int armorClass,
        int walkSpeed,
        String description
) {}
