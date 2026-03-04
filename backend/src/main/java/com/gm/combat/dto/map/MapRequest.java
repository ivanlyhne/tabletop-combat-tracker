package com.gm.combat.dto.map;

import jakarta.validation.constraints.NotBlank;

public record MapRequest(
        @NotBlank String name,
        Integer widthCells,
        Integer heightCells,
        Integer cellSizePx,
        Integer cellSizeFt,
        String gridType,
        String gridColor
) {}
