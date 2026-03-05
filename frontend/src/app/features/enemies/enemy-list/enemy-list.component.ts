import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EnemyService } from '../../../core/api/enemy.service';
import { Enemy } from '../../../shared/models/enemy.model';
import { EnemyFormComponent } from '../enemy-form/enemy-form.component';

@Component({
  selector: 'app-enemy-list',
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
        <h2>Enemies</h2>
        <div class="header-actions">
          <button mat-stroked-button (click)="openForm()" style="margin-right: 8px">
            <mat-icon>add</mat-icon> New Enemy
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="center"><mat-spinner></mat-spinner></div>
      } @else if (enemies().length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">pest_control</mat-icon>
          <p>No enemies yet. Add stat blocks to build your encounter library.</p>
        </div>
      } @else {
        <table mat-table [dataSource]="enemies()" class="enemy-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let m">{{ m.name }}</td>
          </ng-container>

          <ng-container matColumnDef="cr">
            <th mat-header-cell *matHeaderCellDef>CR</th>
            <td mat-cell *matCellDef="let m">{{ m.challengeRating ?? '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="xp">
            <th mat-header-cell *matHeaderCellDef>XP</th>
            <td mat-cell *matCellDef="let m">{{ m.xpValue ?? '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="hp">
            <th mat-header-cell *matHeaderCellDef>HP</th>
            <td mat-cell *matCellDef="let m">{{ m.hpFormula || m.hpAverage }}</td>
          </ng-container>

          <ng-container matColumnDef="ac">
            <th mat-header-cell *matHeaderCellDef>AC</th>
            <td mat-cell *matCellDef="let m">{{ m.armorClass }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let m">
              <button mat-icon-button title="Duplicate" (click)="duplicate(m)">
                <mat-icon>content_copy</mat-icon>
              </button>
              <button mat-icon-button title="Edit" (click)="openForm(m)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" title="Delete" (click)="deleteEnemy(m)">
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
    .enemy-table { width: 100%; }
    .center { display: flex; justify-content: center; padding: 48px; }
    .empty-state { text-align: center; padding: 48px; opacity: 0.6; }
    .empty-icon { font-size: 64px; width: 64px; height: 64px; }
  `],
})
export class EnemyListComponent implements OnInit {
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private enemyService = inject(EnemyService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  private campaignId = this.route.snapshot.params['campaignId'];
  enemies = signal<Enemy[]>([]);
  loading = signal(true);
  displayedColumns = ['name', 'cr', 'xp', 'hp', 'ac', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.enemyService.getAll(this.campaignId).subscribe({
      next: data => { this.enemies.set(data); this.loading.set(false); },
      error: () => { this.snack.open('Failed to load enemies', 'Close', { duration: 3000 }); this.loading.set(false); },
    });
  }

  openForm(enemy?: Enemy) {
    const ref = this.dialog.open(EnemyFormComponent, { data: enemy ?? null, width: '520px' });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const op = enemy
        ? this.enemyService.update(this.campaignId, enemy.id, result)
        : this.enemyService.create(this.campaignId, result);
      op.subscribe({
        next: () => { this.snack.open(enemy ? 'Enemy updated' : 'Enemy created', '', { duration: 2000 }); this.load(); },
        error: () => this.snack.open('Operation failed', 'Close', { duration: 3000 }),
      });
    });
  }

  duplicate(enemy: Enemy) {
    const count = parseInt(prompt('How many copies?', '1') ?? '1', 10);
    if (!count || count < 1) return;
    this.enemyService.duplicate(this.campaignId, enemy.id, count).subscribe({
      next: () => { this.snack.open(`${count} copies created`, '', { duration: 2000 }); this.load(); },
      error: () => this.snack.open('Duplicate failed', 'Close', { duration: 3000 }),
    });
  }

  deleteEnemy(enemy: Enemy) {
    if (!confirm(`Delete "${enemy.name}"?`)) return;
    this.enemyService.delete(this.campaignId, enemy.id).subscribe({
      next: () => { this.snack.open('Enemy deleted', '', { duration: 2000 }); this.load(); },
      error: () => this.snack.open('Delete failed', 'Close', { duration: 3000 }),
    });
  }
}
