export interface Enemy {
  id: string;
  campaignId?: string;
  name: string;
  ruleset: string;
  challengeRating?: number;
  xpValue?: number;
  armorClass: number;
  hpFormula?: string;
  hpAverage?: number;
  speed: Record<string, number>;
  savingThrows: Record<string, number>;
  skills: Record<string, number>;
  damageResistances: string[];
  damageImmunities: string[];
  damageVulnerabilities: string[];
  conditionImmunities: string[];
  traits: Record<string, unknown>[];
  actions: Record<string, unknown>[];
  environmentTags: string[];
  externalId?: string;
  extraAttributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EnemyRequest {
  name: string;
  ruleset?: string;
  challengeRating?: number;
  xpValue?: number;
  armorClass: number;
  hpFormula?: string;
  hpAverage?: number;
  speed?: Record<string, number>;
  savingThrows?: Record<string, number>;
  skills?: Record<string, number>;
  damageResistances?: string[];
  damageImmunities?: string[];
  damageVulnerabilities?: string[];
  conditionImmunities?: string[];
  traits?: Record<string, unknown>[];
  actions?: Record<string, unknown>[];
  environmentTags?: string[];
  externalId?: string;
  extraAttributes?: Record<string, unknown>;
}
