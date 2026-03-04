package com.gm.combat.ai;

import java.util.List;

/**
 * Output of {@link AiProvider#generateEncounter}.
 */
public record GeneratedEncounter(
        String narrativeSummary,
        List<GeneratedMonster> monsters,
        List<String> terrainFeatures,
        List<String> suggestedPositions,
        String rawAiResponse
) {}
