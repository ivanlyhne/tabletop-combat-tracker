import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CampaignService } from '../../../core/api/campaign.service';
import { Campaign } from '../../../shared/models/campaign.model';
import { CampaignFormComponent } from '../campaign-form/campaign-form.component';

@Component({
  selector: 'gm-campaign-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-content">
      <div class="page-header">
        <h2>My Campaigns</h2>
        <button mat-flat-button color="primary" (click)="openForm()">
          <mat-icon>add</mat-icon> New Campaign
        </button>
      </div>

      @if (loading()) {
        <div class="center"><mat-spinner></mat-spinner></div>
      } @else if (campaigns().length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">campaign</mat-icon>
          <p>No campaigns yet. Create one to get started!</p>
        </div>
      } @else {
        <table mat-table [dataSource]="campaigns()" class="campaign-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let c">{{ c.name }}</td>
          </ng-container>
          <ng-container matColumnDef="ruleset">
            <th mat-header-cell *matHeaderCellDef>Ruleset</th>
            <td mat-cell *matCellDef="let c">{{ rulesetLabel(c.ruleset) }}</td>
          </ng-container>
          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>Description</th>
            <td mat-cell *matCellDef="let c" class="desc-cell">{{ c.description }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let c">
              <button mat-icon-button color="primary" title="Characters" (click)="goToCharacters(c)">
                <mat-icon>people</mat-icon>
              </button>
              <button mat-icon-button color="accent" title="Monsters" (click)="goToMonsters(c)">
                <mat-icon>pest_control</mat-icon>
              </button>
              <button mat-icon-button color="primary" title="Encounters" (click)="goToEncounters(c)">
                <mat-icon>local_fire_department</mat-icon>
              </button>
              <button mat-icon-button title="Edit" (click)="openForm(c)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" title="Delete" (click)="deleteCampaign(c)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      }
    </div>
  `,
  styles: [`
    .page-content { padding: 24px 32px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .page-header h2 { margin: 0; }
    .campaign-table { width: 100%; }
    .desc-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .center { display: flex; justify-content: center; padding: 48px; }
    .empty-state { text-align: center; padding: 48px; opacity: 0.6; }
    .empty-icon { font-size: 64px; width: 64px; height: 64px; }
  `],
})
export class CampaignListComponent implements OnInit {
  private campaignService = inject(CampaignService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  campaigns = signal<Campaign[]>([]);
  loading = signal(true);
  displayedColumns = ['name', 'ruleset', 'description', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.campaignService.getAll().subscribe({
      next: data => { this.campaigns.set(data); this.loading.set(false); },
      error: () => { this.snack.open('Failed to load campaigns', 'Close', { duration: 3000 }); this.loading.set(false); },
    });
  }

  openForm(campaign?: Campaign) {
    const ref = this.dialog.open(CampaignFormComponent, { data: campaign ?? null, width: '480px' });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const op = campaign
        ? this.campaignService.update(campaign.id, result)
        : this.campaignService.create(result);
      op.subscribe({
        next: () => { this.snack.open(campaign ? 'Campaign updated' : 'Campaign created', '', { duration: 2000 }); this.load(); },
        error: () => this.snack.open('Operation failed', 'Close', { duration: 3000 }),
      });
    });
  }

  deleteCampaign(campaign: Campaign) {
    if (!confirm('Delete campaign "' + campaign.name + '"? This cannot be undone.')) return;
    this.campaignService.delete(campaign.id).subscribe({
      next: () => { this.snack.open('Campaign deleted', '', { duration: 2000 }); this.load(); },
      error: () => this.snack.open('Delete failed', 'Close', { duration: 3000 }),
    });
  }

  goToCharacters(campaign: Campaign) { this.router.navigate(['/campaigns', campaign.id, 'characters']); }
  goToMonsters(campaign: Campaign) { this.router.navigate(['/campaigns', campaign.id, 'monsters']); }
  goToEncounters(campaign: Campaign) { this.router.navigate(['/campaigns', campaign.id, 'encounters', 'new']); }
  rulesetLabel(ruleset: string): string { return ruleset === 'DND_5E' ? 'D&D 5e' : ruleset; }
}
