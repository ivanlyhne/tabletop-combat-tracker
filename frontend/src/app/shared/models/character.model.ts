export interface Character {
  id: string;
  campaignId: string;
  name: string;
  characterType: string;
  ruleset: string;
  initiativeModifier: number;
  armorClass: number;
  maxHp: number;
  currentHp: number;
  tempHp: number;
  speed: number;
  passivePerception?: number;
  notes?: string;
  externalId?: string;
  extraAttributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterRequest {
  name: string;
  characterType?: string;
  ruleset?: string;
  initiativeModifier: number;
  armorClass: number;
  maxHp: number;
  speed: number;
  passivePerception?: number;
  notes?: string;
  externalId?: string;
  extraAttributes?: Record<string, unknown>;
}
