import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EnemyService } from '../../../core/api/enemy.service';
import { EnemyFormComponent } from '../enemy-form/enemy-form.component';
import { Enemy } from '../../../shared/models/enemy.model';

@Component({
  selector: 'app-global-enemy-library',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule, MatIconModule, MatTableModule,
    MatDialogModule, MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="page-content">
      <div class="page-header">
        <div>
          <h1 class="page-title">Enemy Library</h1>
          <p class="page-subtitle">Shared enemy catalogue — available across all campaigns</p>
        </div>
        <button mat-flat-button color="primary" (click)="openForm()">
          <mat-icon>add</mat-icon> New Enemy
        </button>
      </div>

      @if (loading()) {
        <div class="loading-center"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (enemies().length === 0) {
        <div class="empty-state">
          <mat-icon>menu_book</mat-icon>
          <p>No enemies in the global library yet.</p>
          <p>Add reusable D&amp;D stat blocks here to use them across all your campaigns.</p>
          <button mat-flat-button color="primary" (click)="openForm()">Add First Enemy</button>
        </div>
      } @else {
        <table mat-table [dataSource]="enemies()" class="enemy-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let e">{{ e.name }}</td>
          </ng-container>
          <ng-container matColumnDef="cr">
            <th mat-header-cell *matHeaderCellDef>CR</th>
            <td mat-cell *matCellDef="let e">{{ e.challengeRating ?? '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="hp">
            <th mat-header-cell *matHeaderCellDef>HP</th>
            <td mat-cell *matCellDef="let e">{{ e.hpFormula || e.hpAverage }}</td>
          </ng-container>
          <ng-container matColumnDef="ac">
            <th mat-header-cell *matHeaderCellDef>AC</th>
            <td mat-cell *matCellDef="let e">{{ e.armorClass }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let e">
              <button mat-icon-button matTooltip="Edit" (click)="openForm(e)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Delete" color="warn" (click)="delete(e)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
      }
    </div>
  `,
  styles: [`
    .page-content { padding: 24px 32px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
    .page-subtitle { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0; }
    .loading-center { display: flex; justify-content: center; padding: 60px; }
    .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      color: rgba(255,255,255,0.4); padding: 80px 20px; text-align: center;
    }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .empty-state p { margin: 0; font-size: 15px; }
    .enemy-table { width: 100%; }
  `],
})
export class GlobalEnemyLibraryComponent implements OnInit {
  private enemyService = inject(EnemyService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  enemies = signal<Enemy[]>([]);
  loading = signal(true);
  columns = ['name', 'cr', 'hp', 'ac', 'actions'];

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.enemyService.getGlobal().subscribe({
      next: list => { this.enemies.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm(enemy?: Enemy) {
    this.dialog.open(EnemyFormComponent, {
      data: enemy ?? null,
      width: '500px',
    }).afterClosed().subscribe(req => {
      if (!req) return;
      const save$ = enemy
        ? this.enemyService.updateGlobal(enemy.id, req)
        : this.enemyService.createGlobal(req);
      save$.subscribe({
        next: () => { this.snackBar.open(enemy ? 'Updated' : 'Created', '', { duration: 2000 }); this.load(); },
        error: () => this.snackBar.open('Error saving', '', { duration: 3000 }),
      });
    });
  }

  delete(enemy: Enemy) {
    if (!confirm(`Delete "${enemy.name}" from the global library?`)) return;
    this.enemyService.deleteGlobal(enemy.id).subscribe({
      next: () => { this.snackBar.open('Deleted', '', { duration: 2000 }); this.load(); },
      error: () => this.snackBar.open('Error deleting', '', { duration: 3000 }),
    });
  }
}
