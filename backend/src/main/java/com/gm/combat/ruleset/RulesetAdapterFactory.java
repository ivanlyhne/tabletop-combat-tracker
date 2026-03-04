package com.gm.combat.ruleset;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class RulesetAdapterFactory {

    private final Map<String, RulesetAdapter> adapters;

    public RulesetAdapterFactory(List<RulesetAdapter> adapterList) {
        this.adapters = adapterList.stream()
                .collect(Collectors.toMap(RulesetAdapter::getRulesetId, a -> a));
    }

    public RulesetAdapter get(String rulesetId) {
        return adapters.getOrDefault(rulesetId, adapters.get(GenericRulesetAdapter.RULESET_ID));
    }
}
