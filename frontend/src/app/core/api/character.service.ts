import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Character, CharacterRequest } from '../../shared/models/character.model';

@Injectable({ providedIn: 'root' })
export class CharacterService {
  private http = inject(HttpClient);

  getAll(campaignId: string) {
    return this.http.get<Character[]>(`/api/campaigns/${campaignId}/characters`);
  }

  getById(campaignId: string, id: string) {
    return this.http.get<Character>(`/api/campaigns/${campaignId}/characters/${id}`);
  }

  create(campaignId: string, req: CharacterRequest) {
    return this.http.post<Character>(`/api/campaigns/${campaignId}/characters`, req);
  }

  update(campaignId: string, id: string, req: CharacterRequest) {
    return this.http.put<Character>(`/api/campaigns/${campaignId}/characters/${id}`, req);
  }

  delete(campaignId: string, id: string) {
    return this.http.delete<void>(`/api/campaigns/${campaignId}/characters/${id}`);
  }
}
