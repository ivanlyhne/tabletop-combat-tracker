package com.gm.combat.service;

import com.gm.combat.dto.enemy.EnemyRequest;
import com.gm.combat.dto.enemy.EnemyResponse;
import com.gm.combat.entity.Campaign;
import com.gm.combat.entity.Enemy;
import com.gm.combat.repository.CampaignRepository;
import com.gm.combat.repository.EnemyRepository;
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
public class EnemyService {

    private final EnemyRepository enemyRepository;
    private final CampaignRepository campaignRepository;

    private Campaign requireCampaign(UUID campaignId, String userEmail) {
        return campaignRepository.findByIdAndUserEmail(campaignId, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found"));
    }

    @Transactional(readOnly = true)
    public List<EnemyResponse> findByCampaign(UUID campaignId, String userEmail) {
        requireCampaign(campaignId, userEmail);
        return enemyRepository.findByCampaignId(campaignId)
                .stream().map(EnemyResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<EnemyResponse> findGlobal() {
        return enemyRepository.findByCampaignIsNull()
                .stream().map(EnemyResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public EnemyResponse findById(UUID campaignId, UUID id, String userEmail) {
        requireCampaign(campaignId, userEmail);
        return enemyRepository.findByIdAndCampaignId(id, campaignId)
                .map(EnemyResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enemy not found"));
    }

    public EnemyResponse create(UUID campaignId, EnemyRequest req, String userEmail) {
        Campaign campaign = requireCampaign(campaignId, userEmail);
        return EnemyResponse.from(enemyRepository.save(buildEnemy(req, campaign)));
    }

    public EnemyResponse update(UUID campaignId, UUID id, EnemyRequest req, String userEmail) {
        requireCampaign(campaignId, userEmail);
        Enemy enemy = enemyRepository.findByIdAndCampaignId(id, campaignId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enemy not found"));
        applyRequest(enemy, req);
        return EnemyResponse.from(enemyRepository.save(enemy));
    }

    public void delete(UUID campaignId, UUID id, String userEmail) {
        requireCampaign(campaignId, userEmail);
        Enemy enemy = enemyRepository.findByIdAndCampaignId(id, campaignId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enemy not found"));
        enemyRepository.delete(enemy);
    }

    public List<EnemyResponse> duplicate(UUID campaignId, UUID id, int count, String userEmail) {
        Campaign campaign = requireCampaign(campaignId, userEmail);
        Enemy source = enemyRepository.findByIdAndCampaignId(id, campaignId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enemy not found"));
        List<Enemy> copies = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            Enemy copy = Enemy.builder()
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
        return enemyRepository.saveAll(copies).stream().map(EnemyResponse::from).toList();
    }

    private Enemy buildEnemy(EnemyRequest req, Campaign campaign) {
        int hpAvg = req.hpAverage() != null ? req.hpAverage() : DiceParser.average(req.hpFormula());
        return Enemy.builder()
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

    private void applyRequest(Enemy enemy, EnemyRequest req) {
        enemy.setName(req.name());
        if (req.ruleset() != null) enemy.setRuleset(req.ruleset());
        enemy.setChallengeRating(req.challengeRating());
        enemy.setXpValue(req.xpValue());
        if (req.armorClass() > 0) enemy.setArmorClass(req.armorClass());
        enemy.setHpFormula(req.hpFormula());
        int computedHpAverage = req.hpAverage() != null
                ? req.hpAverage()
                : DiceParser.average(req.hpFormula());
        enemy.setHpAverage(computedHpAverage);
        if (req.speed() != null) enemy.setSpeed(req.speed());
        if (req.savingThrows() != null) enemy.setSavingThrows(req.savingThrows());
        if (req.skills() != null) enemy.setSkills(req.skills());
        if (req.damageResistances() != null) enemy.setDamageResistances(req.damageResistances());
        if (req.damageImmunities() != null) enemy.setDamageImmunities(req.damageImmunities());
        if (req.damageVulnerabilities() != null) enemy.setDamageVulnerabilities(req.damageVulnerabilities());
        if (req.conditionImmunities() != null) enemy.setConditionImmunities(req.conditionImmunities());
        if (req.traits() != null) enemy.setTraits(req.traits());
        if (req.actions() != null) enemy.setActions(req.actions());
        if (req.environmentTags() != null) enemy.setEnvironmentTags(req.environmentTags());
        enemy.setExternalId(req.externalId());
        if (req.extraAttributes() != null) enemy.setExtraAttributes(req.extraAttributes());
    }
}
