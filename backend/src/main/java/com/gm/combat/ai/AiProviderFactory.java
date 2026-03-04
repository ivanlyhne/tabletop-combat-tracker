package com.gm.combat.ai;

import com.gm.combat.entity.AiConfig;
import com.gm.combat.service.AiConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Creates {@link AiProvider} instances bound to the current user's stored config.
 * Providers are plain Java objects (not Spring beans) created per-request.
 */
@Service
@RequiredArgsConstructor
public class AiProviderFactory {

    private final AiConfigService aiConfigService;

    /** Create a provider using the stored config for the given user. */
    public AiProvider createForUser(String userEmail) {
        return aiConfigService.findByUserEmail(userEmail)
                .map(config -> buildProvider(
                        config.getProvider(),
                        aiConfigService.decryptApiKey(config),
                        config.getModelName(),
                        config.getMaxTokens()))
                .orElse(new NoneAiProvider());
    }

    /**
     * Create a provider with an explicit API key (used for key validation before saving).
     */
    public AiProvider createWithKey(String provider, String rawApiKey, String modelName) {
        return buildProvider(provider, rawApiKey, modelName, 4096);
    }

    private AiProvider buildProvider(String provider, String apiKey, String modelName, int maxTokens) {
        if (apiKey == null || apiKey.isBlank()) return new NoneAiProvider();
        return switch (provider != null ? provider.toUpperCase() : "") {
            case "CLAUDE"      -> new ClaudeAiProvider(apiKey, modelName, maxTokens);
            case "PERPLEXITY"  -> new PerplexityAiProvider(apiKey, modelName, maxTokens);
            default            -> new NoneAiProvider();
        };
    }
}
