package com.gm.combat.controller;

import com.gm.combat.ruleset.ConditionDefinition;
import com.gm.combat.ruleset.RulesetAdapterFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rulesets")
@RequiredArgsConstructor
public class RulesetController {

    private final RulesetAdapterFactory adapterFactory;

    /** Returns all conditions for a given ruleset (e.g. DND_5E). */
    @GetMapping("/{rulesetId}/conditions")
    public List<ConditionDefinition> getConditions(@PathVariable String rulesetId) {
        return adapterFactory.get(rulesetId).getConditions();
    }
}
