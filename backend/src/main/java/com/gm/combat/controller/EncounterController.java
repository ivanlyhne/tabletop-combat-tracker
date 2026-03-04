package com.gm.combat.controller;

import com.gm.combat.dto.encounter.AddCombatantRequest;
import com.gm.combat.dto.encounter.EncounterRequest;
import com.gm.combat.dto.encounter.EncounterResponse;
import com.gm.combat.security.SecurityUtils;
import com.gm.combat.service.EncounterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class EncounterController {

    private final EncounterService encounterService;

    @GetMapping("/api/campaigns/{campaignId}/encounters")
    public List<EncounterResponse> listByCampaign(@PathVariable UUID campaignId) {
        return encounterService.findAll(campaignId, SecurityUtils.currentUserEmail());
    }

    @PostMapping("/api/campaigns/{campaignId}/encounters")
    @ResponseStatus(HttpStatus.CREATED)
    public EncounterResponse create(@PathVariable UUID campaignId,
                                    @Valid @RequestBody EncounterRequest request) {
        return encounterService.create(campaignId, SecurityUtils.currentUserEmail(), request);
    }

    @GetMapping("/api/encounters/{id}")
    public EncounterResponse getById(@PathVariable UUID id) {
        return encounterService.findById(id, SecurityUtils.currentUserEmail());
    }

    @PutMapping("/api/encounters/{id}")
    public EncounterResponse update(@PathVariable UUID id,
                                    @Valid @RequestBody EncounterRequest request) {
        return encounterService.update(id, SecurityUtils.currentUserEmail(), request);
    }

    @DeleteMapping("/api/encounters/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        encounterService.delete(id, SecurityUtils.currentUserEmail());
    }

    @PostMapping("/api/encounters/{id}/combatants")
    @ResponseStatus(HttpStatus.CREATED)
    public EncounterResponse addCombatant(@PathVariable UUID id,
                                          @RequestBody AddCombatantRequest request) {
        return encounterService.addCombatant(id, SecurityUtils.currentUserEmail(), request);
    }

    @DeleteMapping("/api/encounters/{id}/combatants/{combatantId}")
    public EncounterResponse removeCombatant(@PathVariable UUID id,
                                             @PathVariable UUID combatantId) {
        return encounterService.removeCombatant(id, combatantId, SecurityUtils.currentUserEmail());
    }
}
