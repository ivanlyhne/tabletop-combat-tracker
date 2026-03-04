package com.gm.combat.dto.encounter;

import com.gm.combat.entity.Combatant;
import com.gm.combat.entity.Encounter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record EncounterResponse(
        UUID id,
        UUID campaignId,
        UUID mapId,
        String name,
        String description,
        String objectives,
        String terrainNotes,
        String lootNotes,
        String ruleset,
        String status,
        int currentRound,
        int activeCombatantIndex,
        List<UUID> initiativeOrder,
        String environmentTag,
        String difficultyTarget,
        List<CombatantResponse> combatants,
        DifficultyResponse difficulty,
        Instant createdAt,
        Instant updatedAt) {

    public static EncounterResponse from(Encounter e, List<Combatant> combatants, DifficultyResponse difficulty) {
        return new EncounterResponse(
                e.getId(),
                e.getCampaign().getId(),
                e.getMapId(),
                e.getName(),
                e.getDescription(),
                e.getObjectives(),
                e.getTerrainNotes(),
                e.getLootNotes(),
                e.getRuleset(),
                e.getStatus().name(),
                e.getCurrentRound(),
                e.getActiveCombatantIndex(),
                e.getInitiativeOrder(),
                e.getEnvironmentTag(),
                e.getDifficultyTarget(),
                combatants.stream().map(CombatantResponse::from).toList(),
                difficulty,
                e.getCreatedAt(),
                e.getUpdatedAt());
    }
}
