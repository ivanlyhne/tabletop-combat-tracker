package com.gm.combat.dto.enemy;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record EnemyRequest(
        @NotBlank String name,
        String ruleset,
        BigDecimal challengeRating,
        Integer xpValue,
        @Min(1) int armorClass,
        String hpFormula,
        Integer hpAverage,
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
        Map<String, Object> extraAttributes
) {}
