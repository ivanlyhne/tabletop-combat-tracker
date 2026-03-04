export interface Encounter {
  id: string;
  campaignId: string;
  mapId?: string;
  name: string;
  description?: string;
  objectives?: string;
  terrainNotes?: string;
  lootNotes?: string;
  ruleset: string;
  status: string;
  currentRound: number;
  activeCombatantIndex: number;
  initiativeOrder: string[];
  environmentTag?: string;
  difficultyTarget?: string;
  combatants: Combatant[];
  difficulty?: DifficultyInfo;
  createdAt: string;
  updatedAt: string;
}

export interface Combatant {
  id: string;
  encounterId: string;
  characterId?: string;
  monsterId?: string;
  displayName: string;
  initiativeValue?: number;
  initiativeModifier: number;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  armorClass: number;
  playerCharacter: boolean;
  visibleToPlayers: boolean;
  active: boolean;
  status: string;
  conditions: ConditionEntry[];
  positionX?: number;
  positionY?: number;
  tokenColor: string;
  tokenImageUrl?: string;
}

export interface ConditionEntry {
  name: string;
  durationRounds?: number;
  appliedAtRound: number;
}

export interface DifficultyInfo {
  level: string;
  adjustedXp: number;
  rawXp: number;
}

export interface EncounterRequest {
  name: string;
  description?: string;
  objectives?: string;
  terrainNotes?: string;
  lootNotes?: string;
  ruleset?: string;
  environmentTag?: string;
  difficultyTarget?: string;
}

export interface AddCombatantRequest {
  sourceType: 'CHARACTER' | 'MONSTER';
  sourceId: string;
  displayName?: string;
  initiativeValue?: number;
  initiativeModifier?: number;
}
