package com.gm.combat.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AiProvider implementation for Perplexity AI (OpenAI-compatible REST API).
 * Instantiated per-request by {@link AiProviderFactory} — not a Spring bean.
 */
public class PerplexityAiProvider implements AiProvider {

    private static final String API_URL = "https://api.perplexity.ai/chat/completions";
    private static final String DEFAULT_MODEL = "llama-3.1-sonar-small-128k-online";
    private static final String SYSTEM_PROMPT = """
            You are a DnD 5e encounter designer. Return ONLY valid JSON with no prose before or after.
            The JSON must match this exact schema:
            {
              "narrativeSummary": "string",
              "enemies": [
                {"name": "string", "count": number, "challengeRating": "string"}
              ],
              "terrainFeatures": ["string"],
              "suggestedPositions": ["string"]
            }
            Use only creatures from the 5e SRD. Balance for the party description provided.
            """;

    private final String apiKey;
    private final String modelName;
    private final int maxTokens;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public PerplexityAiProvider(String apiKey, String modelName, int maxTokens) {
        this.apiKey = apiKey;
        this.modelName = modelName != null && !modelName.isBlank() ? modelName : DEFAULT_MODEL;
        this.maxTokens = maxTokens > 0 ? maxTokens : 4096;
    }

    @Override
    public String getProviderId() {
        return "PERPLEXITY";
    }

    @Override
    public GeneratedEncounter generateEncounter(EncounterPrompt prompt) throws AiException {
        String userMessage = buildPromptText(prompt);
        String rawResponse = callApi(userMessage, maxTokens);
        return parseResponse(rawResponse);
    }

    @Override
    public void validateKey() throws AiException {
        callApi("Say the word 'ok'.", 4);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private String callApi(String userMessage, int tokens) throws AiException {
        try {
            Map<String, Object> body = Map.of(
                    "model", modelName,
                    "max_tokens", tokens,
                    "messages", List.of(
                            Map.of("role", "system", "content", SYSTEM_PROMPT),
                            Map.of("role", "user", "content", userMessage)
                    )
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 401) {
                throw new AiException("Invalid Perplexity API key.");
            }
            if (response.statusCode() == 429) {
                throw new AiException("Perplexity API rate limit reached. Try again later.");
            }
            if (response.statusCode() != 200) {
                throw new AiException("Perplexity API error " + response.statusCode() + ": " + response.body());
            }

            // OpenAI-compatible: choices[0].message.content
            JsonNode root = mapper.readTree(response.body());
            return root.path("choices").get(0).path("message").path("content").asText();

        } catch (AiException e) {
            throw e;
        } catch (Exception e) {
            throw new AiException("Failed to reach Perplexity API: " + e.getMessage(), e);
        }
    }

    private GeneratedEncounter parseResponse(String text) throws AiException {
        try {
            String json = extractJson(text);
            JsonNode node = mapper.readTree(json);

            String summary = node.path("narrativeSummary").asText("No summary provided.");

            List<GeneratedEnemy> enemies = new ArrayList<>();
            for (JsonNode m : node.path("enemies")) {
                enemies.add(new GeneratedEnemy(
                        m.path("name").asText("Unknown"),
                        m.path("count").asInt(1),
                        m.path("challengeRating").asText("1"),
                        new HashMap<>()
                ));
            }

            List<String> terrain = new ArrayList<>();
            for (JsonNode t : node.path("terrainFeatures")) terrain.add(t.asText());

            List<String> positions = new ArrayList<>();
            for (JsonNode p : node.path("suggestedPositions")) positions.add(p.asText());

            return new GeneratedEncounter(summary, enemies, terrain, positions, text);

        } catch (Exception e) {
            throw new AiException("Failed to parse Perplexity response: " + e.getMessage());
        }
    }

    private String extractJson(String text) {
        String trimmed = text.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
            int end = trimmed.lastIndexOf("```");
            if (end >= 0) trimmed = trimmed.substring(0, end);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
            int end = trimmed.lastIndexOf("```");
            if (end >= 0) trimmed = trimmed.substring(0, end);
        }
        return trimmed.trim();
    }

    private String buildPromptText(EncounterPrompt prompt) {
        return """
                Design a DnD 5e encounter with these parameters:
                Ruleset: %s
                Party: %s
                Environment: %s
                Difficulty target: %s
                Additional notes: %s
                Maximum enemy types: %d
                """.formatted(
                prompt.ruleset(),
                String.join(", ", prompt.partyMembers()),
                prompt.environment() != null ? prompt.environment() : "unspecified",
                prompt.difficultyTarget() != null ? prompt.difficultyTarget() : "MEDIUM",
                prompt.freeText() != null ? prompt.freeText() : "none",
                prompt.maxEnemyCount() > 0 ? prompt.maxEnemyCount() : 8
        );
    }
}
