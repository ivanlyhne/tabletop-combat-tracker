package com.gm.combat.controller;

import com.gm.combat.ai.AiException;
import com.gm.combat.ai.AiProvider;
import com.gm.combat.ai.AiProviderFactory;
import com.gm.combat.ai.EncounterPrompt;
import com.gm.combat.dto.ai.AiSettingsRequest;
import com.gm.combat.dto.ai.AiSettingsResponse;
import com.gm.combat.dto.ai.GenerateEncounterRequest;
import com.gm.combat.dto.ai.GenerateEncounterResponse;
import com.gm.combat.security.SecurityUtils;
import com.gm.combat.service.AiConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@Validated
public class AiSettingsController {

    private final AiConfigService aiConfigService;
    private final AiProviderFactory aiProviderFactory;

    // ── Settings ──────────────────────────────────────────────────────────────

    @GetMapping("/api/settings/ai")
    public AiSettingsResponse getSettings() {
        return aiConfigService.getSettings(SecurityUtils.currentUserEmail());
    }

    @PutMapping("/api/settings/ai")
    public AiSettingsResponse saveSettings(@Valid @RequestBody AiSettingsRequest req) {
        String email = SecurityUtils.currentUserEmail();

        // Validate new key if provided and provider is not NONE
        if (req.apiKey() != null && !req.apiKey().isBlank()
                && !"NONE".equalsIgnoreCase(req.provider())) {
            AiProvider tempProvider = aiProviderFactory.createWithKey(req.provider(), req.apiKey(), req.modelName());
            try {
                tempProvider.validateKey();
            } catch (AiException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "API key validation failed: " + e.getMessage());
            }
        }

        return aiConfigService.saveSettings(email, req);
    }

    @PostMapping("/api/settings/ai/test")
    public Map<String, String> testConnection() {
        String email = SecurityUtils.currentUserEmail();
        AiProvider provider = aiProviderFactory.createForUser(email);
        try {
            provider.validateKey();
            return Map.of("status", "ok", "provider", provider.getProviderId());
        } catch (AiException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    // ── Encounter generation ──────────────────────────────────────────────────

    @PostMapping("/api/ai/generate-encounter")
    @ResponseStatus(HttpStatus.OK)
    public GenerateEncounterResponse generateEncounter(@Valid @RequestBody GenerateEncounterRequest req) {
        String email = SecurityUtils.currentUserEmail();
        AiProvider provider = aiProviderFactory.createForUser(email);

        EncounterPrompt prompt = new EncounterPrompt(
                req.ruleset() != null ? req.ruleset() : "DND_5E",
                req.partyMembers(),
                req.environment(),
                req.difficultyTarget(),
                req.freeText(),
                req.maxEnemyCount() > 0 ? req.maxEnemyCount() : 8
        );

        try {
            return GenerateEncounterResponse.from(provider.generateEncounter(prompt));
        } catch (AiException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }
}
