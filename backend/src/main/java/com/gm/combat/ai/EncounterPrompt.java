package com.gm.combat.ai;

import java.util.List;

/**
 * Input to {@link AiProvider#generateEncounter}.
 *
 * @param ruleset         e.g. "DND_5E"
 * @param partyMembers    e.g. ["Fighter L5", "Wizard L5", "Cleric L5"]
 * @param environment     e.g. "dense forest", "underground dungeon"
 * @param difficultyTarget e.g. "MEDIUM", "HARD", "DEADLY"
 * @param freeText        any additional GM notes / narrative context
 * @param maxEnemyCount   upper bound on enemy variety (not total count)
 */
public record EncounterPrompt(
        String ruleset,
        List<String> partyMembers,
        String environment,
        String difficultyTarget,
        String freeText,
        int maxEnemyCount
) {}
