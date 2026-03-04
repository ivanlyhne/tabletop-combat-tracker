import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { CharacterService } from '../../../core/api/character.service';
import { Character } from '../../../shared/models/character.model';
import { CharacterFormComponent } from '../character-form/character-form.component';

@Component({
  selector: 'gm-character-list',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  template: `
    <mat-toolbar color="primary">
      <button mat-icon-button (click)="router.navigate(['/campaigns'])" title="Back">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <span>Characters</span>
      <span class="spacer"></span>
    </mat-toolbar>

    <div class="page-content">
      <div class="page-header">
        <h2>Characters</h2>
        <button mat-flat-button color="primary" (click)="openForm()">
          <mat-icon>person_add</mat-icon> New Character
        </button>
      </div>

      @if (loading()) {
        <div class="center"><mat-spinner></mat-spinner></div>
      } @else if (characters().length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">people</mat-icon>
          <p>No characters yet. Add player characters and allied NPCs here.</p>
        </div>
      } @else {
        <table mat-table [dataSource]="characters()" class="char-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let c">{{ c.name }}</td>
          </ng-container>

          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Type</th>
            <td mat-cell *matCellDef="let c">
              <mat-chip [highlighted]="c.characterType === 'PC'">
                {{ c.characterType === 'PC' ? 'Player' : 'Allied NPC' }}
              </mat-chip>
            </td>
          </ng-container>

          <ng-container matColumnDef="hp">
            <th mat-header-cell *matHeaderCellDef>HP</th>
            <td mat-cell *matCellDef="let c">{{ c.currentHp }} / {{ c.maxHp }}</td>
          </ng-container>

          <ng-container matColumnDef="ac">
            <th mat-header-cell *matHeaderCellDef>AC</th>
            <td mat-cell *matCellDef="let c">{{ c.armorClass }}</td>
          </ng-container>

          <ng-container matColumnDef="init">
            <th mat-header-cell *matHeaderCellDef>Init Mod</th>
            <td mat-cell *matCellDef="let c">{{ c.initiativeModifier >= 0 ? '+' : '' }}{{ c.initiativeModifier }}</td>
          </ng-container>

          <ng-container matColumnDef="speed">
            <th mat-header-cell *matHeaderCellDef>Speed</th>
            <td mat-cell *matCellDef="let c">{{ c.speed }} ft</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let c">
              <button mat-icon-button title="Edit" (click)="openForm(c)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" title="Delete" (click)="deleteCharacter(c)">
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
    .spacer { flex: 1; }
    .page-content { padding: 24px; max-width: 1000px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .page-header h2 { margin: 0; }
    .char-table { width: 100%; }
    .center { display: flex; justify-content: center; padding: 48px; }
    .empty-state { text-align: center; padding: 48px; opacity: 0.6; }
    .empty-icon { font-size: 64px; width: 64px; height: 64px; }
  `],
})
export class CharacterListComponent implements OnInit {
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private characterService = inject(CharacterService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  private campaignId = this.route.snapshot.params['campaignId'];
  characters = signal<Character[]>([]);
  loading = signal(true);
  displayedColumns = ['name', 'type', 'hp', 'ac', 'init', 'speed', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.characterService.getAll(this.campaignId).subscribe({
      next: data => { this.characters.set(data); this.loading.set(false); },
      error: () => { this.snack.open('Failed to load characters', 'Close', { duration: 3000 }); this.loading.set(false); },
    });
  }

  openForm(character?: Character) {
    const ref = this.dialog.open(CharacterFormComponent, { data: character ?? null, width: '520px' });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const op = character
        ? this.characterService.update(this.campaignId, character.id, result)
        : this.characterService.create(this.campaignId, result);
      op.subscribe({
        next: () => { this.snack.open(character ? 'Character updated' : 'Character created', '', { duration: 2000 }); this.load(); },
        error: () => this.snack.open('Operation failed', 'Close', { duration: 3000 }),
      });
    });
  }

  deleteCharacter(character: Character) {
    if (!confirm(`Delete "${character.name}"?`)) return;
    this.characterService.delete(this.campaignId, character.id).subscribe({
      next: () => { this.snack.open('Character deleted', '', { duration: 2000 }); this.load(); },
      error: () => this.snack.open('Delete failed', 'Close', { duration: 3000 }),
    });
  }
}
