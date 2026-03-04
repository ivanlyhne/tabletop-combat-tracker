package com.gm.combat.ai;

import java.util.List;

/**
 * Null-object provider used when no AI is configured.
 * Always throws {@link AiException} so callers can surface a clear message.
 */
public class NoneAiProvider implements AiProvider {

    @Override
    public String getProviderId() {
        return "NONE";
    }

    @Override
    public GeneratedEncounter generateEncounter(EncounterPrompt prompt) throws AiException {
        throw new AiException("No AI provider configured. Go to Settings → AI to add an API key.");
    }

    @Override
    public void validateKey() throws AiException {
        throw new AiException("No AI provider configured.");
    }
}
