package com.gm.combat.dto.ai;

import com.gm.combat.entity.AiConfig;

import java.math.BigDecimal;

/**
 * Never includes the raw or encrypted API key — only indicates whether one is stored.
 */
public record AiSettingsResponse(
        String provider,
        boolean hasKey,
        String modelName,
        int maxTokens,
        BigDecimal temperature
) {
    public static AiSettingsResponse from(AiConfig config) {
        return new AiSettingsResponse(
                config.getProvider(),
                config.getEncryptedApiKey() != null && !config.getEncryptedApiKey().isBlank(),
                config.getModelName(),
                config.getMaxTokens(),
                config.getTemperature()
        );
    }

    public static AiSettingsResponse empty() {
        return new AiSettingsResponse("NONE", false, null, 4096, new BigDecimal("0.70"));
    }
}
