package com.gm.combat.service;

import com.gm.combat.dto.combat.AddConditionRequest;
import com.gm.combat.dto.encounter.AddCombatantRequest;
import com.gm.combat.dto.encounter.DifficultyResponse;
import com.gm.combat.dto.encounter.EncounterResponse;
import com.gm.combat.entity.Character;
import com.gm.combat.entity.Combatant;
import com.gm.combat.entity.CombatantStatus;
import com.gm.combat.entity.ConditionEntry;
import com.gm.combat.entity.Encounter;
import com.gm.combat.entity.EncounterStatus;
import com.gm.combat.entity.Enemy;
import com.gm.combat.repository.CampaignRepository;
import com.gm.combat.repository.CharacterRepository;
import com.gm.combat.repository.CombatantRepository;
import com.gm.combat.repository.EncounterRepository;
import com.gm.combat.repository.EnemyRepository;
import com.gm.combat.ruleset.dnd5e.CombatantSummary;
import com.gm.combat.ruleset.dnd5e.Dnd5eDifficultyCalculator;
import com.gm.combat.ruleset.dnd5e.DifficultyResult;
import com.gm.combat.websocket.CombatStateMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class CombatService {

    private final EncounterRepository encounterRepository;
    private final CombatantRepository combatantRepository;
    private final CharacterRepository characterRepository;
    private final EnemyRepository enemyRepository;
    private final Dnd5eDifficultyCalculator difficultyCalculator;
    private final SimpMessagingTemplate messagingTemplate;

    // ── Combat state transitions ──────────────────────────────────────────────

    public EncounterResponse startCombat(UUID encounterId, String userEmail) {
        Encounter encounter = requireEncounter(encounterId, userEmail);

        if (encounter.getStatus() == EncounterStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Combat already active");
        }
        if (encounter.getStatus() == EncounterStatus.ENDED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Encounter has ended");
        }

        List<Combatant> combatants = combatantRepository.findByEncounterId(encounterId);
        List<UUID> order = sortByInitiative(combatants);

        encounter.setInitiativeOrder(new ArrayList<>(order));
        encounter.setStatus(EncounterStatus.ACTIVE);
        encounter.setCurrentRound(1);
        encounter.setActiveCombatantIndex(0);
        encounterRepository.save(encounter);

        return broadcast(buildResponse(encounter, combatants), "COMBAT_STARTED");
    }

    public EncounterResponse nextTurn(UUID encounterId, String userEmail) {
        Encounter encounter = requireEncounter(encounterId, userEmail);
        requireStatus(encounter, EncounterStatus.ACTIVE);

        List<UUID> order = encounter.getInitiativeOrder();
        int size = order.size();
        if (size == 0) {
            return broadcast(
                    buildResponse(encounter, combatantRepository.findByEncounterId(encounterId)),
                    "TURN_ADVANCED");
        }

        // Load all combatants into a map for O(1) lookup
        Map<UUID, Combatant> combatantMap = combatantRepository.findByEncounterId(encounterId)
                .stream().collect(Collectors.toMap(Combatant::getId, c -> c));

        // Expire conditions on the currently-active combatant
        int currentIdx = encounter.getActiveCombatantIndex();
        if (currentIdx >= 0 && currentIdx < size) {
            UUID activeId = order.get(currentIdx);
            Combatant active = combatantMap.get(activeId);
            if (active != null) {
                expireConditions(active);
                combatantRepository.save(active);
                combatantMap.put(active.getId(), active);
            }
        }

        // Find next active slot, tracking round wraps
        boolean roundAdvanced = false;
        int nextIdx = currentIdx;
        for (int i = 1; i <= size; i++) {
            int candidate = (currentIdx + i) % size;
            if (candidate < currentIdx + i - size + 1 && candidate == 0) {
                // we wrapped — but only set flag once
            }
            if ((currentIdx + i) >= size && !roundAdvanced) {
                roundAdvanced = true;
            }
            UUID candidateId = order.get(candidate);
            Combatant c = combatantMap.get(candidateId);
            if (c != null && c.isActive()
                    && c.getStatus() != CombatantStatus.DEAD
                    && c.getStatus() != CombatantStatus.FLED) {
                nextIdx = candidate;
                break;
            }
        }

        encounter.setActiveCombatantIndex(nextIdx);
        if (roundAdvanced) {
            encounter.setCurrentRound(encounter.getCurrentRound() + 1);
        }
        encounterRepository.save(encounter);

        return broadcast(buildResponse(encounter, new ArrayList<>(combatantMap.values())), "TURN_ADVANCED");
    }

    public EncounterResponse pauseCombat(UUID encounterId, String userEmail) {
        Encounter encounter = requireEncounter(encounterId, userEmail);
        requireStatus(encounter, EncounterStatus.ACTIVE);
        encounter.setStatus(EncounterStatus.PAUSED);
        encounterRepository.save(encounter);
        return broadcast(
                buildResponse(encounter, combatantRepository.findByEncounterId(encounterId)),
                "COMBAT_PAUSED");
    }

    public EncounterResponse resumeCombat(UUID encounterId, String userEmail) {
        Encounter encounter = requireEncounter(encounterId, userEmail);
        requireStatus(encounter, EncounterStatus.PAUSED);
        encounter.setStatus(EncounterStatus.ACTIVE);
        encounterRepository.save(encounter);
        return broadcast(
                buildResponse(encounter, combatantRepository.findByEncounterId(encounterId)),
                "COMBAT_RESUMED");
    }

    public EncounterResponse endCombat(UUID encounterId, String userEmail) {
        Encounter encounter = requireEncounter(encounterId, userEmail);
        encounter.setStatus(EncounterStatus.ENDED);
        encounterRepository.save(encounter);
        return broadcast(
                buildResponse(encounter, combatantRepository.findByEncounterId(encounterId)),
                "COMBAT_ENDED");
    }

    // ── HP mutations ─────────────────────────────────────────────────────────

    public EncounterResponse applyDamage(UUID encounterId, UUID combatantId, int amount, String userEmail) {
        Encounter encounter = requireEncounter(encounterId, userEmail);
        Combatant combatant = requireCombatant(combatantId, encounterId);

        int remaining = amount;
        if (combatant.getTempHp() > 0) {
            int absorbed = Math.min(combatant.getTempHp(), remaining);
            combatant.setTempHp(combatant.getTempHp() - absorbed);
            remaining -= absorbed;
        }
        if (remaining > 0) {
            combatant.setCurrentHp(Math.max(0, combatant.getCurrentHp() - remaining));
        }

        if (combatant.getCurrentHp() == 0) {
            combatant.setStatus(combatant.isPlayerCharacter() ? CombatantStatus.DOWN : CombatantStatus.DEAD);
            if (combatant.getStatus() == CombatantStatus.DEAD) {
                combatant.setActive(false);
            }
        }

        combatantRepository.save(combatant);
        return broadcast(
                buildResponse(encounter, combatantRepository.findByEncounterId(encounterId)),
                "HP_CHANGED");
    }

    public EncounterResponse applyHealing(UUID encounterId, UUID combatantId, int amount, String userEmail) {
        Encounter encounter = requireEncounter(encounterId, userEmail);
        Combatant combatant = requireCombatant(combatantId, encounterId);

        combatant.setCurrentHp(Math.min(combatant.getMaxHp(), combatant.getCurrentHp() + amount));

        // If a downed PC receives healing, revive them
        if (combatant.getCurrentHp() > 0 && combatant.getStatus() == CombatantStatus.DOWN) {
            combatant.setStatus(CombatantStatus.ALIVE);
        }

        combatantRepository.save(combatant);
        return broadcast(
                buildResponse(encounter, combatantRepository.findByEncounterId(encounterId)),
                "HP_CHANGED");
    }

    public EncounterResponse setTempHp(UUID encounterId, UUID combatantId, int amount, String userEmail) {
        Encounter encounter = requireEncounter(encounterId, userEmail);
        Combatant combatant = requireCombatant(combatantId, encounterId);
        combatant.setTempHp(Math.max(0, amount));
        combatantRepository.save(combatant);
        return broadcast(
                buildResponse(encounter, combatantRepository.findByEncounterId(encounterId)),
                "TEMP_HP_CHANGED");
    }

    // ── Condition management ─────────────────────────────────────────────────

    public EncounterResponse addCondition(UUID encounterId, UUID combatantId,
                                          AddConditionRequest req, String userEmail) {
        Encounter encounter = requireEncounter(encounterId, userEmail);
        Combatant combatant = requireCombatant(combatantId, encounterId);

        List<ConditionEntry> conditions = new ArrayList<>(combatant.getConditions());
        conditions.removeIf(c -> c.name().equalsIgnoreCase(req.name())); // replace if exists
        conditions.add(new ConditionEntry(req.name(), req.durationRounds(), encounter.getCurrentRound()));
        combatant.setConditions(conditions);

        combatantRepository.save(combatant);
        return broadcast(
                buildResponse(encounter, combatantRepository.findByEncounterId(encounterId)),
                "CONDITION_ADDED");
    }

    public EncounterResponse removeCondition(UUID encounterId, UUID combatantId,
                                             String conditionName, String userEmail) {
        Encounter encounter = requireEncounter(encounterId, userEmail);
        Combatant combatant = requireCombatant(combatantId, encounterId);

        List<ConditionEntry> conditions = combatant.getConditions().stream()
                .filter(c -> !c.name().equalsIgnoreCase(conditionName))
                .collect(Collectors.toCollection(ArrayList::new));
        combatant.setConditions(conditions);

        combatantRepository.save(combatant);
        return broadcast(
                buildResponse(encounter, combatantRepository.findByEncounterId(encounterId)),
                "CONDITION_REMOVED");
    }

    // ── Position / Status / Initiative ───────────────────────────────────────

    public EncounterResponse setInitiative(UUID encounterId, UUID combatantId, int value, String userEmail) {
        Encounter encounter = requireEncounter(encounterId, userEmail);
        Combatant combatant = requireCombatant(combatantId, encounterId);
        combatant.setInitiativeValue(value);
        combatantRepository.save(combatant);

        // Re-sort initiative order if combat is active, keeping current active combatant
        if (encounter.getStatus() == EncounterStatus.ACTIVE
                && !encounter.getInitiativeOrder().isEmpty()) {
            UUID currentActiveId = encounter.getInitiativeOrder()
                    .get(encounter.getActiveCombatantIndex());
            List<Combatant> all = combatantRepository.findByEncounterId(encounterId);
            List<UUID> newOrder = sortByInitiative(all);
            encounter.setInitiativeOrder(new ArrayList<>(newOrder));
            int newIdx = newOrder.indexOf(currentActiveId);
            if (newIdx >= 0) encounter.setActiveCombatantIndex(newIdx);
            encounterRepository.save(encounter);
        }

        return broadcast(
                buildResponse(encounter, combatantRepository.findByEncounterId(encounterId)),
                "INITIATIVE_SET");
    }

    public EncounterResponse moveCombatant(UUID encounterId, UUID combatantId, int x, int y, String userEmail) {
        Encounter encounter = requireEncounter(encounterId, userEmail);
        Combatant combatant = requireCombatant(combatantId, encounterId);
        combatant.setPositionX(x);
        combatant.setPositionY(y);
        combatantRepository.save(combatant);
        return broadcast(
                buildResponse(encounter, combatantRepository.findByEncounterId(encounterId)),
                "COMBATANT_MOVED");
    }

    public EncounterResponse setStatus(UUID encounterId, UUID combatantId,
                                       CombatantStatus newStatus, String userEmail) {
        Encounter encounter = requireEncounter(encounterId, userEmail);
        Combatant combatant = requireCombatant(combatantId, encounterId);
        combatant.setStatus(newStatus);
        combatant.setActive(newStatus == CombatantStatus.ALIVE || newStatus == CombatantStatus.DOWN);
        combatantRepository.save(combatant);
        return broadcast(
                buildResponse(encounter, combatantRepository.findByEncounterId(encounterId)),
                "STATUS_CHANGED");
    }

    public EncounterResponse addCombatantMidFight(UUID encounterId, AddCombatantRequest req, String userEmail) {
        Encounter encounter = requireEncounter(encounterId, userEmail);
        Combatant combatant = buildCombatant(encounter, req);
        combatantRepository.save(combatant);

        // Insert into initiative order if combat is active
        if (encounter.getStatus() == EncounterStatus.ACTIVE) {
            List<UUID> order = new ArrayList<>(encounter.getInitiativeOrder());
            order.add(combatant.getId());
            encounter.setInitiativeOrder(order);
            encounterRepository.save(encounter);
        }

        return broadcast(
                buildResponse(encounter, combatantRepository.findByEncounterId(encounterId)),
                "COMBATANT_ADDED");
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Encounter requireEncounter(UUID id, String email) {
        return encounterRepository.findByIdAndCampaignUserEmail(id, email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private Combatant requireCombatant(UUID combatantId, UUID encounterId) {
        return combatantRepository.findByIdAndEncounterId(combatantId, encounterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Combatant not found"));
    }

    private void requireStatus(Encounter encounter, EncounterStatus expected) {
        if (encounter.getStatus() != expected) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Expected status " + expected + " but was " + encounter.getStatus());
        }
    }

    private void expireConditions(Combatant combatant) {
        List<ConditionEntry> updated = combatant.getConditions().stream()
                .map(c -> c.durationRounds() != null
                        ? new ConditionEntry(c.name(), c.durationRounds() - 1, c.appliedAtRound())
                        : c)
                .filter(c -> c.durationRounds() == null || c.durationRounds() > 0)
                .collect(Collectors.toCollection(ArrayList::new));
        combatant.setConditions(updated);
    }

    private List<UUID> sortByInitiative(List<Combatant> combatants) {
        return combatants.stream()
                .sorted(Comparator.comparingInt((Combatant c) ->
                                c.getInitiativeValue() != null ? c.getInitiativeValue() : Integer.MIN_VALUE)
                        .reversed())
                .map(Combatant::getId)
                .toList();
    }

    private EncounterResponse broadcast(EncounterResponse response, String eventType) {
        messagingTemplate.convertAndSend(
                "/topic/encounter/" + response.id(),
                new CombatStateMessage(response.id(), eventType, response));
        return response;
    }

    private Combatant buildCombatant(Encounter encounter, AddCombatantRequest req) {
        Map<String, Object> statsOverride = new HashMap<>();

        if ("CHARACTER".equalsIgnoreCase(req.sourceType())) {
            Character character = characterRepository.findById(req.sourceId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found"));
            Object level = character.getExtraAttributes().get("level");
            if (level != null) statsOverride.put("level", level);

            return Combatant.builder()
                    .encounter(encounter)
                    .characterId(character.getId())
                    .displayName(req.displayName() != null ? req.displayName() : character.getName())
                    .initiativeValue(req.initiativeValue())
                    .initiativeModifier(req.initiativeModifier() != null
                            ? req.initiativeModifier() : character.getInitiativeModifier())
                    .currentHp(character.getCurrentHp())
                    .maxHp(character.getMaxHp())
                    .tempHp(0)
                    .armorClass(character.getArmorClass())
                    .playerCharacter(true).visibleToPlayers(true).active(true)
                    .status(CombatantStatus.ALIVE).conditions(new ArrayList<>())
                    .tokenColor("#4a90e2").statsOverride(statsOverride).build();

        } else if ("ENEMY".equalsIgnoreCase(req.sourceType())) {
            Enemy enemy = enemyRepository.findById(req.sourceId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enemy not found"));
            if (enemy.getChallengeRating() != null) {
                statsOverride.put("challengeRating", enemy.getChallengeRating());
            }

            return Combatant.builder()
                    .encounter(encounter)
                    .enemyId(enemy.getId())
                    .displayName(req.displayName() != null ? req.displayName() : enemy.getName())
                    .initiativeValue(req.initiativeValue())
                    .initiativeModifier(req.initiativeModifier() != null ? req.initiativeModifier() : 0)
                    .currentHp(enemy.getHpAverage()).maxHp(enemy.getHpAverage()).tempHp(0)
                    .armorClass(enemy.getArmorClass())
                    .playerCharacter(false).visibleToPlayers(true).active(true)
                    .status(CombatantStatus.ALIVE).conditions(new ArrayList<>())
                    .tokenColor("#e24a4a").statsOverride(statsOverride).build();

        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sourceType must be CHARACTER or ENEMY");
        }
    }

    private EncounterResponse buildResponse(Encounter encounter, List<Combatant> combatants) {
        DifficultyResponse difficulty = null;
        if ("DND_5E".equals(encounter.getRuleset())) {
            List<CombatantSummary> party = combatants.stream()
                    .filter(Combatant::isPlayerCharacter)
                    .map(c -> {
                        Object lvl = c.getStatsOverride().get("level");
                        int level = lvl instanceof Number n ? n.intValue() : 1;
                        return new CombatantSummary(true, level, null);
                    }).toList();

            List<CombatantSummary> enemies = combatants.stream()
                    .filter(c -> !c.isPlayerCharacter() && c.isActive()
                            && c.getStatus() != CombatantStatus.DEAD)
                    .map(c -> {
                        Object cr = c.getStatsOverride().get("challengeRating");
                        BigDecimal challengeRating = switch (cr) {
                            case BigDecimal bd -> bd;
                            case Number n -> BigDecimal.valueOf(n.doubleValue());
                            default -> BigDecimal.ZERO;
                        };
                        return new CombatantSummary(false, null, challengeRating);
                    }).toList();

            DifficultyResult result = difficultyCalculator.calculate(party, enemies);
            difficulty = DifficultyResponse.from(result);
        }
        return EncounterResponse.from(encounter, combatants, difficulty);
    }
}
