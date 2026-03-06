package com.gm.combat.dto.ai;

public record GenerateEnemyApiRequest(
        String challengeRating,
        String ruleset
) {}
