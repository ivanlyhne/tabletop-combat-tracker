import { Component, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'gm-campaign-list',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule],
  template: `
    <mat-toolbar color="primary">
      <span>GM Combat Tracker</span>
      <span class="spacer"></span>
      <button mat-button (click)="auth.logout()">Logout</button>
    </mat-toolbar>
    <div style="padding: 24px">
      <h2>My Campaigns</h2>
      <p>Campaign management coming in Phase 3.</p>
    </div>
  `,
})
export class CampaignListComponent {
  auth = inject(AuthService);
}
