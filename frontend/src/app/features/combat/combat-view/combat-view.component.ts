import {
  Component, OnInit, DestroyRef, inject, signal, computed, HostListener, ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { EncounterService } from '../../../core/api/encounter.service';
import { CombatApiService } from '../../../core/api/combat.service';
import { MapApiService } from '../../../core/api/map.service';
import { RulesetService, ConditionDefinition } from '../../../core/api/ruleset.service';
import { StompService } from '../../../core/websocket/stomp.service';
import { Combatant, Encounter } from '../../../shared/models/encounter.model';
import { MapConfig, AnnotationConfig } from '../../../shared/models/map.model';
import { InitiativeTrackerComponent } from '../initiative-tracker/initiative-tracker.component';
import { BattleMapComponent } from '../../map/battle-map/battle-map.component';
import { ConditionPickerComponent, ConditionSelection } from '../condition-picker/condition-picker.component';
import { DiceRollerComponent } from '../dice-roller/dice-roller.component';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Setup', SETUP: 'Setup', ACTIVE: 'Active',
  PAUSED: 'Paused', ENDED: 'Ended',
};

/** Keyboard shortcut help entries */
const SHORTCUTS = [
  { key: 'N', description: 'Next turn' },
  { key: 'P', description: 'Pause / Resume combat' },
  { key: 'D', description: 'Toggle dice roller' },
  { key: 'H', description: 'Focus Heal input' },
  { key: 'X', description: 'Focus Damage input' },
  { key: '?', description: 'Show / hide keyboard shortcuts' },
];

@Component({
  selector: 'app-combat-view',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatToolbarModule, MatButtonModule, MatIconModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule,
    MatDividerModule, MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule,
    MatDialogModule,
    InitiativeTrackerComponent, BattleMapComponent,
    ConditionPickerComponent, DiceRollerComponent,
  ],
  template: `
    <div class="combat-layout">

      <!-- Toolbar -->
      <mat-toolbar color="primary" class="combat-toolbar">
        <button mat-icon-button (click)="back()" matTooltip="Back">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <span class="encounter-name">{{ encounter()?.name ?? 'Combat' }}</span>
        <span class="status-badge" [attr.data-status]="encounter()?.status">
          {{ encounter() ? STATUS_LABEL[encounter()!.status] : '' }}
        </span>
        <span class="spacer"></span>

        <!-- Keyboard shortcut hint -->
        <button mat-icon-button matTooltip="Keyboard shortcuts (?)" (click)="toggleHelp()">
          <mat-icon>keyboard</mat-icon>
        </button>

        @if (encounter()?.status === 'DRAFT' || encounter()?.status === 'SETUP') {
          <button mat-raised-button color="accent" (click)="startCombat()" [disabled]="busy()">
            <mat-icon>play_arrow</mat-icon> Start Combat
          </button>
        }
        @if (encounter()?.status === 'ACTIVE') {
          <button mat-button (click)="nextTurn()" [disabled]="busy()" matTooltip="Next Turn (N)">
            <mat-icon>skip_next</mat-icon> Next Turn
          </button>
          <button mat-button (click)="pause()" [disabled]="busy()" matTooltip="Pause (P)">
            <mat-icon>pause</mat-icon> Pause
          </button>
          <button mat-button color="warn" (click)="endCombat()" [disabled]="busy()">
            <mat-icon>stop</mat-icon> End
          </button>
        }
        @if (encounter()?.status === 'PAUSED') {
          <button mat-raised-button color="accent" (click)="resume()" [disabled]="busy()" matTooltip="Resume (P)">
            <mat-icon>play_arrow</mat-icon> Resume
          </button>
          <button mat-button color="warn" (click)="endCombat()" [disabled]="busy()">
            <mat-icon>stop</mat-icon> End
          </button>
        }
        @if (encounter()?.status === 'ENDED') {
          <span class="ended-label">Combat Ended</span>
        }
      </mat-toolbar>

      <!-- Keyboard shortcut overlay -->
      @if (showHelp()) {
        <div class="shortcut-overlay" (click)="toggleHelp()">
          <div class="shortcut-card" (click)="$event.stopPropagation()">
            <div class="shortcut-title">
              <mat-icon>keyboard</mat-icon> Keyboard Shortcuts
              <button class="shortcut-close" (click)="toggleHelp()">✕</button>
            </div>
            <table class="shortcut-table">
              @for (s of shortcuts; track s.key) {
                <tr>
                  <td><kbd>{{ s.key }}</kbd></td>
                  <td>{{ s.description }}</td>
                </tr>
              }
            </table>
          </div>
        </div>
      }

      @if (!encounter()) {
        <div class="loading-center">
          <mat-spinner></mat-spinner>
        </div>
      } @else {
        <div class="content-area">

          <!-- Difficulty badge -->
          @if (encounter()!.difficulty) {
            <div class="difficulty-banner" [attr.data-level]="encounter()!.difficulty!.level">
              Difficulty: {{ encounter()!.difficulty!.level }}
              &nbsp;|&nbsp;
              Adjusted XP: {{ encounter()!.difficulty!.adjustedXp }}
            </div>
          }

          <div class="main-panels">

            <!-- Left: Initiative tracker -->
            <div class="left-panel">
              <app-initiative-tracker
                [encounter]="encounter()!"
                [selectedCombatantId]="selectedId()"
                (combatantSelected)="selectCombatant($event)">
              </app-initiative-tracker>
            </div>

            <!-- Right: Battle Map -->
            <div class="right-panel">
              @if (activeMap()) {
                <gm-battle-map
                  [map]="activeMap()!"
                  [combatants]="encounter()!.combatants"
                  [activeCombatantId]="activeCombatantId()"
                  [encounterId]="encounter()!.id"
                  [annotations]="annotations()"
                  (annotationCreated)="onAnnotationCreated($event)"
                  (annotationDeleted)="onAnnotationDeleted($event)">
                </gm-battle-map>
              } @else {
                <div class="map-placeholder">
                  <mat-icon class="map-icon">map</mat-icon>
                  <p>No map assigned</p>
                  <span class="map-hint">Create a map and link it to this encounter</span>
                </div>
              }
            </div>
          </div>

          <!-- Bottom: Selected combatant action panel -->
          @if (selectedCombatant()) {
            <mat-card class="action-panel">
              <mat-card-header>
                <mat-card-title>{{ selectedCombatant()!.displayName }}</mat-card-title>
                <mat-card-subtitle>
                  HP {{ selectedCombatant()!.currentHp }}/{{ selectedCombatant()!.maxHp }}
                  @if (selectedCombatant()!.tempHp > 0) {
                    (+{{ selectedCombatant()!.tempHp }} temp)
                  }
                  &nbsp;|&nbsp; AC {{ selectedCombatant()!.armorClass }}
                  &nbsp;|&nbsp; Status: {{ selectedCombatant()!.status }}
                </mat-card-subtitle>
              </mat-card-header>

              <mat-card-content>
                <div class="action-grid">

                  <!-- Damage -->
                  <div class="action-group">
                    <label class="action-label">Damage (X)</label>
                    <div class="input-row">
                      <input type="number" min="0" #dmgInput class="num-input" placeholder="0"
                             id="dmg-input">
                      <button mat-raised-button color="warn" [disabled]="busy()"
                              (click)="applyDamage(dmgInput.value); dmgInput.value=''">
                        Apply
                      </button>
                    </div>
                  </div>

                  <!-- Heal -->
                  <div class="action-group">
                    <label class="action-label">Heal (H)</label>
                    <div class="input-row">
                      <input type="number" min="0" #healInput class="num-input" placeholder="0"
                             id="heal-input">
                      <button mat-raised-button color="primary" [disabled]="busy()"
                              (click)="applyHealing(healInput.value); healInput.value=''">
                        Apply
                      </button>
                    </div>
                  </div>

                  <!-- Temp HP -->
                  <div class="action-group">
                    <label class="action-label">Temp HP</label>
                    <div class="input-row">
                      <input type="number" min="0" #tmpInput class="num-input" placeholder="0">
                      <button mat-button [disabled]="busy()"
                              (click)="setTempHp(tmpInput.value); tmpInput.value=''">
                        Set
                      </button>
                    </div>
                  </div>

                  <!-- Initiative -->
                  <div class="action-group">
                    <label class="action-label">Initiative</label>
                    <div class="input-row">
                      <input type="number" #initInput class="num-input" placeholder="0"
                             [value]="selectedCombatant()!.initiativeValue ?? ''">
                      <button mat-button [disabled]="busy()"
                              (click)="setInitiative(initInput.value)">
                        Set
                      </button>
                    </div>
                  </div>

                  <!-- Status -->
                  <div class="action-group">
                    <label class="action-label">Status</label>
                    <div class="input-row">
                      <select #statusSel class="num-input status-sel">
                        <option value="ALIVE">Alive</option>
                        <option value="DOWN">Down</option>
                        <option value="DEAD">Dead</option>
                        <option value="FLED">Fled</option>
                      </select>
                      <button mat-button [disabled]="busy()"
                              (click)="setStatus(statusSel.value)">
                        Set
                      </button>
                    </div>
                  </div>

                  <!-- Add Condition (C) -->
                  <div class="action-group condition-group" [class.expanded]="showConditionPicker()">
                    <label class="action-label">
                      Add Condition (C)
                      <button class="toggle-picker-btn" (click)="toggleConditionPicker()">
                        {{ showConditionPicker() ? '▲ hide' : '▼ pick' }}
                      </button>
                    </label>
                    @if (showConditionPicker()) {
                      <app-condition-picker
                        [conditions]="conditionList()"
                        (conditionAdded)="onConditionSelected($event)"
                      ></app-condition-picker>
                    }
                  </div>

                  <!-- Remove conditions -->
                  @if (selectedCombatant()!.conditions.length > 0) {
                    <div class="action-group conditions-remove">
                      <label class="action-label">Active Conditions</label>
                      <div class="cond-chips">
                        @for (cond of selectedCombatant()!.conditions; track cond.name) {
                          <button mat-stroked-button class="cond-chip" [disabled]="busy()"
                                  (click)="removeCondition(cond.name)"
                                  [matTooltip]="getConditionDescription(cond.name)">
                            {{ getConditionIcon(cond.name) }} {{ cond.name }}
                            @if (cond.durationRounds) {
                              <span class="cond-dur">({{ cond.durationRounds }}r)</span>
                            }
                            ✕
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }

      <!-- Floating dice roller (always visible) -->
      <app-dice-roller #diceRoller></app-dice-roller>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; overflow: hidden; }
    .combat-layout { display: flex; flex-direction: column; height: 100%; position: relative; }
    .combat-toolbar { gap: 8px; }
    .encounter-name { font-size: 16px; font-weight: 600; }
    .status-badge {
      font-size: 12px; padding: 2px 8px; border-radius: 10px;
      background: rgba(255,255,255,.2); margin-left: 8px;
    }
    .spacer { flex: 1; }
    .ended-label { font-weight: 600; color: #ffcdd2; }
    .loading-center { flex: 1; display: flex; align-items: center; justify-content: center; }

    /* Shortcut overlay */
    .shortcut-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 300; animation: fadeIn .15s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .shortcut-card {
      background: #fff; border-radius: 12px; padding: 24px;
      min-width: 300px; box-shadow: 0 8px 32px rgba(0,0,0,.25);
    }
    .shortcut-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 16px; font-weight: 700; margin-bottom: 16px; color: #3f51b5;
    }
    .shortcut-close {
      margin-left: auto; background: none; border: none;
      cursor: pointer; font-size: 18px; color: rgba(0,0,0,.5);
    }
    .shortcut-table { border-collapse: collapse; width: 100%; }
    .shortcut-table tr td { padding: 5px 8px; font-size: 14px; }
    kbd {
      display: inline-block; padding: 2px 8px; background: #f5f5f5;
      border: 1px solid #bdbdbd; border-radius: 4px;
      font-family: monospace; font-size: 13px; font-weight: 700;
    }

    .content-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .difficulty-banner {
      padding: 6px 16px; font-size: 13px; font-weight: 600; text-align: center;
      background: #e8f5e9; border-bottom: 1px solid #c8e6c9; color: #2e7d32;
    }
    .difficulty-banner[data-level="HARD"]   { background: #ffebee; border-color: #ffcdd2; color: #c62828; }
    .difficulty-banner[data-level="DEADLY"] { background: #f3e5f5; border-color: #e1bee7; color: #6a1b9a; }
    .difficulty-banner[data-level="MEDIUM"] { background: #fff3e0; border-color: #ffe0b2; color: #e65100; }
    .difficulty-banner[data-level="TRIVIAL"]{ background: #f5f5f5; border-color: #e0e0e0; color: #757575; }

    .main-panels { flex: 1; display: flex; gap: 0; overflow: hidden; }
    .left-panel { width: 320px; flex-shrink: 0; overflow-y: auto; padding: 8px; background: #eceff1; }
    .right-panel { flex: 1; display: flex; align-items: center; justify-content: center; background: #f5f5f5; }
    .map-placeholder {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: rgba(0,0,0,.3); gap: 8px;
    }
    .map-icon { font-size: 64px; width: 64px; height: 64px; }
    .map-placeholder p { margin: 0; font-size: 20px; }
    .map-hint { font-size: 13px; }

    .action-panel {
      flex-shrink: 0; margin: 0; border-radius: 0;
      border-top: 2px solid #3f51b5;
      max-height: 320px; overflow-y: auto;
    }
    .action-grid { display: flex; flex-wrap: wrap; gap: 12px; padding: 8px 0; }
    .action-group { display: flex; flex-direction: column; gap: 4px; }
    .action-label {
      font-size: 11px; font-weight: 600; color: rgba(0,0,0,.6);
      text-transform: uppercase; display: flex; align-items: center; gap: 6px;
    }
    .input-row { display: flex; align-items: center; gap: 4px; }
    .num-input {
      width: 60px; height: 32px; border: 1px solid #bdbdbd;
      border-radius: 4px; padding: 0 6px; font-size: 13px;
    }
    .num-input.small { width: 48px; }
    .num-input.status-sel { width: 90px; }
    .conditions-remove { flex-basis: 100%; }
    .cond-chips { display: flex; flex-wrap: wrap; gap: 4px; }
    .cond-chip { font-size: 12px !important; padding: 0 6px !important; height: 26px !important; }
    .cond-dur { font-size: 10px; opacity: .7; margin-left: 2px; }

    /* Condition picker group */
    .condition-group { flex-basis: 100%; }
    .condition-group.expanded { flex-basis: 100%; }
    .toggle-picker-btn {
      font-size: 10px; background: none; border: 1px solid #bdbdbd;
      border-radius: 4px; cursor: pointer; padding: 1px 5px; color: rgba(0,0,0,.5);
    }
  `],
})
export class CombatViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private encounterService = inject(EncounterService);
  private combatApi = inject(CombatApiService);
  private mapApi = inject(MapApiService);
  private rulesetService = inject(RulesetService);
  private stomp = inject(StompService);
  private destroyRef = inject(DestroyRef);
  private snack = inject(MatSnackBar);

  @ViewChild(DiceRollerComponent) diceRoller!: DiceRollerComponent;

  encounter = signal<Encounter | null>(null);
  selectedId = signal<string | null>(null);
  busy = signal(false);
  activeMap = signal<MapConfig | null>(null);
  annotations = signal<AnnotationConfig[]>([]);
  conditionList = signal<ConditionDefinition[]>([]);
  showConditionPicker = signal(false);
  showHelp = signal(false);

  readonly STATUS_LABEL = STATUS_LABEL;
  readonly shortcuts = SHORTCUTS;

  selectedCombatant = computed(() => {
    const enc = this.encounter();
    const id = this.selectedId();
    if (!enc || !id) return null;
    return enc.combatants.find(c => c.id === id) ?? null;
  });

  activeCombatantId = computed(() => {
    const enc = this.encounter();
    if (!enc || enc.initiativeOrder.length === 0) return null;
    return enc.initiativeOrder[enc.activeCombatantIndex] ?? null;
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('encounterId')!;

    // Load conditions from API (ruleset = DND_5E default)
    this.rulesetService.getConditions('DND_5E')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: list => this.conditionList.set(list) });

    // Initial REST load
    this.encounterService.getById(id).subscribe({
      next: enc => {
        this.encounter.set(enc);
        if (enc.mapId) {
          this.mapApi.getById(enc.mapId).subscribe(map => this.activeMap.set(map));
          this.mapApi.getAnnotations(id).subscribe(anns => this.annotations.set(anns));
        }
      },
      error: () => this.snack.open('Failed to load encounter', 'Close', { duration: 3000 }),
    });

    // Real-time STOMP updates
    this.stomp.subscribeToEncounter(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(msg => this.encounter.set(msg.encounterState));
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Ignore when focus is inside an input/textarea/select
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    switch (event.key.toLowerCase()) {
      case 'n':
        event.preventDefault();
        if (this.encounter()?.status === 'ACTIVE' && !this.busy()) this.nextTurn();
        break;
      case 'p':
        event.preventDefault();
        if (this.encounter()?.status === 'ACTIVE' && !this.busy()) this.pause();
        else if (this.encounter()?.status === 'PAUSED' && !this.busy()) this.resume();
        break;
      case 'd':
        event.preventDefault();
        this.diceRoller?.toggle();
        break;
      case 'h':
        event.preventDefault();
        document.getElementById('heal-input')?.focus();
        break;
      case 'x':
        event.preventDefault();
        document.getElementById('dmg-input')?.focus();
        break;
      case 'c':
        event.preventDefault();
        if (this.selectedCombatant()) this.showConditionPicker.update(v => !v);
        break;
      case '?':
        event.preventDefault();
        this.toggleHelp();
        break;
    }
  }

  toggleHelp() { this.showHelp.update(v => !v); }
  toggleConditionPicker() { this.showConditionPicker.update(v => !v); }

  // ── Condition helpers ─────────────────────────────────────────────────────

  getConditionIcon(name: string): string {
    return this.conditionList().find(c => c.name === name)?.icon ?? '⚠️';
  }

  getConditionDescription(name: string): string {
    return this.conditionList().find(c => c.name === name)?.description ?? name;
  }

  onConditionSelected(sel: ConditionSelection) {
    this.addCondition(sel.name, sel.durationRounds?.toString() ?? '');
    this.showConditionPicker.set(false);
  }

  // ── Annotation handlers ───────────────────────────────────────────────────

  onAnnotationCreated(ann: AnnotationConfig): void {
    this.annotations.update(list => [...list, ann]);
  }

  onAnnotationDeleted(annId: string): void {
    this.annotations.update(list => list.filter(a => a.id !== annId));
  }

  selectCombatant(id: string) {
    this.selectedId.set(this.selectedId() === id ? null : id);
    this.showConditionPicker.set(false);
  }

  back() { this.router.navigate(['/campaigns']); }

  private act(obs$: ReturnType<typeof this.combatApi.startCombat>) {
    this.busy.set(true);
    obs$.subscribe({
      next: enc => { this.encounter.set(enc); this.busy.set(false); },
      error: (err) => {
        this.busy.set(false);
        const msg = err?.error?.message ?? 'Action failed';
        this.snack.open(msg, 'Close', { duration: 3500 });
      },
    });
  }

  startCombat() { this.act(this.combatApi.startCombat(this.encounter()!.id)); }
  nextTurn()    { this.act(this.combatApi.nextTurn(this.encounter()!.id)); }
  pause()       { this.act(this.combatApi.pause(this.encounter()!.id)); }
  resume()      { this.act(this.combatApi.resume(this.encounter()!.id)); }
  endCombat()   { this.act(this.combatApi.end(this.encounter()!.id)); }

  applyDamage(val: string) {
    const amount = parseInt(val, 10);
    if (!amount || amount <= 0 || !this.selectedCombatant()) return;
    this.act(this.combatApi.applyDamage(this.encounter()!.id, this.selectedId()!, amount));
  }

  applyHealing(val: string) {
    const amount = parseInt(val, 10);
    if (!amount || amount <= 0 || !this.selectedCombatant()) return;
    this.act(this.combatApi.applyHealing(this.encounter()!.id, this.selectedId()!, amount));
  }

  setTempHp(val: string) {
    const amount = parseInt(val, 10);
    if (isNaN(amount) || !this.selectedCombatant()) return;
    this.act(this.combatApi.setTempHp(this.encounter()!.id, this.selectedId()!, Math.max(0, amount)));
  }

  setInitiative(val: string) {
    const value = parseInt(val, 10);
    if (isNaN(value) || !this.selectedCombatant()) return;
    this.act(this.combatApi.setInitiative(this.encounter()!.id, this.selectedId()!, value));
  }

  setStatus(status: string) {
    if (!this.selectedCombatant()) return;
    this.act(this.combatApi.setStatus(this.encounter()!.id, this.selectedId()!, status));
  }

  addCondition(name: string, durVal: string) {
    if (!name || !this.selectedCombatant()) return;
    const dur = durVal ? parseInt(durVal, 10) : undefined;
    this.act(this.combatApi.addCondition(this.encounter()!.id, this.selectedId()!, name, dur));
  }

  removeCondition(name: string) {
    if (!this.selectedCombatant()) return;
    this.act(this.combatApi.removeCondition(this.encounter()!.id, this.selectedId()!, name));
  }
}
