package com.gm.combat.dto.enemy;

import com.gm.combat.entity.Enemy;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record EnemyResponse(
        UUID id,
        UUID campaignId,
        String name,
        String ruleset,
        BigDecimal challengeRating,
        Integer xpValue,
        int armorClass,
        String hpFormula,
        int hpAverage,
        Map<String, Object> speed,
        Map<String, Object> savingThrows,
        Map<String, Object> skills,
        String[] damageResistances,
        String[] damageImmunities,
        String[] damageVulnerabilities,
        String[] conditionImmunities,
        List<Map<String, Object>> traits,
        List<Map<String, Object>> actions,
        String[] environmentTags,
        String externalId,
        Map<String, Object> extraAttributes,
        Instant createdAt,
        Instant updatedAt
) {
    public static EnemyResponse from(Enemy e) {
        return new EnemyResponse(
                e.getId(),
                e.getCampaign() != null ? e.getCampaign().getId() : null,
                e.getName(),
                e.getRuleset(),
                e.getChallengeRating(),
                e.getXpValue(),
                e.getArmorClass(),
                e.getHpFormula(),
                e.getHpAverage(),
                e.getSpeed(),
                e.getSavingThrows(),
                e.getSkills(),
                e.getDamageResistances(),
                e.getDamageImmunities(),
                e.getDamageVulnerabilities(),
                e.getConditionImmunities(),
                e.getTraits(),
                e.getActions(),
                e.getEnvironmentTags(),
                e.getExternalId(),
                e.getExtraAttributes(),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }
}
