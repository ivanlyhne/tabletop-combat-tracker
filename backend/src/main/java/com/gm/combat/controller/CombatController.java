package com.gm.combat.controller;

import com.gm.combat.dto.combat.*;
import com.gm.combat.dto.encounter.AddCombatantRequest;
import com.gm.combat.dto.encounter.EncounterResponse;
import com.gm.combat.entity.CombatantStatus;
import com.gm.combat.security.SecurityUtils;
import com.gm.combat.service.CombatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/encounters/{encounterId}/combat")
@RequiredArgsConstructor
@Validated
public class CombatController {

    private final CombatService combatService;

    // ── Combat lifecycle ──────────────────────────────────────────────────────

    @PostMapping("/start")
    public EncounterResponse start(@PathVariable UUID encounterId) {
        return combatService.startCombat(encounterId, SecurityUtils.currentUserEmail());
    }

    @PostMapping("/next-turn")
    public EncounterResponse nextTurn(@PathVariable UUID encounterId) {
        return combatService.nextTurn(encounterId, SecurityUtils.currentUserEmail());
    }

    @PostMapping("/pause")
    public EncounterResponse pause(@PathVariable UUID encounterId) {
        return combatService.pauseCombat(encounterId, SecurityUtils.currentUserEmail());
    }

    @PostMapping("/resume")
    public EncounterResponse resume(@PathVariable UUID encounterId) {
        return combatService.resumeCombat(encounterId, SecurityUtils.currentUserEmail());
    }

    @PostMapping("/end")
    public EncounterResponse end(@PathVariable UUID encounterId) {
        return combatService.endCombat(encounterId, SecurityUtils.currentUserEmail());
    }

    // ── HP mutations ─────────────────────────────────────────────────────────

    @PatchMapping("/combatants/{combatantId}/damage")
    public EncounterResponse damage(@PathVariable UUID encounterId,
                                    @PathVariable UUID combatantId,
                                    @RequestBody ValueRequest req) {
        return combatService.applyDamage(encounterId, combatantId, req.amount(),
                SecurityUtils.currentUserEmail());
    }

    @PatchMapping("/combatants/{combatantId}/heal")
    public EncounterResponse heal(@PathVariable UUID encounterId,
                                  @PathVariable UUID combatantId,
                                  @RequestBody ValueRequest req) {
        return combatService.applyHealing(encounterId, combatantId, req.amount(),
                SecurityUtils.currentUserEmail());
    }

    @PatchMapping("/combatants/{combatantId}/temp-hp")
    public EncounterResponse tempHp(@PathVariable UUID encounterId,
                                    @PathVariable UUID combatantId,
                                    @RequestBody ValueRequest req) {
        return combatService.setTempHp(encounterId, combatantId, req.amount(),
                SecurityUtils.currentUserEmail());
    }

    // ── Conditions ───────────────────────────────────────────────────────────

    @PostMapping("/combatants/{combatantId}/conditions")
    @ResponseStatus(HttpStatus.CREATED)
    public EncounterResponse addCondition(@PathVariable UUID encounterId,
                                          @PathVariable UUID combatantId,
                                          @RequestBody AddConditionRequest req) {
        return combatService.addCondition(encounterId, combatantId, req,
                SecurityUtils.currentUserEmail());
    }

    @DeleteMapping("/combatants/{combatantId}/conditions/{name}")
    public EncounterResponse removeCondition(@PathVariable UUID encounterId,
                                             @PathVariable UUID combatantId,
                                             @PathVariable String name) {
        return combatService.removeCondition(encounterId, combatantId, name,
                SecurityUtils.currentUserEmail());
    }

    // ── Initiative / Position / Status ───────────────────────────────────────

    @PatchMapping("/combatants/{combatantId}/initiative")
    public EncounterResponse initiative(@PathVariable UUID encounterId,
                                        @PathVariable UUID combatantId,
                                        @RequestBody InitiativeRequest req) {
        return combatService.setInitiative(encounterId, combatantId, req.value(),
                SecurityUtils.currentUserEmail());
    }

    @PatchMapping("/combatants/{combatantId}/move")
    public EncounterResponse move(@PathVariable UUID encounterId,
                                  @PathVariable UUID combatantId,
                                  @RequestBody MoveRequest req) {
        return combatService.moveCombatant(encounterId, combatantId, req.x(), req.y(),
                SecurityUtils.currentUserEmail());
    }

    @PatchMapping("/combatants/{combatantId}/status")
    public EncounterResponse status(@PathVariable UUID encounterId,
                                    @PathVariable UUID combatantId,
                                    @Valid @RequestBody StatusRequest req) {
        CombatantStatus newStatus = CombatantStatus.valueOf(req.status().toUpperCase());
        return combatService.setStatus(encounterId, combatantId, newStatus,
                SecurityUtils.currentUserEmail());
    }

    // ── Mid-fight additions ───────────────────────────────────────────────────

    @PostMapping("/combatants")
    @ResponseStatus(HttpStatus.CREATED)
    public EncounterResponse addCombatant(@PathVariable UUID encounterId,
                                          @RequestBody AddCombatantRequest req) {
        return combatService.addCombatantMidFight(encounterId, req, SecurityUtils.currentUserEmail());
    }
}
