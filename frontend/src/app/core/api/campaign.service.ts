import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Campaign, CampaignRequest } from '../../shared/models/campaign.model';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<Campaign[]>('/api/campaigns');
  }

  getById(id: string) {
    return this.http.get<Campaign>(`/api/campaigns/${id}`);
  }

  create(req: CampaignRequest) {
    return this.http.post<Campaign>('/api/campaigns', req);
  }

  update(id: string, req: CampaignRequest) {
    return this.http.put<Campaign>(`/api/campaigns/${id}`, req);
  }

  delete(id: string) {
    return this.http.delete<void>(`/api/campaigns/${id}`);
  }
}
