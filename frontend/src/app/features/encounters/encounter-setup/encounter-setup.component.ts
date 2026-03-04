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
import { MonsterService } from '../../../core/api/monster.service';
import { AiService, GenerateEncounterRequest } from '../../../core/api/ai.service';
import { Character } from '../../../shared/models/character.model';
import { Monster } from '../../../shared/models/monster.model';
import { AddCombatantRequest, Encounter } from '../../../shared/models/encounter.model';

interface MonsterSlot {
  monster: Monster;
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

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Objectives</mat-label>
                <textarea matInput formControlName="objectives" rows="2"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Terrain Notes</mat-label>
                <textarea matInput formControlName="terrainNotes" rows="2"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Loot Notes</mat-label>
                <textarea matInput formControlName="lootNotes" rows="2"></textarea>
              </mat-form-field>
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

            <!-- Monster Selection -->
            <section class="section">
              <div class="section-header">
                <h3 class="section-title">Monsters</h3>
                <button mat-stroked-button color="accent" class="ai-btn"
                  [disabled]="aiLoading() || loading()"
                  (click)="generateWithAi()"
                  matTooltip="Use AI to suggest monsters for your party">
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
              @if (monsters().length === 0) {
                <p class="empty-hint">No monsters in this campaign yet.</p>
              }
              <div class="monster-picker">
                @for (m of monsters(); track m.id) {
                  <div class="monster-row">
                    <span class="monster-name">
                      {{ m.name }}
                      @if (m.challengeRating != null) { <span class="cr-chip">CR {{ m.challengeRating }}</span> }
                      @if (m.xpValue) { <span class="xp-chip">{{ m.xpValue }} XP</span> }
                    </span>
                    <button mat-icon-button (click)="addMonster(m)" title="Add one">
                      <mat-icon>add_circle</mat-icon>
                    </button>
                  </div>
                }
              </div>

              @if (monsterSlots().length > 0) {
                <div class="added-monsters">
                  <h4>Added Monsters</h4>
                  @for (slot of monsterSlots(); track slot.monster.id) {
                    <div class="slot-row">
                      <span>{{ slot.count }}× {{ slot.monster.name }}</span>
                      <button mat-icon-button color="warn" (click)="removeMonster(slot.monster.id)">
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
              <div class="difficulty-badge" [style.background-color]="difficultyColor()">
                {{ estimatedDifficulty() }}
              </div>
              <span class="difficulty-hint">
                {{ monsterSlots().length }} monster type(s), {{ selectedCharacterIds().size }} party member(s)
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
      max-width: 720px;
      margin: 24px auto;
      padding: 0 16px;
    }
    .setup-card { padding-bottom: 16px; }
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .section { display: flex; flex-direction: column; gap: 8px; padding: 8px 0; }
    .section-header { display: flex; align-items: center; justify-content: space-between; }
    .section-title { margin: 0 0 4px; font-size: 14px; font-weight: 600; color: rgba(0,0,0,.6); }
    .ai-btn { height: 32px; font-size: 13px; line-height: 32px; }
    .full-width { width: 100%; }
    .empty-hint { color: rgba(0,0,0,.4); font-size: 13px; margin: 0; }
    .monster-picker { display: flex; flex-direction: column; gap: 4px; max-height: 260px; overflow-y: auto; }
    .monster-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; }
    .monster-name { font-size: 14px; }
    .cr-chip, .xp-chip {
      display: inline-block; font-size: 11px; border-radius: 4px;
      padding: 1px 5px; margin-left: 6px; color: white; background: #607d8b;
    }
    .xp-chip { background: #8bc34a; }
    .added-monsters { margin-top: 8px; }
    .added-monsters h4 { margin: 0 0 6px; font-size: 13px; }
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
  private monsterService = inject(MonsterService);
  private aiService = inject(AiService);
  private snackBar = inject(MatSnackBar);

  campaignId = signal('');
  characters = signal<Character[]>([]);
  monsters = signal<Monster[]>([]);
  selectedCharacterIds = signal<Set<string>>(new Set());
  monsterSlots = signal<MonsterSlot[]>([]);
  loading = signal(false);
  aiLoading = signal(false);

  environmentTags = ENVIRONMENT_TAGS;

  form = this.fb.group({
    name:           ['', Validators.required],
    description:    [''],
    objectives:     [''],
    terrainNotes:   [''],
    lootNotes:      [''],
    environmentTag: [''],
  });

  estimatedDifficulty = computed(() => {
    const partySize = this.selectedCharacterIds().size;
    const totalMonsters = this.monsterSlots().reduce((s, sl) => s + sl.count, 0);
    const rawXp = this.monsterSlots().reduce((s, sl) =>
      s + (sl.monster.xpValue ?? 0) * sl.count, 0);

    if (rawXp === 0 || partySize === 0) return 'TRIVIAL';

    const multiplier = totalMonsters <= 1 ? 1 : totalMonsters <= 2 ? 1.5
      : totalMonsters <= 6 ? 2 : totalMonsters <= 10 ? 2.5 : 3;
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
    this.monsterService.getAll(id).subscribe(m => this.monsters.set(m));
  }

  toggleCharacter(id: string) {
    const s = new Set(this.selectedCharacterIds());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selectedCharacterIds.set(s);
  }

  addMonster(monster: Monster) {
    const slots = this.monsterSlots();
    const existing = slots.find(s => s.monster.id === monster.id);
    if (existing) {
      this.monsterSlots.set(slots.map(s =>
        s.monster.id === monster.id ? { ...s, count: s.count + 1 } : s));
    } else {
      this.monsterSlots.set([...slots, { monster, count: 1 }]);
    }
  }

  removeMonster(monsterId: string) {
    this.monsterSlots.set(this.monsterSlots().filter(s => s.monster.id !== monsterId));
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
      freeText: [v.description, v.objectives].filter(Boolean).join(' ') || undefined,
      maxMonsterCount: 8,
    };

    this.aiLoading.set(true);
    this.aiService.generateEncounter(req).subscribe({
      next: (res) => {
        this.aiLoading.set(false);

        // Clear existing monster slots before populating from AI
        this.monsterSlots.set([]);

        // Match AI-suggested monsters to existing campaign monsters by name
        const existingMonsters = this.monsters();
        let matched = 0;
        const unmatched: string[] = [];

        for (const aiMonster of res.monsters) {
          const found = existingMonsters.find(m =>
            m.name.toLowerCase() === aiMonster.name.toLowerCase());
          if (found) {
            for (let i = 0; i < aiMonster.count; i++) {
              this.addMonster(found);
            }
            matched++;
          } else {
            unmatched.push(`${aiMonster.count}× ${aiMonster.name} (CR ${aiMonster.challengeRating})`);
          }
        }

        // Populate narrative summary into description if currently blank
        if (!v.description && res.narrativeSummary) {
          this.form.patchValue({ description: res.narrativeSummary });
        }

        // Populate terrain features into terrainNotes if currently blank
        if (!v.terrainNotes && res.terrainFeatures.length > 0) {
          this.form.patchValue({ terrainNotes: res.terrainFeatures.join(', ') });
        }

        const matchMsg = matched > 0
          ? `Matched ${matched} of ${res.monsters.length} monster type(s) from your library.`
          : `No monsters matched your campaign library.`;
        const unmatchMsg = unmatched.length > 0
          ? ` Unmatched: ${unmatched.join(', ')}. Add them via the Monsters page first.`
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
      name:           v.name!,
      description:    v.description || undefined,
      objectives:     v.objectives || undefined,
      terrainNotes:   v.terrainNotes || undefined,
      lootNotes:      v.lootNotes || undefined,
      environmentTag: v.environmentTag || undefined,
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

    const monsterRequests: AddCombatantRequest[] = this.monsterSlots().flatMap(({ monster, count }) =>
      Array.from({ length: count }, (_, i) => ({
        sourceType: 'MONSTER' as const,
        sourceId: monster.id,
        displayName: count > 1 ? `${monster.name} ${i + 1}` : undefined,
      }))
    );

    const allRequests = [...charRequests, ...monsterRequests];
    if (allRequests.length === 0) {
      this.onSaveComplete();
      return;
    }

    const adds = allRequests.map(req => this.encounterService.addCombatant(encounter.id, req));
    forkJoin(adds).subscribe({
      next: () => this.onSaveComplete(),
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Encounter created but some combatants failed to add', 'Close', { duration: 4000 });
        this.onSaveComplete();
      },
    });
  }

  private onSaveComplete() {
    this.loading.set(false);
    this.snackBar.open('Encounter ready!', 'Close', { duration: 2500 });
    this.router.navigate(['/campaigns']);
  }
}
