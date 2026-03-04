package com.gm.combat.dto.monster;

import com.gm.combat.entity.Monster;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record MonsterResponse(
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
    public static MonsterResponse from(Monster m) {
        return new MonsterResponse(
                m.getId(),
                m.getCampaign() != null ? m.getCampaign().getId() : null,
                m.getName(),
                m.getRuleset(),
                m.getChallengeRating(),
                m.getXpValue(),
                m.getArmorClass(),
                m.getHpFormula(),
                m.getHpAverage(),
                m.getSpeed(),
                m.getSavingThrows(),
                m.getSkills(),
                m.getDamageResistances(),
                m.getDamageImmunities(),
                m.getDamageVulnerabilities(),
                m.getConditionImmunities(),
                m.getTraits(),
                m.getActions(),
                m.getEnvironmentTags(),
                m.getExternalId(),
                m.getExtraAttributes(),
                m.getCreatedAt(),
                m.getUpdatedAt());
    }
}
