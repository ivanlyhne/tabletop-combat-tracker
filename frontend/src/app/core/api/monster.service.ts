import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Monster, MonsterRequest } from '../../shared/models/monster.model';

@Injectable({ providedIn: 'root' })
export class MonsterService {
  private http = inject(HttpClient);

  getAll(campaignId: string) {
    return this.http.get<Monster[]>(`/api/campaigns/${campaignId}/monsters`);
  }

  getGlobal() {
    return this.http.get<Monster[]>('/api/monsters/global');
  }

  create(campaignId: string, req: MonsterRequest) {
    return this.http.post<Monster>(`/api/campaigns/${campaignId}/monsters`, req);
  }

  update(campaignId: string, id: string, req: MonsterRequest) {
    return this.http.put<Monster>(`/api/campaigns/${campaignId}/monsters/${id}`, req);
  }

  delete(campaignId: string, id: string) {
    return this.http.delete<void>(`/api/campaigns/${campaignId}/monsters/${id}`);
  }

  duplicate(campaignId: string, id: string, count = 1) {
    return this.http.post<Monster[]>(
      `/api/campaigns/${campaignId}/monsters/${id}/duplicate?count=${count}`, {});
  }
}
