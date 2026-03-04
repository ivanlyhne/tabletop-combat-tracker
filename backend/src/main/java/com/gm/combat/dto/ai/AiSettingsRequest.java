package com.gm.combat.dto.ai;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record AiSettingsRequest(
        @NotBlank String provider,
        /** Raw API key — encrypted before storage. Null means "keep existing key". */
        String apiKey,
        String modelName,
        Integer maxTokens,
        @DecimalMin("0.0") @DecimalMax("2.0") BigDecimal temperature
) {}
