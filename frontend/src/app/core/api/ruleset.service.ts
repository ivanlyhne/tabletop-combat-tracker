import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ConditionDefinition {
  name: string;
  description: string;
  icon: string;
}

@Injectable({ providedIn: 'root' })
export class RulesetService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/rulesets`;

  getConditions(rulesetId: string): Observable<ConditionDefinition[]> {
    return this.http.get<ConditionDefinition[]>(`${this.base}/${rulesetId}/conditions`);
  }
}
