package com.gm.combat.controller;

import com.gm.combat.dto.encounter.CombatantResponse;
import com.gm.combat.dto.encounter.DifficultyResponse;
import com.gm.combat.dto.encounter.EncounterResponse;
import com.gm.combat.entity.Encounter;
import com.gm.combat.repository.CombatantRepository;
import com.gm.combat.repository.EncounterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Public (no auth) read-only view for players.
 * Only combatants with visibleToPlayers=true are returned.
 * GM-only fields (lootNotes, terrainNotes, objectives) are omitted.
 * Permitted by SecurityConfig: /api/player/**
 */
@RestController
@RequestMapping("/api/player")
@RequiredArgsConstructor
public class PlayerController {

    private final EncounterRepository encounterRepository;
    private final CombatantRepository combatantRepository;

    @GetMapping("/encounters/{encounterId}")
    public EncounterResponse getEncounter(@PathVariable UUID encounterId) {
        Encounter encounter = encounterRepository.findById(encounterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        // Only return combatants visible to players
        List<CombatantResponse> visibleCombatants = combatantRepository
                .findByEncounterId(encounterId)
                .stream()
                .filter(c -> c.isVisibleToPlayers())
                .map(CombatantResponse::from)
                .toList();

        // Return response with stripped GM-only fields
        return new EncounterResponse(
                encounter.getId(),
                encounter.getCampaign().getId(),
                encounter.getMapId(),
                encounter.getName(),
                null,   // description — not shown to players
                null,   // objectives — GM only
                null,   // terrainNotes — GM only
                null,   // lootNotes — GM only
                encounter.getRuleset(),
                encounter.getStatus().name(),
                encounter.getCurrentRound(),
                encounter.getActiveCombatantIndex(),
                encounter.getInitiativeOrder(),
                encounter.getEnvironmentTag(),
                encounter.getDifficultyTarget(),
                visibleCombatants,
                null,   // difficulty — GM only
                encounter.getCreatedAt(),
                encounter.getUpdatedAt()
        );
    }
}
