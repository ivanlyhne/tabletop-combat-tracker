package com.gm.combat.websocket;

import com.gm.combat.dto.encounter.EncounterResponse;

import java.util.UUID;

/**
 * Payload broadcast to /topic/encounter/{id} after every combat mutation.
 */
public record CombatStateMessage(
        UUID encounterId,
        String eventType,        // COMBAT_STARTED, TURN_ADVANCED, HP_CHANGED, …
        EncounterResponse encounterState) {}
