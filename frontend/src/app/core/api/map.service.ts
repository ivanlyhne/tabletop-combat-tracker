import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MapConfig, MapRequest, AnnotationConfig, AnnotationRequest } from '../../shared/models/map.model';

@Injectable({ providedIn: 'root' })
export class MapApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ── Map CRUD ──────────────────────────────────────────────────────────────

  getByCampaign(campaignId: string): Observable<MapConfig[]> {
    return this.http.get<MapConfig[]>(`${this.base}/campaigns/${campaignId}/maps`);
  }

  create(campaignId: string, req: MapRequest): Observable<MapConfig> {
    return this.http.post<MapConfig>(`${this.base}/campaigns/${campaignId}/maps`, req);
  }

  getById(id: string): Observable<MapConfig> {
    return this.http.get<MapConfig>(`${this.base}/maps/${id}`);
  }

  update(id: string, req: MapRequest): Observable<MapConfig> {
    return this.http.put<MapConfig>(`${this.base}/maps/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/maps/${id}`);
  }

  uploadBackground(id: string, file: File): Observable<MapConfig> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<MapConfig>(`${this.base}/maps/${id}/background`, form);
  }

  // ── Annotations ───────────────────────────────────────────────────────────

  getAnnotations(encounterId: string): Observable<AnnotationConfig[]> {
    return this.http.get<AnnotationConfig[]>(`${this.base}/encounters/${encounterId}/annotations`);
  }

  // ── Public player endpoints (no auth required) ────────────────────────────

  getByIdPublic(mapId: string): Observable<MapConfig> {
    return this.http.get<MapConfig>(`${this.base}/player/maps/${mapId}`);
  }

  getAnnotationsPublic(encounterId: string): Observable<AnnotationConfig[]> {
    return this.http.get<AnnotationConfig[]>(`${this.base}/player/encounters/${encounterId}/annotations`);
  }

  createAnnotation(encounterId: string, req: AnnotationRequest): Observable<AnnotationConfig> {
    return this.http.post<AnnotationConfig>(`${this.base}/encounters/${encounterId}/annotations`, req);
  }

  deleteAnnotation(encounterId: string, annotationId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/encounters/${encounterId}/annotations/${annotationId}`);
  }
}
