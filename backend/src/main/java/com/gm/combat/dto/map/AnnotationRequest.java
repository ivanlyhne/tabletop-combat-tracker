package com.gm.combat.dto.map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record AnnotationRequest(
        @NotBlank String annotationType,
        String label,
        @NotNull Map<String, Object> position,
        String color
) {}
