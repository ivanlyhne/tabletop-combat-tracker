package com.gm.combat.ai;

/**
 * Strategy interface for AI encounter generation providers.
 * Implementations are created per-request (not Spring beans) by {@link AiProviderFactory}.
 */
public interface AiProvider {

    /** Provider identifier stored in ai_configs.provider column. */
    String getProviderId();

    /**
     * Generate an encounter from the given prompt.
     *
     * @throws AiException on API or parsing failures
     */
    GeneratedEncounter generateEncounter(EncounterPrompt prompt) throws AiException;

    /**
     * Validate that the configured API key is accepted by the provider.
     * Performs a minimal real API call.
     *
     * @throws AiException if the key is invalid or the provider is unreachable
     */
    void validateKey() throws AiException;
}
