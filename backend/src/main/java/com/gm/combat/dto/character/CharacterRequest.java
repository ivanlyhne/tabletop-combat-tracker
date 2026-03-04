package com.gm.combat.dto.character;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.util.Map;

public record CharacterRequest(
        @NotBlank String name,
        String characterType,
        String ruleset,
        int initiativeModifier,
        @Min(1) int armorClass,
        @Min(1) int maxHp,
        int speed,
        Integer passivePerception,
        String notes,
        String externalId,
        Map<String, Object> extraAttributes
) {}
