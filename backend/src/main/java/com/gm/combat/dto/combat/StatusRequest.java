package com.gm.combat.dto.combat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record StatusRequest(
        @NotBlank
        @Pattern(
                regexp = "(?i)^(ALIVE|DOWN|DEAD|FLED)$",
                message = "status must be one of: ALIVE, DOWN, DEAD, FLED"
        )
        String status
) {}
