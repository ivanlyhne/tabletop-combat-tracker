package com.gm.combat.service;

import com.gm.combat.dto.ai.AiSettingsRequest;
import com.gm.combat.entity.AiConfig;
import com.gm.combat.entity.User;
import com.gm.combat.repository.AiConfigRepository;
import com.gm.combat.repository.UserRepository;
import org.jasypt.encryption.StringEncryptor;
import org.jasypt.encryption.pbe.StandardPBEStringEncryptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AiConfigService encryption/decryption logic.
 * Uses a real StandardPBEStringEncryptor — no Spring context, no database.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AiConfigService")
class AiConfigServiceTest {

    @Mock
    private AiConfigRepository aiConfigRepository;

    @Mock
    private UserRepository userRepository;

    private AiConfigService service;
    private StringEncryptor encryptor;

    private static final String TEST_PASSWORD = "test-jasypt-password-for-unit-tests";
    private static final String TEST_EMAIL    = "test@example.com";
    private static final UUID   TEST_USER_ID  = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        // StandardPBEStringEncryptor implements StringEncryptor — no Spring context needed
        StandardPBEStringEncryptor pbeEncryptor = new StandardPBEStringEncryptor();
        pbeEncryptor.setPassword(TEST_PASSWORD);
        this.encryptor = pbeEncryptor;

        service = new AiConfigService(aiConfigRepository, userRepository, encryptor);
    }

    // ── Encryption round-trip ─────────────────────────────────────────────────

    @Test
    @DisplayName("encrypt then decrypt returns original plaintext")
    void encryptDecryptRoundTrip() {
        String plaintext = "sk-ant-api03-test-key-abc123";
        String ciphertext = encryptor.encrypt(plaintext);

        assertThat(ciphertext).isNotBlank();
        assertThat(ciphertext).isNotEqualTo(plaintext);
        assertThat(encryptor.decrypt(ciphertext)).isEqualTo(plaintext);
    }

    @Test
    @DisplayName("Encrypted ciphertext differs from plaintext")
    void encrypt_producesDistinctCiphertext() {
        String key = "my-secret-api-key";
        assertThat(encryptor.encrypt(key)).isNotEqualTo(key);
    }

    // ── saveSettings: key handling ─────────────────────────────────────────────

    @Test
    @DisplayName("saveSettings with non-blank apiKey encrypts and stores it")
    void saveSettings_withApiKey_storesEncryptedKey() {
        User mockUser = User.builder().id(TEST_USER_ID).email(TEST_EMAIL)
                .passwordHash("hash").build();
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(mockUser));
        when(aiConfigRepository.findByUserId(TEST_USER_ID)).thenReturn(Optional.empty());
        when(aiConfigRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AiSettingsRequest req = new AiSettingsRequest("CLAUDE", "my-raw-api-key", null, null, null);
        service.saveSettings(TEST_EMAIL, req);

        verify(aiConfigRepository).save(argThat(saved -> {
            String stored = saved.getEncryptedApiKey();
            // Stored value must exist and not equal the raw plaintext key
            return stored != null && !stored.equals("my-raw-api-key");
        }));
    }

    @Test
    @DisplayName("saveSettings with null apiKey does NOT overwrite existing encrypted key")
    void saveSettings_nullApiKey_keepsExistingKey() {
        User mockUser = User.builder().id(TEST_USER_ID).email(TEST_EMAIL)
                .passwordHash("hash").build();
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(mockUser));

        AiConfig existing = new AiConfig();
        existing.setUserId(TEST_USER_ID);
        existing.setProvider("CLAUDE");
        existing.setEncryptedApiKey("previously-encrypted-value");
        when(aiConfigRepository.findByUserId(TEST_USER_ID)).thenReturn(Optional.of(existing));
        when(aiConfigRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // null apiKey → must NOT touch encryptedApiKey
        AiSettingsRequest req = new AiSettingsRequest("CLAUDE", null, null, null, null);
        service.saveSettings(TEST_EMAIL, req);

        verify(aiConfigRepository).save(argThat(saved ->
                "previously-encrypted-value".equals(saved.getEncryptedApiKey())));
    }

    @Test
    @DisplayName("saveSettings with blank apiKey does NOT overwrite existing encrypted key")
    void saveSettings_blankApiKey_keepsExistingKey() {
        User mockUser = User.builder().id(TEST_USER_ID).email(TEST_EMAIL)
                .passwordHash("hash").build();
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(mockUser));

        AiConfig existing = new AiConfig();
        existing.setUserId(TEST_USER_ID);
        existing.setProvider("CLAUDE");
        existing.setEncryptedApiKey("previously-encrypted-value");
        when(aiConfigRepository.findByUserId(TEST_USER_ID)).thenReturn(Optional.of(existing));
        when(aiConfigRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // blank apiKey → must NOT touch encryptedApiKey
        AiSettingsRequest req = new AiSettingsRequest("CLAUDE", "   ", null, null, null);
        service.saveSettings(TEST_EMAIL, req);

        verify(aiConfigRepository).save(argThat(saved ->
                "previously-encrypted-value".equals(saved.getEncryptedApiKey())));
    }

    @Test
    @DisplayName("saveSettings with provider=NONE clears the encrypted key")
    void saveSettings_providerNone_clearsKey() {
        User mockUser = User.builder().id(TEST_USER_ID).email(TEST_EMAIL)
                .passwordHash("hash").build();
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(mockUser));

        AiConfig existing = new AiConfig();
        existing.setUserId(TEST_USER_ID);
        existing.setProvider("CLAUDE");
        existing.setEncryptedApiKey("previously-encrypted-value");
        when(aiConfigRepository.findByUserId(TEST_USER_ID)).thenReturn(Optional.of(existing));
        when(aiConfigRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AiSettingsRequest req = new AiSettingsRequest("NONE", null, null, null, null);
        service.saveSettings(TEST_EMAIL, req);

        verify(aiConfigRepository).save(argThat(saved -> saved.getEncryptedApiKey() == null));
    }
}
