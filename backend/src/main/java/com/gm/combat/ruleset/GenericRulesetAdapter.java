package com.gm.combat.ruleset;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class GenericRulesetAdapter implements RulesetAdapter {

    public static final String RULESET_ID = "GENERIC";

    @Override
    public String getRulesetId() {
        return RULESET_ID;
    }

    @Override
    public List<ConditionDefinition> getConditions() {
        return List.of();
    }

    @Override
    public boolean supportsDifficultyCalculation() {
        return false;
    }
}
