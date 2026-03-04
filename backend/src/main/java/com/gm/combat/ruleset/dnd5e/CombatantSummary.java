package com.gm.combat.ruleset.dnd5e;

import java.math.BigDecimal;

/**
 * Lightweight summary of a combatant used for difficulty calculation.
 * For PCs: level is required, challengeRating is ignored.
 * For monsters: challengeRating is required, level is ignored.
 */
public record CombatantSummary(boolean playerCharacter, Integer level, BigDecimal challengeRating) {}
