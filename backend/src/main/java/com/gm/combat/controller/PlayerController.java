package com.gm.combat.controller;

import com.gm.combat.dto.encounter.CombatantResponse;
import com.gm.combat.dto.encounter.DifficultyResponse;
import com.gm.combat.dto.encounter.EncounterResponse;
import com.gm.combat.dto.map.AnnotationResponse;
import com.gm.combat.dto.map.MapResponse;
import com.gm.combat.entity.Encounter;
import com.gm.combat.repository.AnnotationRepository;
import com.gm.combat.repository.CombatantRepository;
import com.gm.combat.repository.EncounterRepository;
import com.gm.combat.repository.MapRepository;
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
    private final MapRepository mapRepository;
    private final AnnotationRepository annotationRepository;

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
                encounter.getBoardWidthCells(),
                encounter.getBoardHeightCells(),
                visibleCombatants,
                null,   // difficulty — GM only
                encounter.getCreatedAt(),
                encounter.getUpdatedAt()
        );
    }

    /** Public read-only map config for the player view. */
    @GetMapping("/maps/{mapId}")
    public MapResponse getMap(@PathVariable UUID mapId) {
        return MapResponse.from(
                mapRepository.findById(mapId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Map not found"))
        );
    }

    /** Public read-only annotations list for the player view. */
    @GetMapping("/encounters/{encounterId}/annotations")
    public List<AnnotationResponse> getAnnotations(@PathVariable UUID encounterId) {
        return annotationRepository.findByEncounterId(encounterId)
                .stream()
                .map(AnnotationResponse::from)
                .toList();
    }
}
