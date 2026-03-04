package com.gm.combat.ruleset.dnd5e;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pure-logic unit tests for Dnd5eDifficultyCalculator.
 * No Spring context, no database required.
 *
 * XP thresholds (level 1 per PC): easy=25, medium=50, hard=75, deadly=100
 * Multipliers: 1 monster=1.0, 2=1.5, 3-6=2.0, 7-10=2.5, 11-14=3.0, 15+=4.0
 */
@DisplayName("Dnd5eDifficultyCalculator")
class Dnd5eDifficultyCalculatorTest {

    private Dnd5eDifficultyCalculator calculator;

    // Helpers for building test data
    private static CombatantSummary pc(int level) {
        return new CombatantSummary(true, level, null);
    }

    private static CombatantSummary monster(String cr) {
        return new CombatantSummary(false, null, new BigDecimal(cr));
    }

    @BeforeEach
    void setUp() {
        calculator = new Dnd5eDifficultyCalculator();
    }

    // ── Edge cases ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("No monsters → TRIVIAL with 0 XP")
    void noMonsters_isTrivial() {
        List<CombatantSummary> party = List.of(pc(1), pc(1), pc(1), pc(1));
        DifficultyResult result = calculator.calculate(party, List.of());

        assertThat(result.level()).isEqualTo(DifficultyLevel.TRIVIAL);
        assertThat(result.adjustedXp()).isEqualTo(0);
    }

    @Test
    @DisplayName("Empty party with monsters → MEDIUM (no thresholds to compare against)")
    void emptyParty_withMonsters_isMedium() {
        // noParty=true, adjustedXp > 0 → MEDIUM per classifyXp logic
        DifficultyResult result = calculator.calculate(
                List.of(),
                List.of(monster("0.125"))   // 25 XP
        );
        assertThat(result.level()).isEqualTo(DifficultyLevel.MEDIUM);
    }

    @Test
    @DisplayName("Empty party, no monsters → TRIVIAL")
    void emptyParty_noMonsters_isTrivial() {
        DifficultyResult result = calculator.calculate(List.of(), List.of());
        assertThat(result.level()).isEqualTo(DifficultyLevel.TRIVIAL);
        assertThat(result.adjustedXp()).isEqualTo(0);
    }

    // ── Difficulty levels with 4 level-1 party ────────────────────────────────
    // Level-1 thresholds: easy=25, medium=50, hard=75, deadly=100 (per PC)
    // Party of 4: easy=100, medium=200, hard=300, deadly=400

    @Test
    @DisplayName("4×L1 PCs vs 1×CR0 (10 XP, ×1.0 = 10) → TRIVIAL")
    void level1Party_singleCr0_isTrivial() {
        List<CombatantSummary> party = List.of(pc(1), pc(1), pc(1), pc(1));
        DifficultyResult result = calculator.calculate(party, List.of(monster("0")));

        // adjustedXp=10 < easy threshold=100
        assertThat(result.level()).isEqualTo(DifficultyLevel.TRIVIAL);
        assertThat(result.rawXp()).isEqualTo(10);
        assertThat(result.adjustedXp()).isEqualTo(10);
    }

    @Test
    @DisplayName("4×L1 PCs vs 2×CR0.25 (50 XP each, ×1.5 = 150) → EASY")
    void level1Party_twoCr025_isEasy() {
        List<CombatantSummary> party = List.of(pc(1), pc(1), pc(1), pc(1));
        List<CombatantSummary> monsters = List.of(monster("0.25"), monster("0.25"));
        DifficultyResult result = calculator.calculate(party, monsters);

        // rawXp=100, ×1.5 = 150; 100 ≤ 150 < 200 → EASY
        assertThat(result.level()).isEqualTo(DifficultyLevel.EASY);
        assertThat(result.adjustedXp()).isEqualTo(150);
    }

    @Test
    @DisplayName("4×L1 PCs vs 1×CR1 (200 XP, ×1.0 = 200) → MEDIUM")
    void level1Party_singleCr1_isMedium() {
        List<CombatantSummary> party = List.of(pc(1), pc(1), pc(1), pc(1));
        DifficultyResult result = calculator.calculate(party, List.of(monster("1")));

        // adjustedXp=200; 200 < 300 (hard) → MEDIUM
        assertThat(result.level()).isEqualTo(DifficultyLevel.MEDIUM);
        assertThat(result.adjustedXp()).isEqualTo(200);
    }

    @Test
    @DisplayName("4×L1 PCs vs 3×CR1 (200 XP each, ×2.0 = 1200) → DEADLY")
    void level1Party_threeCr1_isDeadly() {
        List<CombatantSummary> party = List.of(pc(1), pc(1), pc(1), pc(1));
        List<CombatantSummary> monsters = List.of(monster("1"), monster("1"), monster("1"));
        DifficultyResult result = calculator.calculate(party, monsters);

        // rawXp=600, ×2.0 = 1200; 1200 ≥ 400 (deadly) → DEADLY
        assertThat(result.level()).isEqualTo(DifficultyLevel.DEADLY);
        assertThat(result.adjustedXp()).isEqualTo(1200);
    }

    // ── Multiplier boundaries ────────────────────────────────────────────────

    @Test
    @DisplayName("Single monster uses ×1.0 multiplier")
    void singleMonster_multiplierOne() {
        DifficultyResult result = calculator.calculate(
                List.of(pc(5)),
                List.of(monster("2"))   // 450 XP × 1.0
        );
        assertThat(result.adjustedXp()).isEqualTo(450);
    }

    @Test
    @DisplayName("Two monsters use ×1.5 multiplier")
    void twoMonsters_multiplierOnePointFive() {
        DifficultyResult result = calculator.calculate(
                List.of(pc(5)),
                List.of(monster("0.5"), monster("0.5"))  // 2×100=200 × 1.5 = 300
        );
        assertThat(result.adjustedXp()).isEqualTo(300);
    }

    @Test
    @DisplayName("11 monsters use ×3.0 multiplier")
    void elevenMonsters_multiplierThree() {
        // 11 CR0 monsters = 11×10 = 110 XP × 3.0 = 330
        List<CombatantSummary> monsters = java.util.Collections.nCopies(11, monster("0"));
        DifficultyResult result = calculator.calculate(List.of(pc(1)), monsters);
        assertThat(result.adjustedXp()).isEqualTo(330);
    }

    // ── Higher-level party ───────────────────────────────────────────────────

    @Test
    @DisplayName("4×L10 PCs vs 1×CR0 → TRIVIAL (high party dwarfs low monster)")
    void highLevelParty_lowMonster_isTrivial() {
        List<CombatantSummary> party = List.of(pc(10), pc(10), pc(10), pc(10));
        // Level-10 easy threshold = 600 per PC; party easy = 2400
        // CR0 = 10 XP → 10 << 2400 → TRIVIAL
        DifficultyResult result = calculator.calculate(party, List.of(monster("0")));
        assertThat(result.level()).isEqualTo(DifficultyLevel.TRIVIAL);
    }

    @Test
    @DisplayName("rawXp and adjustedXp are reported correctly")
    void xpFieldsCorrect() {
        // 4 goblins (CR0.25 = 50 XP each) × 2.0 multiplier = 400
        List<CombatantSummary> monsters = List.of(
                monster("0.25"), monster("0.25"), monster("0.25"), monster("0.25"));
        DifficultyResult result = calculator.calculate(List.of(pc(1)), monsters);

        assertThat(result.rawXp()).isEqualTo(200);       // 4 × 50
        assertThat(result.adjustedXp()).isEqualTo(400);  // × 2.0
    }
}
