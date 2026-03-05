package com.gm.combat.dto.encounter;

import jakarta.validation.constraints.NotBlank;

public record EncounterRequest(
        @NotBlank String name,
        String description,
        String objectives,
        String terrainNotes,
        String lootNotes,
        String ruleset,
        String environmentTag,
        String difficultyTarget,
        Integer boardWidthCells,
        Integer boardHeightCells) {}
