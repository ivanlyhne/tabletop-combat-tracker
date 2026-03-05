package com.gm.combat.ai;

import java.util.Map;

/**
 * A single enemy type returned by the AI provider.
 */
public record GeneratedEnemy(
        String name,
        int count,
        String challengeRating,
        Map<String, Object> suggestedStats
) {}
