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
 * AiProvider implementation for Anthropic's Claude API.
 * Instantiated per-request by {@link AiProviderFactory} — not a Spring bean.
 */
public class ClaudeAiProvider implements AiProvider {

    private static final String API_URL = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final String DEFAULT_MODEL = "claude-3-5-haiku-20241022";
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

    public ClaudeAiProvider(String apiKey, String modelName, int maxTokens) {
        this.apiKey = apiKey;
        this.modelName = modelName != null && !modelName.isBlank() ? modelName : DEFAULT_MODEL;
        this.maxTokens = maxTokens > 0 ? maxTokens : 4096;
    }

    @Override
    public String getProviderId() {
        return "CLAUDE";
    }

    @Override
    public GeneratedEncounter generateEncounter(EncounterPrompt prompt) throws AiException {
        String userMessage = buildPromptText(prompt);
        String rawResponse = callApi(userMessage, maxTokens);
        return parseResponse(rawResponse);
    }

    @Override
    public void validateKey() throws AiException {
        // Minimal call: 1 token, short message
        try {
            callApi("Say the word 'ok'.", 4);
        } catch (AiException e) {
            throw e;
        } catch (Exception e) {
            throw new AiException("Key validation failed: " + e.getMessage(), e);
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private String callApi(String userMessage, int tokens) throws AiException {
        try {
            Map<String, Object> body = Map.of(
                    "model", modelName,
                    "max_tokens", tokens,
                    "system", SYSTEM_PROMPT,
                    "messages", List.of(Map.of("role", "user", "content", userMessage))
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL))
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", ANTHROPIC_VERSION)
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 401) {
                throw new AiException("Invalid Claude API key.");
            }
            if (response.statusCode() == 429) {
                throw new AiException("Claude API rate limit reached. Try again later.");
            }
            if (response.statusCode() != 200) {
                throw new AiException("Claude API error " + response.statusCode() + ": " + response.body());
            }

            // Extract text from content[0].text
            JsonNode root = mapper.readTree(response.body());
            return root.path("content").get(0).path("text").asText();

        } catch (AiException e) {
            throw e;
        } catch (Exception e) {
            throw new AiException("Failed to reach Claude API: " + e.getMessage(), e);
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
            throw new AiException("Failed to parse Claude response: " + e.getMessage());
        }
    }

    /** Strip optional markdown code fences from the AI response. */
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

    @Override
    public GenerateEnemyResult generateEnemy(String challengeRating, String ruleset) throws AiException {
        String userMessage = "Generate a D&D 5e creature at Challenge Rating " + challengeRating
                + ". Return ONLY valid JSON with fields: name (string), challengeRating (string),"
                + " xpValue (number), hpFormula (dice notation like 4d8+4), armorClass (number),"
                + " walkSpeed (number), description (1-2 sentences).";
        String rawResponse = callApi(userMessage, 512);
        return parseEnemyResponse(rawResponse);
    }

    private GenerateEnemyResult parseEnemyResponse(String text) throws AiException {
        try {
            String json = extractJson(text);
            JsonNode node = mapper.readTree(json);
            return new GenerateEnemyResult(
                    node.path("name").asText("Unknown Creature"),
                    node.path("challengeRating").asText("1"),
                    node.path("xpValue").isNull() || node.path("xpValue").isMissingNode()
                            ? null : node.path("xpValue").asInt(0),
                    node.path("hpFormula").asText("1d8"),
                    node.path("armorClass").asInt(10),
                    node.path("walkSpeed").asInt(30),
                    node.path("description").asText("")
            );
        } catch (Exception e) {
            throw new AiException("Failed to parse enemy response: " + e.getMessage());
        }
    }
}
