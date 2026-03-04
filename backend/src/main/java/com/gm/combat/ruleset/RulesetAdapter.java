package com.gm.combat.ruleset;

import java.util.List;

public interface RulesetAdapter {
    String getRulesetId();
    List<ConditionDefinition> getConditions();
    boolean supportsDifficultyCalculation();
}
