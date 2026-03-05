import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EncounterService } from '../../../core/api/encounter.service';
import { CharacterService } from '../../../core/api/character.service';
import { EnemyService } from '../../../core/api/enemy.service';
import { AiService, GenerateEncounterRequest } from '../../../core/api/ai.service';
import { Character } from '../../../shared/models/character.model';
import { Enemy } from '../../../shared/models/enemy.model';
import { AddCombatantRequest, Encounter } from '../../../shared/models/encounter.model';

interface EnemySlot {
  enemy: Enemy;
  count: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  TRIVIAL: '#9e9e9e',
  EASY:    '#4caf50',
  MEDIUM:  '#ff9800',
  HARD:    '#f44336',
  DEADLY:  '#9c27b0',
};

const ENVIRONMENT_TAGS = ['dungeon', 'forest', 'city', 'cave', 'underwater', 'mountains', 'plains', 'swamp'];

@Component({
  selector: 'app-encounter-setup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatBadgeModule,
    MatTooltipModule,
  ],
  template: `
    <div class="setup-container">
      <mat-card class="setup-card">
        <mat-card-header>
          <mat-card-title>New Encounter</mat-card-title>
          <mat-card-subtitle>Configure your encounter before combat begins</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" class="form-grid">

            <!-- Basic Info -->
            <section class="section">
              <h3 class="section-title">Basic Info</h3>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Encounter Name</mat-label>
                <input matInput formControlName="name" placeholder="The Goblin Ambush">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Environment</mat-label>
                <mat-select formControlName="environmentTag">
                  <mat-option value="">— none —</mat-option>
                  @for (tag of environmentTags; track tag) {
                    <mat-option [value]="tag">{{ tag | titlecase }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="2"></textarea>
              </mat-form-field>

              <div class="row-2">
                <mat-form-field appearance="outline">
                  <mat-label>Board Width (cells)</mat-label>
                  <input matInput type="number" formControlName="boardWidthCells" min="8" max="50">
                  <mat-hint>8–50 squares wide</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Board Height (cells)</mat-label>
                  <input matInput type="number" formControlName="boardHeightCells" min="8" max="50">
                  <mat-hint>8–50 squares tall</mat-hint>
                </mat-form-field>
              </div>

            </section>

            <mat-divider></mat-divider>

            <!-- Party Selection -->
            <section class="section">
              <h3 class="section-title">Party Members</h3>
              @if (characters().length === 0) {
                <p class="empty-hint">No characters in this campaign yet.</p>
              }
              @for (char of characters(); track char.id) {
                <mat-checkbox
                  [checked]="selectedCharacterIds().has(char.id)"
                  (change)="toggleCharacter(char.id)">
                  {{ char.name }} — HP {{ char.currentHp }}/{{ char.maxHp }}, AC {{ char.armorClass }}
                </mat-checkbox>
              }
            </section>

            <mat-divider></mat-divider>

            <!-- Enemy Selection -->
            <section class="section">
              <div class="section-header">
                <h3 class="section-title">Enemies</h3>
                <button mat-stroked-button color="accent" class="ai-btn"
                  [disabled]="aiLoading() || loading()"
                  (click)="generateWithAi()"
                  matTooltip="Use AI to suggest enemies for your party">
                  @if (aiLoading()) {
                    <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner>
                    Generating…
                  } @else {
                    <ng-container>
                      <mat-icon>auto_awesome</mat-icon>
                      Generate with AI
                    </ng-container>
                  }
                </button>
              </div>
              @if (enemies().length === 0) {
                <p class="empty-hint">No enemies in this campaign yet.</p>
              }
              <div class="enemy-picker">
                @for (m of enemies(); track m.id) {
                  <div class="enemy-row">
                    <span class="enemy-name">
                      {{ m.name }}
                      @if (m.challengeRating != null) { <span class="cr-chip">CR {{ m.challengeRating }}</span> }
                      @if (m.xpValue) { <span class="xp-chip">{{ m.xpValue }} XP</span> }
                    </span>
                    <button mat-icon-button (click)="addEnemy(m)" title="Add one">
                      <mat-icon>add_circle</mat-icon>
                    </button>
                  </div>
                }
              </div>

              @if (enemySlots().length > 0) {
                <div class="added-enemies">
                  <h4>Added Enemies</h4>
                  @for (slot of enemySlots(); track slot.enemy.id) {
                    <div class="slot-row">
                      <span>{{ slot.count }}× {{ slot.enemy.name }}</span>
                      <button mat-icon-button color="warn" (click)="removeEnemy(slot.enemy.id)">
                        <mat-icon>remove_circle</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              }
            </section>

            <mat-divider></mat-divider>

            <!-- Difficulty Preview -->
            <section class="section difficulty-section">
              <h3 class="section-title">Estimated Difficulty</h3>
              <div class="difficulty-badge"
                   [style.background-color]="difficultyColor()"
                   matTooltip="Based on adjusted XP per party member vs D&D 5e thresholds. Multiplier applied for multiple enemies."
                   matTooltipPosition="right">
                {{ estimatedDifficulty() }}
              </div>
              <span class="difficulty-hint">
                {{ enemySlots().length }} enemy type(s), {{ selectedCharacterIds().size }} party member(s)
              </span>
            </section>

          </form>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button (click)="cancel()">Cancel</button>
          <button
            mat-raised-button
            color="primary"
            [disabled]="form.invalid || loading()"
            (click)="save()">
            @if (loading()) {
              <mat-spinner diameter="18" style="display:inline-block;margin-right:8px"></mat-spinner>
            }
            Save &amp; Enter Setup
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .setup-container {
      padding: 16px 32px;
      max-width: 860px;
      margin: 0 auto;
      overflow-y: auto;
      height: 100%;
      box-sizing: border-box;
    }
    .setup-card { padding-bottom: 16px; }
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .section { display: flex; flex-direction: column; gap: 8px; padding: 8px 0; }
    .section-header { display: flex; align-items: center; justify-content: space-between; }
    .section-title {
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.75);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .ai-btn { height: 32px; font-size: 13px; line-height: 32px; }
    .full-width { width: 100%; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .empty-hint { color: rgba(0,0,0,.4); font-size: 13px; margin: 0; }
    .enemy-picker {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 260px;
      overflow-y: auto;
      overflow-x: hidden;
    }
    .enemy-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 0;
      min-width: 0;
    }
    .enemy-name {
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }
    .cr-chip, .xp-chip {
      display: inline-block; font-size: 11px; border-radius: 4px;
      padding: 1px 5px; margin-left: 6px; color: white; background: #607d8b;
    }
    .xp-chip { background: #8bc34a; }
    .added-enemies { margin-top: 8px; }
    .added-enemies h4 { margin: 0 0 6px; font-size: 13px; }
    .slot-row { display: flex; align-items: center; justify-content: space-between; padding: 2px 0; }
    .difficulty-section { align-items: flex-start; }
    .difficulty-badge {
      color: white; font-weight: 700; font-size: 18px;
      padding: 8px 20px; border-radius: 8px; letter-spacing: 1px;
    }
    .difficulty-hint { font-size: 12px; color: rgba(0,0,0,.5); margin-top: 4px; }
  `],
})
export class EncounterSetupComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private encounterService = inject(EncounterService);
  private characterService = inject(CharacterService);
  private enemyService = inject(EnemyService);
  private aiService = inject(AiService);
  private snackBar = inject(MatSnackBar);

  campaignId = signal('');
  characters = signal<Character[]>([]);
  enemies = signal<Enemy[]>([]);
  selectedCharacterIds = signal<Set<string>>(new Set());
  enemySlots = signal<EnemySlot[]>([]);
  loading = signal(false);
  aiLoading = signal(false);

  environmentTags = ENVIRONMENT_TAGS;

  form = this.fb.group({
    name:             ['', Validators.required],
    description:      [''],
    environmentTag:   [''],
    boardWidthCells:  [24, [Validators.required, Validators.min(8), Validators.max(50)]],
    boardHeightCells: [16, [Validators.required, Validators.min(8), Validators.max(50)]],
  });

  estimatedDifficulty = computed(() => {
    const partySize = this.selectedCharacterIds().size;
    const totalEnemies = this.enemySlots().reduce((s, sl) => s + sl.count, 0);
    const rawXp = this.enemySlots().reduce((s, sl) =>
      s + (sl.enemy.xpValue ?? 0) * sl.count, 0);

    if (rawXp === 0 || partySize === 0) return 'TRIVIAL';

    const multiplier = totalEnemies <= 1 ? 1 : totalEnemies <= 2 ? 1.5
      : totalEnemies <= 6 ? 2 : totalEnemies <= 10 ? 2.5 : 3;
    const adjusted = rawXp * multiplier;
    const perPc = adjusted / partySize;

    if (perPc < 50)   return 'TRIVIAL';
    if (perPc < 100)  return 'EASY';
    if (perPc < 200)  return 'MEDIUM';
    if (perPc < 400)  return 'HARD';
    return 'DEADLY';
  });

  difficultyColor = computed(() => DIFFICULTY_COLORS[this.estimatedDifficulty()] ?? '#9e9e9e');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('campaignId') ?? '';
    this.campaignId.set(id);
    this.characterService.getAll(id).subscribe(c => this.characters.set(c));
    this.enemyService.getAll(id).subscribe(m => this.enemies.set(m));
  }

  toggleCharacter(id: string) {
    const s = new Set(this.selectedCharacterIds());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selectedCharacterIds.set(s);
  }

  addEnemy(enemy: Enemy) {
    const slots = this.enemySlots();
    const existing = slots.find(s => s.enemy.id === enemy.id);
    if (existing) {
      this.enemySlots.set(slots.map(s =>
        s.enemy.id === enemy.id ? { ...s, count: s.count + 1 } : s));
    } else {
      this.enemySlots.set([...slots, { enemy, count: 1 }]);
    }
  }

  removeEnemy(enemyId: string) {
    this.enemySlots.set(this.enemySlots().filter(s => s.enemy.id !== enemyId));
  }

  generateWithAi() {
    const selectedChars = this.characters().filter(c => this.selectedCharacterIds().has(c.id));
    if (selectedChars.length === 0) {
      this.snackBar.open('Select at least one party member before generating.', 'Close', { duration: 3000 });
      return;
    }

    const v = this.form.value;
    const partyMembers = selectedChars.map(c =>
      `${c.name} (HP: ${c.maxHp}, AC: ${c.armorClass})`);

    const req: GenerateEncounterRequest = {
      ruleset: selectedChars[0].ruleset || 'DND5E',
      partyMembers,
      environment: v.environmentTag || undefined,
      difficultyTarget: 'MEDIUM',
      freeText: [v.description].filter(Boolean).join(' ') || undefined,
      maxMonsterCount: 8,
    };

    this.aiLoading.set(true);
    this.aiService.generateEncounter(req).subscribe({
      next: (res) => {
        this.aiLoading.set(false);

        // Clear existing enemy slots before populating from AI
        this.enemySlots.set([]);

        // Match AI-suggested enemies to existing campaign enemies by name
        const existingEnemies = this.enemies();
        let matched = 0;
        const unmatched: string[] = [];

        for (const aiEnemy of res.enemies) {
          const found = existingEnemies.find(m =>
            m.name.toLowerCase() === aiEnemy.name.toLowerCase());
          if (found) {
            for (let i = 0; i < aiEnemy.count; i++) {
              this.addEnemy(found);
            }
            matched++;
          } else {
            unmatched.push(`${aiEnemy.count}× ${aiEnemy.name} (CR ${aiEnemy.challengeRating})`);
          }
        }

        // Populate narrative summary into description if currently blank
        if (!v.description && res.narrativeSummary) {
          this.form.patchValue({ description: res.narrativeSummary });
        }

        const matchMsg = matched > 0
          ? `Matched ${matched} of ${res.enemies.length} enemy type(s) from your library.`
          : `No enemies matched your campaign library.`;
        const unmatchMsg = unmatched.length > 0
          ? ` Unmatched: ${unmatched.join(', ')}. Add them via the Enemies page first.`
          : '';
        this.snackBar.open(matchMsg + unmatchMsg, 'Close', { duration: 8000 });
      },
      error: (err) => {
        this.aiLoading.set(false);
        const msg = err?.error?.message ?? err?.error ?? 'AI generation failed. Check your AI settings.';
        this.snackBar.open(typeof msg === 'string' ? msg : 'AI generation failed.', 'Close', { duration: 5000 });
      },
    });
  }

  cancel() {
    this.router.navigate(['/campaigns']);
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const v = this.form.value;

    this.encounterService.create(this.campaignId(), {
      name:             v.name!,
      description:      v.description || undefined,
      environmentTag:   v.environmentTag || undefined,
      boardWidthCells:  v.boardWidthCells ?? 24,
      boardHeightCells: v.boardHeightCells ?? 16,
    }).subscribe({
      next: (encounter) => this.addCombatants(encounter),
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to create encounter', 'Close', { duration: 3000 });
      },
    });
  }

  private addCombatants(encounter: Encounter) {
    const charRequests: AddCombatantRequest[] = [...this.selectedCharacterIds()].map(id => ({
      sourceType: 'CHARACTER',
      sourceId: id,
    }));

    const enemyRequests: AddCombatantRequest[] = this.enemySlots().flatMap(({ enemy, count }) =>
      Array.from({ length: count }, (_, i) => ({
        sourceType: 'MONSTER' as const,
        sourceId: enemy.id,
        displayName: count > 1 ? `${enemy.name} ${i + 1}` : undefined,
      }))
    );

    const allRequests = [...charRequests, ...enemyRequests];
    if (allRequests.length === 0) {
      this.onSaveComplete(encounter.id);
      return;
    }

    const adds = allRequests.map(req => this.encounterService.addCombatant(encounter.id, req));
    forkJoin(adds).subscribe({
      next: () => this.onSaveComplete(encounter.id),
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Encounter created but some combatants failed to add', 'Close', { duration: 4000 });
        this.onSaveComplete(encounter.id);
      },
    });
  }

  private onSaveComplete(encounterId?: string) {
    this.loading.set(false);
    this.snackBar.open('Encounter ready!', 'Close', { duration: 2500 });
    if (encounterId) {
      this.router.navigate(['/encounters', encounterId, 'combat']);
    } else {
      this.router.navigate(['/campaigns']);
    }
  }
}
