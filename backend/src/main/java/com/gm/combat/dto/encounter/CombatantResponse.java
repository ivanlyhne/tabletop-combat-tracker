package com.gm.combat.dto.encounter;

import com.gm.combat.entity.Combatant;
import com.gm.combat.entity.ConditionEntry;

import java.util.List;
import java.util.UUID;

public record CombatantResponse(
        UUID id,
        UUID encounterId,
        UUID characterId,
        UUID enemyId,
        String displayName,
        Integer initiativeValue,
        int initiativeModifier,
        int currentHp,
        int maxHp,
        int tempHp,
        int armorClass,
        boolean playerCharacter,
        boolean visibleToPlayers,
        boolean active,
        String status,
        List<ConditionEntry> conditions,
        Integer positionX,
        Integer positionY,
        String tokenColor,
        String tokenImageUrl) {

    public static CombatantResponse from(Combatant c) {
        return new CombatantResponse(
                c.getId(),
                c.getEncounter().getId(),
                c.getCharacterId(),
                c.getEnemyId(),
                c.getDisplayName(),
                c.getInitiativeValue(),
                c.getInitiativeModifier(),
                c.getCurrentHp(),
                c.getMaxHp(),
                c.getTempHp(),
                c.getArmorClass(),
                c.isPlayerCharacter(),
                c.isVisibleToPlayers(),
                c.isActive(),
                c.getStatus().name(),
                c.getConditions(),
                c.getPositionX(),
                c.getPositionY(),
                c.getTokenColor(),
                c.getTokenImageUrl());
    }
}
