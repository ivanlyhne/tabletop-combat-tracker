package com.gm.combat.ruleset;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class Dnd5eRulesetAdapter implements RulesetAdapter {

    public static final String RULESET_ID = "DND_5E";

    @Override
    public String getRulesetId() {
        return RULESET_ID;
    }

    @Override
    public List<ConditionDefinition> getConditions() {
        return List.of(
                new ConditionDefinition("Blinded", "Can't see; auto-fail sight checks; attacks against have advantage, own attacks have disadvantage", "👁️"),
                new ConditionDefinition("Charmed", "Can't attack charmer; charmer has advantage on social ability checks", "💕"),
                new ConditionDefinition("Deafened", "Can't hear; auto-fail hearing checks", "🔇"),
                new ConditionDefinition("Exhaustion", "Cumulative debuffs at levels 1-6; level 6 causes death", "😴"),
                new ConditionDefinition("Frightened", "Disadvantage on checks/attacks while source visible; can't willingly move closer", "😱"),
                new ConditionDefinition("Grappled", "Speed 0; ends if grappler incapacitated or creature moves out of reach", "🤝"),
                new ConditionDefinition("Incapacitated", "Can't take actions or reactions", "😵"),
                new ConditionDefinition("Invisible", "Can't be seen without special means; attacks against have disadvantage, own attacks have advantage", "👻"),
                new ConditionDefinition("Paralyzed", "Incapacitated; auto-fail Str/Dex saves; attacks have advantage; hits within 5 ft are critical", "⚡"),
                new ConditionDefinition("Petrified", "Transformed to stone; incapacitated; resistance to all damage; auto-fail Str/Dex saves", "🗿"),
                new ConditionDefinition("Poisoned", "Disadvantage on attack rolls and ability checks", "🤢"),
                new ConditionDefinition("Prone", "Disadvantage on attack rolls; melee attacks within 5 ft have advantage, ranged attacks have disadvantage", "🛒"),
                new ConditionDefinition("Restrained", "Speed 0; disadvantage on attacks and Dex saves; attacks against have advantage", "⛓️"),
                new ConditionDefinition("Stunned", "Incapacitated; auto-fail Str/Dex saves; attacks against have advantage", "💫"),
                new ConditionDefinition("Unconscious", "Incapacitated; drop held items; fall prone; auto-fail Str/Dex saves; hits within 5 ft are critical", "💤")
        );
    }

    @Override
    public boolean supportsDifficultyCalculation() {
        return true;
    }
}
