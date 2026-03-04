package com.gm.combat.service;

import com.gm.combat.dto.monster.MonsterRequest;
import com.gm.combat.dto.monster.MonsterResponse;
import com.gm.combat.entity.Campaign;
import com.gm.combat.entity.Monster;
import com.gm.combat.repository.CampaignRepository;
import com.gm.combat.repository.MonsterRepository;
import com.gm.combat.util.DiceParser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class MonsterService {

    private final MonsterRepository monsterRepository;
    private final CampaignRepository campaignRepository;

    private Campaign requireCampaign(UUID campaignId, String userEmail) {
        return campaignRepository.findByIdAndUserEmail(campaignId, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found"));
    }

    @Transactional(readOnly = true)
    public List<MonsterResponse> findByCampaign(UUID campaignId, String userEmail) {
        requireCampaign(campaignId, userEmail);
        return monsterRepository.findByCampaignId(campaignId)
                .stream().map(MonsterResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<MonsterResponse> findGlobal() {
        return monsterRepository.findByCampaignIsNull()
                .stream().map(MonsterResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public MonsterResponse findById(UUID campaignId, UUID id, String userEmail) {
        requireCampaign(campaignId, userEmail);
        return monsterRepository.findByIdAndCampaignId(id, campaignId)
                .map(MonsterResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Monster not found"));
    }

    public MonsterResponse create(UUID campaignId, MonsterRequest req, String userEmail) {
        Campaign campaign = requireCampaign(campaignId, userEmail);
        return MonsterResponse.from(monsterRepository.save(buildMonster(req, campaign)));
    }

    public MonsterResponse update(UUID campaignId, UUID id, MonsterRequest req, String userEmail) {
        requireCampaign(campaignId, userEmail);
        Monster monster = monsterRepository.findByIdAndCampaignId(id, campaignId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Monster not found"));
        applyRequest(monster, req);
        return MonsterResponse.from(monsterRepository.save(monster));
    }

    public void delete(UUID campaignId, UUID id, String userEmail) {
        requireCampaign(campaignId, userEmail);
        Monster monster = monsterRepository.findByIdAndCampaignId(id, campaignId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Monster not found"));
        monsterRepository.delete(monster);
    }

    public List<MonsterResponse> duplicate(UUID campaignId, UUID id, int count, String userEmail) {
        Campaign campaign = requireCampaign(campaignId, userEmail);
        Monster source = monsterRepository.findByIdAndCampaignId(id, campaignId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Monster not found"));
        List<Monster> copies = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            Monster copy = Monster.builder()
                    .campaign(campaign)
                    .name(source.getName() + " " + i)
                    .ruleset(source.getRuleset())
                    .challengeRating(source.getChallengeRating())
                    .xpValue(source.getXpValue())
                    .armorClass(source.getArmorClass())
                    .hpFormula(source.getHpFormula())
                    .hpAverage(source.getHpAverage())
                    .speed(source.getSpeed() != null ? new HashMap<>(source.getSpeed()) : new HashMap<>())
                    .savingThrows(source.getSavingThrows() != null ? new HashMap<>(source.getSavingThrows()) : new HashMap<>())
                    .skills(source.getSkills() != null ? new HashMap<>(source.getSkills()) : new HashMap<>())
                    .damageResistances(source.getDamageResistances() != null ? source.getDamageResistances().clone() : new String[0])
                    .damageImmunities(source.getDamageImmunities() != null ? source.getDamageImmunities().clone() : new String[0])
                    .damageVulnerabilities(source.getDamageVulnerabilities() != null ? source.getDamageVulnerabilities().clone() : new String[0])
                    .conditionImmunities(source.getConditionImmunities() != null ? source.getConditionImmunities().clone() : new String[0])
                    .traits(source.getTraits() != null ? new ArrayList<>(source.getTraits()) : new ArrayList<>())
                    .actions(source.getActions() != null ? new ArrayList<>(source.getActions()) : new ArrayList<>())
                    .environmentTags(source.getEnvironmentTags() != null ? source.getEnvironmentTags().clone() : new String[0])
                    .externalId(source.getExternalId())
                    .extraAttributes(source.getExtraAttributes() != null ? new HashMap<>(source.getExtraAttributes()) : new HashMap<>())
                    .build();
            copies.add(copy);
        }
        return monsterRepository.saveAll(copies).stream().map(MonsterResponse::from).toList();
    }

    private Monster buildMonster(MonsterRequest req, Campaign campaign) {
        int hpAvg = req.hpAverage() > 0 ? req.hpAverage() : DiceParser.average(req.hpFormula());
        return Monster.builder()
                .campaign(campaign)
                .name(req.name())
                .ruleset(req.ruleset() != null ? req.ruleset() : "DND_5E")
                .challengeRating(req.challengeRating())
                .xpValue(req.xpValue())
                .armorClass(req.armorClass() > 0 ? req.armorClass() : 10)
                .hpFormula(req.hpFormula())
                .hpAverage(hpAvg)
                .speed(req.speed() != null ? req.speed() : new HashMap<>())
                .savingThrows(req.savingThrows() != null ? req.savingThrows() : new HashMap<>())
                .skills(req.skills() != null ? req.skills() : new HashMap<>())
                .damageResistances(req.damageResistances() != null ? req.damageResistances() : new String[0])
                .damageImmunities(req.damageImmunities() != null ? req.damageImmunities() : new String[0])
                .damageVulnerabilities(req.damageVulnerabilities() != null ? req.damageVulnerabilities() : new String[0])
                .conditionImmunities(req.conditionImmunities() != null ? req.conditionImmunities() : new String[0])
                .traits(req.traits() != null ? req.traits() : new ArrayList<>())
                .actions(req.actions() != null ? req.actions() : new ArrayList<>())
                .environmentTags(req.environmentTags() != null ? req.environmentTags() : new String[0])
                .externalId(req.externalId())
                .extraAttributes(req.extraAttributes() != null ? req.extraAttributes() : new HashMap<>())
                .build();
    }

    private void applyRequest(Monster monster, MonsterRequest req) {
        monster.setName(req.name());
        if (req.ruleset() != null) monster.setRuleset(req.ruleset());
        monster.setChallengeRating(req.challengeRating());
        monster.setXpValue(req.xpValue());
        if (req.armorClass() > 0) monster.setArmorClass(req.armorClass());
        monster.setHpFormula(req.hpFormula());
        int hpAvg = req.hpAverage() > 0 ? req.hpAverage() : DiceParser.average(req.hpFormula());
        monster.setHpAverage(hpAvg);
        if (req.speed() != null) monster.setSpeed(req.speed());
        if (req.savingThrows() != null) monster.setSavingThrows(req.savingThrows());
        if (req.skills() != null) monster.setSkills(req.skills());
        if (req.damageResistances() != null) monster.setDamageResistances(req.damageResistances());
        if (req.damageImmunities() != null) monster.setDamageImmunities(req.damageImmunities());
        if (req.damageVulnerabilities() != null) monster.setDamageVulnerabilities(req.damageVulnerabilities());
        if (req.conditionImmunities() != null) monster.setConditionImmunities(req.conditionImmunities());
        if (req.traits() != null) monster.setTraits(req.traits());
        if (req.actions() != null) monster.setActions(req.actions());
        if (req.environmentTags() != null) monster.setEnvironmentTags(req.environmentTags());
        monster.setExternalId(req.externalId());
        if (req.extraAttributes() != null) monster.setExtraAttributes(req.extraAttributes());
    }
}
