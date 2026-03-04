package com.gm.combat.dto.ai;

import com.gm.combat.ai.GeneratedEncounter;
import com.gm.combat.ai.GeneratedMonster;

import java.util.List;
import java.util.Map;

public record GenerateEncounterResponse(
        String narrativeSummary,
        List<MonsterDto> monsters,
        List<String> terrainFeatures,
        List<String> suggestedPositions
) {
    public record MonsterDto(String name, int count, String challengeRating, Map<String, Object> suggestedStats) {}

    public static GenerateEncounterResponse from(GeneratedEncounter enc) {
        List<MonsterDto> monsters = enc.monsters().stream()
                .map(m -> new MonsterDto(m.name(), m.count(), m.challengeRating(), m.suggestedStats()))
                .toList();
        return new GenerateEncounterResponse(
                enc.narrativeSummary(), monsters, enc.terrainFeatures(), enc.suggestedPositions());
    }
}
