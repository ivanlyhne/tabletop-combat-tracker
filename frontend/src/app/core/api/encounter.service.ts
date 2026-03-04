import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Encounter, EncounterRequest, AddCombatantRequest } from '../../shared/models/encounter.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EncounterService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getByCampaign(campaignId: string): Observable<Encounter[]> {
    return this.http.get<Encounter[]>(`${this.base}/campaigns/${campaignId}/encounters`);
  }

  getById(id: string): Observable<Encounter> {
    return this.http.get<Encounter>(`${this.base}/encounters/${id}`);
  }

  create(campaignId: string, request: EncounterRequest): Observable<Encounter> {
    return this.http.post<Encounter>(`${this.base}/campaigns/${campaignId}/encounters`, request);
  }

  update(id: string, request: EncounterRequest): Observable<Encounter> {
    return this.http.put<Encounter>(`${this.base}/encounters/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/encounters/${id}`);
  }

  addCombatant(encounterId: string, request: AddCombatantRequest): Observable<Encounter> {
    return this.http.post<Encounter>(`${this.base}/encounters/${encounterId}/combatants`, request);
  }

  removeCombatant(encounterId: string, combatantId: string): Observable<Encounter> {
    return this.http.delete<Encounter>(`${this.base}/encounters/${encounterId}/combatants/${combatantId}`);
  }
}
