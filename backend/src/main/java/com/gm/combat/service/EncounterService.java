package com.gm.combat.service;

import com.gm.combat.dto.encounter.*;
import com.gm.combat.entity.Campaign;
import com.gm.combat.entity.Character;
import com.gm.combat.entity.Combatant;
import com.gm.combat.entity.CombatantStatus;
import com.gm.combat.entity.Encounter;
import com.gm.combat.entity.EncounterStatus;
import com.gm.combat.entity.Monster;
import com.gm.combat.entity.ConditionEntry;
import com.gm.combat.repository.*;
import com.gm.combat.ruleset.dnd5e.CombatantSummary;
import com.gm.combat.ruleset.dnd5e.Dnd5eDifficultyCalculator;
import com.gm.combat.ruleset.dnd5e.DifficultyResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.*;

@Service
@Transactional
@RequiredArgsConstructor
public class EncounterService {

    private final EncounterRepository encounterRepository;
    private final CombatantRepository combatantRepository;
    private final CampaignRepository campaignRepository;
    private final CharacterRepository characterRepository;
    private final MonsterRepository monsterRepository;
    private final Dnd5eDifficultyCalculator difficultyCalculator;

    @Transactional(readOnly = true)
    public List<EncounterResponse> findAll(UUID campaignId, String userEmail) {
        return encounterRepository.findByCampaignIdAndCampaignUserEmail(campaignId, userEmail)
                .stream()
                .map(e -> toResponse(e, combatantRepository.findByEncounterId(e.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public EncounterResponse findById(UUID id, String userEmail) {
        Encounter encounter = requireEncounter(id, userEmail);
        return toResponse(encounter, combatantRepository.findByEncounterId(id));
    }

    public EncounterResponse create(UUID campaignId, String userEmail, EncounterRequest request) {
        Campaign campaign = campaignRepository.findByIdAndUserEmail(campaignId, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        Encounter encounter = Encounter.builder()
                .campaign(campaign)
                .name(request.name())
                .description(request.description())
                .objectives(request.objectives())
                .terrainNotes(request.terrainNotes())
                .lootNotes(request.lootNotes())
                .ruleset(request.ruleset() != null ? request.ruleset() : "DND_5E")
                .status(EncounterStatus.DRAFT)
                .currentRound(0)
                .activeCombatantIndex(-1)
                .initiativeOrder(new ArrayList<>())
                .environmentTag(request.environmentTag())
                .difficultyTarget(request.difficultyTarget())
                .build();
        encounter = encounterRepository.save(encounter);
        return toResponse(encounter, List.of());
    }

    public EncounterResponse update(UUID id, String userEmail, EncounterRequest request) {
        Encounter encounter = requireEncounter(id, userEmail);
        encounter.setName(request.name());
        encounter.setDescription(request.description());
        encounter.setObjectives(request.objectives());
        encounter.setTerrainNotes(request.terrainNotes());
        encounter.setLootNotes(request.lootNotes());
        encounter.setEnvironmentTag(request.environmentTag());
        encounter.setDifficultyTarget(request.difficultyTarget());
        encounterRepository.save(encounter);
        return toResponse(encounter, combatantRepository.findByEncounterId(id));
    }

    public void delete(UUID id, String userEmail) {
        Encounter encounter = requireEncounter(id, userEmail);
        encounterRepository.delete(encounter);
    }

    public EncounterResponse addCombatant(UUID encounterId, String userEmail, AddCombatantRequest request) {
        Encounter encounter = requireEncounter(encounterId, userEmail);
        Combatant combatant = buildCombatant(encounter, request);
        combatantRepository.save(combatant);
        return toResponse(encounter, combatantRepository.findByEncounterId(encounterId));
    }

    public EncounterResponse removeCombatant(UUID encounterId, UUID combatantId, String userEmail) {
        Encounter encounter = requireEncounter(encounterId, userEmail);
        Combatant combatant = combatantRepository.findByIdAndEncounterId(combatantId, encounterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        combatantRepository.delete(combatant);
        return toResponse(encounter, combatantRepository.findByEncounterId(encounterId));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Encounter requireEncounter(UUID id, String userEmail) {
        return encounterRepository.findByIdAndCampaignUserEmail(id, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
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
                    .playerCharacter(true)
                    .visibleToPlayers(true)
                    .active(true)
                    .status(CombatantStatus.ALIVE)
                    .conditions(new ArrayList<>())
                    .tokenColor("#4a90e2")
                    .statsOverride(statsOverride)
                    .build();

        } else if ("MONSTER".equalsIgnoreCase(req.sourceType())) {
            Monster monster = monsterRepository.findById(req.sourceId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Monster not found"));

            if (monster.getChallengeRating() != null) {
                statsOverride.put("challengeRating", monster.getChallengeRating());
            }

            return Combatant.builder()
                    .encounter(encounter)
                    .monsterId(monster.getId())
                    .displayName(req.displayName() != null ? req.displayName() : monster.getName())
                    .initiativeValue(req.initiativeValue())
                    .initiativeModifier(req.initiativeModifier() != null ? req.initiativeModifier() : 0)
                    .currentHp(monster.getHpAverage())
                    .maxHp(monster.getHpAverage())
                    .tempHp(0)
                    .armorClass(monster.getArmorClass())
                    .playerCharacter(false)
                    .visibleToPlayers(true)
                    .active(true)
                    .status(CombatantStatus.ALIVE)
                    .conditions(new ArrayList<>())
                    .tokenColor("#e24a4a")
                    .statsOverride(statsOverride)
                    .build();

        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "sourceType must be CHARACTER or MONSTER");
        }
    }

    private EncounterResponse toResponse(Encounter encounter, List<Combatant> combatants) {
        DifficultyResponse difficulty = null;

        if ("DND_5E".equals(encounter.getRuleset())) {
            List<CombatantSummary> party = combatants.stream()
                    .filter(Combatant::isPlayerCharacter)
                    .map(c -> {
                        Object lvl = c.getStatsOverride().get("level");
                        int level = lvl instanceof Number n ? n.intValue() : 1;
                        return new CombatantSummary(true, level, null);
                    })
                    .toList();

            List<CombatantSummary> monsters = combatants.stream()
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
                    })
                    .toList();

            DifficultyResult result = difficultyCalculator.calculate(party, monsters);
            difficulty = DifficultyResponse.from(result);
        }

        return EncounterResponse.from(encounter, combatants, difficulty);
    }
}
