package com.gm.combat.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class DiceParser {

    private static final Pattern DICE_PATTERN =
            Pattern.compile("^(\\d+)d(\\d+)([+-]\\d+)?$", Pattern.CASE_INSENSITIVE);

    /**
     * Calculates the average roll for a dice formula like "2d8+4" or a plain integer like "45".
     * Average of NdM = N * (M/2.0 + 0.5), rounded down.
     */
    public static int average(String formula) {
        if (formula == null || formula.isBlank()) return 1;
        try {
            return Integer.parseInt(formula.trim());
        } catch (NumberFormatException ignored) {}
        Matcher m = DICE_PATTERN.matcher(formula.replaceAll("\\s+", ""));
        if (!m.matches()) return 1;
        int numDice = Integer.parseInt(m.group(1));
        int dieSides = Integer.parseInt(m.group(2));
        int modifier = m.group(3) != null ? Integer.parseInt(m.group(3)) : 0;
        return (int) Math.floor(numDice * (dieSides / 2.0 + 0.5)) + modifier;
    }

    private DiceParser() {}
}
