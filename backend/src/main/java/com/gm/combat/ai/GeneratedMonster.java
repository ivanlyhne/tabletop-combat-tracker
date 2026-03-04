package com.gm.combat.ai;

import java.util.Map;

/**
 * A single monster type returned by the AI provider.
 */
public record GeneratedMonster(
        String name,
        int count,
        String challengeRating,
        Map<String, Object> suggestedStats
) {}
