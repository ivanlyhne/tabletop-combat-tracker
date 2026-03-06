import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Enemy, EnemyRequest } from '../../shared/models/enemy.model';

@Injectable({ providedIn: 'root' })
export class EnemyService {
  private http = inject(HttpClient);

  getAll(campaignId: string) {
    return this.http.get<Enemy[]>(`/api/campaigns/${campaignId}/enemies`);
  }

  getGlobal() {
    return this.http.get<Enemy[]>('/api/enemies/global');
  }

  getGlobalById(id: string) {
    return this.http.get<Enemy>(`/api/enemies/global/${id}`);
  }

  create(campaignId: string, req: EnemyRequest) {
    return this.http.post<Enemy>(`/api/campaigns/${campaignId}/enemies`, req);
  }

  createGlobal(req: EnemyRequest) {
    return this.http.post<Enemy>('/api/enemies/global', req);
  }

  update(campaignId: string, id: string, req: EnemyRequest) {
    return this.http.put<Enemy>(`/api/campaigns/${campaignId}/enemies/${id}`, req);
  }

  updateGlobal(id: string, req: EnemyRequest) {
    return this.http.put<Enemy>(`/api/enemies/global/${id}`, req);
  }

  delete(campaignId: string, id: string) {
    return this.http.delete<void>(`/api/campaigns/${campaignId}/enemies/${id}`);
  }

  deleteGlobal(id: string) {
    return this.http.delete<void>(`/api/enemies/global/${id}`);
  }

  duplicate(campaignId: string, id: string, count = 1) {
    return this.http.post<Enemy[]>(
      `/api/campaigns/${campaignId}/enemies/${id}/duplicate?count=${count}`, {});
  }
}
