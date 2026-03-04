package com.gm.combat.service;

import com.gm.combat.dto.ai.AiSettingsRequest;
import com.gm.combat.dto.ai.AiSettingsResponse;
import com.gm.combat.entity.AiConfig;
import com.gm.combat.repository.AiConfigRepository;
import com.gm.combat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.jasypt.encryption.StringEncryptor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class AiConfigService {

    private final AiConfigRepository aiConfigRepository;
    private final UserRepository userRepository;
    private final StringEncryptor encryptor;

    public AiSettingsResponse getSettings(String userEmail) {
        return aiConfigRepository.findByUserEmail(userEmail)
                .map(AiSettingsResponse::from)
                .orElse(AiSettingsResponse.empty());
    }

    /**
     * Save AI settings. If {@code req.apiKey()} is non-null, it is encrypted and stored.
     * Key validation (calling the real provider) is the caller's responsibility before saving.
     */
    public AiSettingsResponse saveSettings(String userEmail, AiSettingsRequest req) {
        UUID userId = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"))
                .getId();

        AiConfig config = aiConfigRepository.findByUserId(userId)
                .orElseGet(() -> {
                    AiConfig c = new AiConfig();
                    c.setUserId(userId);
                    return c;
                });

        config.setProvider(req.provider());
        if (req.modelName() != null) config.setModelName(req.modelName());
        if (req.maxTokens() != null) config.setMaxTokens(req.maxTokens());
        if (req.temperature() != null) config.setTemperature(req.temperature());

        // Encrypt and store key only when a new key is provided
        if (req.apiKey() != null && !req.apiKey().isBlank()) {
            config.setEncryptedApiKey(encryptor.encrypt(req.apiKey()));
        }

        // If switching to NONE, clear the key
        if ("NONE".equalsIgnoreCase(req.provider())) {
            config.setEncryptedApiKey(null);
        }

        if (config.getMaxTokens() == 0) config.setMaxTokens(4096);
        if (config.getTemperature() == null) config.setTemperature(new BigDecimal("0.70"));

        return AiSettingsResponse.from(aiConfigRepository.save(config));
    }

    public Optional<AiConfig> findByUserEmail(String userEmail) {
        return aiConfigRepository.findByUserEmail(userEmail);
    }

    /** Decrypt the stored API key. Never expose this outside the service layer. */
    public String decryptApiKey(AiConfig config) {
        if (config.getEncryptedApiKey() == null) return null;
        return encryptor.decrypt(config.getEncryptedApiKey());
    }
}
