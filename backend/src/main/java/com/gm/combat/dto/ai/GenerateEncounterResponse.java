package com.gm.combat.dto.ai;

import com.gm.combat.ai.GeneratedEncounter;
import com.gm.combat.ai.GeneratedEnemy;

import java.util.List;
import java.util.Map;

public record GenerateEncounterResponse(
        String narrativeSummary,
        List<EnemyDto> enemies,
        List<String> terrainFeatures,
        List<String> suggestedPositions
) {
    public record EnemyDto(String name, int count, String challengeRating, Map<String, Object> suggestedStats) {}

    public static GenerateEncounterResponse from(GeneratedEncounter enc) {
        List<EnemyDto> enemies = enc.enemies().stream()
                .map(e -> new EnemyDto(e.name(), e.count(), e.challengeRating(), e.suggestedStats()))
                .toList();
        return new GenerateEncounterResponse(
                enc.narrativeSummary(), enemies, enc.terrainFeatures(), enc.suggestedPositions());
    }
}
