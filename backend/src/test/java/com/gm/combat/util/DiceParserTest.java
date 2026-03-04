package com.gm.combat.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pure-logic unit tests for DiceParser.average().
 * No Spring context, no database required.
 *
 * Average formula: floor(N * (M/2.0 + 0.5)) + modifier
 */
@DisplayName("DiceParser")
class DiceParserTest {

    @Test
    @DisplayName("1d6 → average 3")
    void average_1d6() {
        // floor(1 * (6/2.0 + 0.5)) = floor(3.5) = 3
        assertThat(DiceParser.average("1d6")).isEqualTo(3);
    }

    @Test
    @DisplayName("2d8+3 → average 12")
    void average_2d8plus3() {
        // floor(2 * (8/2.0 + 0.5)) + 3 = floor(9.0) + 3 = 12
        assertThat(DiceParser.average("2d8+3")).isEqualTo(12);
    }

    @Test
    @DisplayName("1d20 → average 10")
    void average_1d20() {
        // floor(1 * (20/2.0 + 0.5)) = floor(10.5) = 10
        assertThat(DiceParser.average("1d20")).isEqualTo(10);
    }

    @Test
    @DisplayName("3d4 → average 7")
    void average_3d4() {
        // floor(3 * (4/2.0 + 0.5)) = floor(7.5) = 7
        assertThat(DiceParser.average("3d4")).isEqualTo(7);
    }

    @Test
    @DisplayName("4d6-2 → average 12")
    void average_4d6minus2() {
        // floor(4 * (6/2.0 + 0.5)) + (-2) = floor(14.0) - 2 = 12
        assertThat(DiceParser.average("4d6-2")).isEqualTo(12);
    }

    @Test
    @DisplayName("null input → 0")
    void average_null() {
        assertThat(DiceParser.average(null)).isEqualTo(0);
    }

    @Test
    @DisplayName("blank input → 0")
    void average_blank() {
        assertThat(DiceParser.average("")).isEqualTo(0);
        assertThat(DiceParser.average("   ")).isEqualTo(0);
    }

    @Test
    @DisplayName("non-dice string → 0")
    void average_invalidString() {
        assertThat(DiceParser.average("abc")).isEqualTo(0);
        assertThat(DiceParser.average("5")).isEqualTo(0);   // flat numbers not supported
        assertThat(DiceParser.average("d6")).isEqualTo(0);  // missing count
    }

    @Test
    @DisplayName("whitespace in formula is stripped")
    void average_withWhitespace() {
        // regex strips whitespace before matching
        assertThat(DiceParser.average("1 d 6")).isEqualTo(3);
    }

    @Test
    @DisplayName("case-insensitive dice notation")
    void average_caseInsensitive() {
        assertThat(DiceParser.average("2D8+3")).isEqualTo(12);
    }
}
