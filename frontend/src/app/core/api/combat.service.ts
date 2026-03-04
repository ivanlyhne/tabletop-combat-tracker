import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Encounter } from '../../shared/models/encounter.model';
import { AddCombatantRequest } from '../../shared/models/encounter.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CombatApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  private url(encounterId: string, suffix = '') {
    return `${this.base}/encounters/${encounterId}/combat${suffix}`;
  }

  startCombat(encounterId: string): Observable<Encounter> {
    return this.http.post<Encounter>(this.url(encounterId, '/start'), {});
  }

  nextTurn(encounterId: string): Observable<Encounter> {
    return this.http.post<Encounter>(this.url(encounterId, '/next-turn'), {});
  }

  pause(encounterId: string): Observable<Encounter> {
    return this.http.post<Encounter>(this.url(encounterId, '/pause'), {});
  }

  resume(encounterId: string): Observable<Encounter> {
    return this.http.post<Encounter>(this.url(encounterId, '/resume'), {});
  }

  end(encounterId: string): Observable<Encounter> {
    return this.http.post<Encounter>(this.url(encounterId, '/end'), {});
  }

  applyDamage(encounterId: string, combatantId: string, amount: number): Observable<Encounter> {
    return this.http.patch<Encounter>(
      this.url(encounterId, `/combatants/${combatantId}/damage`), { amount });
  }

  applyHealing(encounterId: string, combatantId: string, amount: number): Observable<Encounter> {
    return this.http.patch<Encounter>(
      this.url(encounterId, `/combatants/${combatantId}/heal`), { amount });
  }

  setTempHp(encounterId: string, combatantId: string, amount: number): Observable<Encounter> {
    return this.http.patch<Encounter>(
      this.url(encounterId, `/combatants/${combatantId}/temp-hp`), { amount });
  }

  setInitiative(encounterId: string, combatantId: string, value: number): Observable<Encounter> {
    return this.http.patch<Encounter>(
      this.url(encounterId, `/combatants/${combatantId}/initiative`), { value });
  }

  setStatus(encounterId: string, combatantId: string, status: string): Observable<Encounter> {
    return this.http.patch<Encounter>(
      this.url(encounterId, `/combatants/${combatantId}/status`), { status });
  }

  moveCombatant(encounterId: string, combatantId: string, x: number, y: number): Observable<Encounter> {
    return this.http.patch<Encounter>(
      this.url(encounterId, `/combatants/${combatantId}/move`), { x, y });
  }

  addCondition(encounterId: string, combatantId: string,
               name: string, durationRounds?: number): Observable<Encounter> {
    return this.http.post<Encounter>(
      this.url(encounterId, `/combatants/${combatantId}/conditions`),
      { name, durationRounds: durationRounds ?? null });
  }

  removeCondition(encounterId: string, combatantId: string, name: string): Observable<Encounter> {
    return this.http.delete<Encounter>(
      this.url(encounterId, `/combatants/${combatantId}/conditions/${encodeURIComponent(name)}`));
  }

  addCombatant(encounterId: string, req: AddCombatantRequest): Observable<Encounter> {
    return this.http.post<Encounter>(this.url(encounterId, '/combatants'), req);
  }
}
