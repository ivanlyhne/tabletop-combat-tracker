package com.gm.combat.dto.character;

import com.gm.combat.entity.Character;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record CharacterResponse(
        UUID id,
        UUID campaignId,
        String name,
        String characterType,
        String ruleset,
        int initiativeModifier,
        int armorClass,
        int maxHp,
        int currentHp,
        int tempHp,
        int speed,
        Integer passivePerception,
        String notes,
        String externalId,
        Map<String, Object> extraAttributes,
        Instant createdAt,
        Instant updatedAt
) {
    public static CharacterResponse from(Character c) {
        return new CharacterResponse(
                c.getId(),
                c.getCampaign().getId(),
                c.getName(),
                c.getCharacterType(),
                c.getRuleset(),
                c.getInitiativeModifier(),
                c.getArmorClass(),
                c.getMaxHp(),
                c.getCurrentHp(),
                c.getTempHp(),
                c.getSpeed(),
                c.getPassivePerception(),
                c.getNotes(),
                c.getExternalId(),
                c.getExtraAttributes(),
                c.getCreatedAt(),
                c.getUpdatedAt());
    }
}
