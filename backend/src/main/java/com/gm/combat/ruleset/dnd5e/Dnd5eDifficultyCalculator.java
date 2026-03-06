package com.gm.combat.ruleset.dnd5e;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Component
public class Dnd5eDifficultyCalculator {

    // Indexed by level-1; columns: [easy, medium, hard, deadly]
    private static final int[][] XP_THRESHOLDS = {
            {25,   50,   75,   100},   // level 1
            {50,   100,  150,  200},   // level 2
            {75,   150,  225,  400},   // level 3
            {125,  250,  375,  500},   // level 4
            {250,  500,  750,  1100},  // level 5
            {300,  600,  900,  1400},  // level 6
            {350,  750,  1100, 1700},  // level 7
            {450,  900,  1400, 2100},  // level 8
            {550,  1100, 1600, 2400},  // level 9
            {600,  1200, 1900, 2800},  // level 10
            {800,  1600, 2400, 3600},  // level 11
            {1000, 2000, 3000, 4500},  // level 12
            {1100, 2200, 3300, 5100},  // level 13
            {1250, 2500, 3800, 5700},  // level 14
            {1400, 2800, 4300, 6400},  // level 15
            {1600, 3200, 4800, 7200},  // level 16
            {2000, 3900, 5900, 8800},  // level 17
            {2100, 4200, 6300, 9500},  // level 18
            {2400, 4900, 7300, 10900}, // level 19
            {2800, 5700, 8500, 12700}  // level 20
    };

    private static final Map<String, Integer> CR_TO_XP = Map.ofEntries(
            Map.entry("0",     10),
            Map.entry("0.125", 25),
            Map.entry("0.25",  50),
            Map.entry("0.5",   100),
            Map.entry("1",     200),
            Map.entry("2",     450),
            Map.entry("3",     700),
            Map.entry("4",     1100),
            Map.entry("5",     1800),
            Map.entry("6",     2300),
            Map.entry("7",     2900),
            Map.entry("8",     3900),
            Map.entry("9",     5000),
            Map.entry("10",    5900),
            Map.entry("11",    7200),
            Map.entry("12",    8400),
            Map.entry("13",    10000),
            Map.entry("14",    11500),
            Map.entry("15",    13000),
            Map.entry("16",    15000),
            Map.entry("17",    18000),
            Map.entry("18",    20000),
            Map.entry("19",    22000),
            Map.entry("20",    25000),
            Map.entry("21",    33000),
            Map.entry("22",    41000),
            Map.entry("23",    50000),
            Map.entry("24",    62000),
            Map.entry("25",    75000),
            Map.entry("26",    90000),
            Map.entry("27",    105000),
            Map.entry("28",    120000),
            Map.entry("29",    135000),
            Map.entry("30",    155000)
    );

    public DifficultyResult calculate(List<CombatantSummary> party, List<CombatantSummary> enemies) {
        if (enemies.isEmpty()) {
            return new DifficultyResult(DifficultyLevel.TRIVIAL, 0, 0);
        }

        int rawXp = enemies.stream()
                .mapToInt(m -> crToXp(m.challengeRating()))
                .sum();

        double multiplier = getMultiplier(enemies.size());
        int adjustedXp = (int) (rawXp * multiplier);

        int[] totals = new int[4];
        for (CombatantSummary pc : party) {
            int level = pc.level() != null ? Math.clamp(pc.level(), 1, 20) : 1;
            int[] t = XP_THRESHOLDS[level - 1];
            totals[0] += t[0];
            totals[1] += t[1];
            totals[2] += t[2];
            totals[3] += t[3];
        }

        return new DifficultyResult(classifyXp(adjustedXp, totals, party.isEmpty()), adjustedXp, rawXp);
    }

    private int crToXp(BigDecimal cr) {
        if (cr == null) return 0;
        String key = cr.stripTrailingZeros().toPlainString();
        return CR_TO_XP.getOrDefault(key, 0);
    }

    private double getMultiplier(int count) {
        if (count == 1)  return 1.0;
        if (count == 2)  return 1.5;
        if (count <= 6)  return 2.0;
        if (count <= 10) return 2.5;
        if (count <= 14) return 3.0;
        return 4.0;
    }

    private DifficultyLevel classifyXp(int adjustedXp, int[] totals, boolean noParty) {
        if (noParty || (totals[0] == 0 && totals[1] == 0)) {
            return adjustedXp == 0 ? DifficultyLevel.TRIVIAL : DifficultyLevel.MEDIUM;
        }
        if (adjustedXp < totals[0]) return DifficultyLevel.TRIVIAL;
        if (adjustedXp < totals[1]) return DifficultyLevel.EASY;
        if (adjustedXp < totals[2]) return DifficultyLevel.MEDIUM;
        if (adjustedXp < totals[3]) return DifficultyLevel.HARD;
        return DifficultyLevel.DEADLY;
    }
}
