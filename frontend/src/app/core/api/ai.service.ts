import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface AiSettingsResponse {
  provider: string;
  hasKey: boolean;
  modelName: string | null;
  maxTokens: number;
  temperature: number;
}

export interface AiSettingsRequest {
  provider: string;
  apiKey?: string | null;
  modelName?: string | null;
  maxTokens?: number | null;
  temperature?: number | null;
}

export interface GenerateEncounterRequest {
  ruleset: string;
  partyMembers: string[];
  environment?: string;
  difficultyTarget?: string;
  freeText?: string;
  maxMonsterCount?: number;
}

export interface GeneratedMonsterDto {
  name: string;
  count: number;
  challengeRating: string;
}

export interface GenerateEncounterResponse {
  narrativeSummary: string;
  monsters: GeneratedMonsterDto[];
  terrainFeatures: string[];
  suggestedPositions: string[];
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);

  getSettings() {
    return this.http.get<AiSettingsResponse>('/api/settings/ai');
  }

  saveSettings(req: AiSettingsRequest) {
    return this.http.put<AiSettingsResponse>('/api/settings/ai', req);
  }

  testConnection() {
    return this.http.post<{ ok: boolean; message: string }>('/api/settings/ai/test', {});
  }

  generateEncounter(req: GenerateEncounterRequest) {
    return this.http.post<GenerateEncounterResponse>('/api/ai/generate-encounter', req);
  }
}
