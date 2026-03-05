import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MonsterService } from '../../../core/api/monster.service';
import { Monster } from '../../../shared/models/monster.model';
import { MonsterFormComponent } from '../monster-form/monster-form.component';

@Component({
  selector: 'gm-monster-list',
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
        <h2>Monsters</h2>
        <div class="header-actions">
          <button mat-stroked-button (click)="openForm()" style="margin-right: 8px">
            <mat-icon>add</mat-icon> New Monster
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="center"><mat-spinner></mat-spinner></div>
      } @else if (monsters().length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">pest_control</mat-icon>
          <p>No monsters yet. Add stat blocks to build your encounter library.</p>
        </div>
      } @else {
        <table mat-table [dataSource]="monsters()" class="monster-table">
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
            <th mat-header-cell *matHeaderCellDef>Avg HP</th>
            <td mat-cell *matCellDef="let m">{{ m.hpAverage }} {{ m.hpFormula ? '(' + m.hpFormula + ')' : '' }}</td>
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
              <button mat-icon-button color="warn" title="Delete" (click)="deleteMonster(m)">
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
    .page-content { padding: 24px; max-width: 1000px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .page-header h2 { margin: 0; }
    .monster-table { width: 100%; }
    .center { display: flex; justify-content: center; padding: 48px; }
    .empty-state { text-align: center; padding: 48px; opacity: 0.6; }
    .empty-icon { font-size: 64px; width: 64px; height: 64px; }
  `],
})
export class MonsterListComponent implements OnInit {
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private monsterService = inject(MonsterService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  private campaignId = this.route.snapshot.params['campaignId'];
  monsters = signal<Monster[]>([]);
  loading = signal(true);
  displayedColumns = ['name', 'cr', 'xp', 'hp', 'ac', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.monsterService.getAll(this.campaignId).subscribe({
      next: data => { this.monsters.set(data); this.loading.set(false); },
      error: () => { this.snack.open('Failed to load monsters', 'Close', { duration: 3000 }); this.loading.set(false); },
    });
  }

  openForm(monster?: Monster) {
    const ref = this.dialog.open(MonsterFormComponent, { data: monster ?? null, width: '520px' });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const op = monster
        ? this.monsterService.update(this.campaignId, monster.id, result)
        : this.monsterService.create(this.campaignId, result);
      op.subscribe({
        next: () => { this.snack.open(monster ? 'Monster updated' : 'Monster created', '', { duration: 2000 }); this.load(); },
        error: () => this.snack.open('Operation failed', 'Close', { duration: 3000 }),
      });
    });
  }

  duplicate(monster: Monster) {
    const count = parseInt(prompt('How many copies?', '1') ?? '1', 10);
    if (!count || count < 1) return;
    this.monsterService.duplicate(this.campaignId, monster.id, count).subscribe({
      next: () => { this.snack.open(`${count} copies created`, '', { duration: 2000 }); this.load(); },
      error: () => this.snack.open('Duplicate failed', 'Close', { duration: 3000 }),
    });
  }

  deleteMonster(monster: Monster) {
    if (!confirm(`Delete "${monster.name}"?`)) return;
    this.monsterService.delete(this.campaignId, monster.id).subscribe({
      next: () => { this.snack.open('Monster deleted', '', { duration: 2000 }); this.load(); },
      error: () => this.snack.open('Delete failed', 'Close', { duration: 3000 }),
    });
  }
}
