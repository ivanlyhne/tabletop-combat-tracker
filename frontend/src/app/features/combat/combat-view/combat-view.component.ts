import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
import { EncounterService } from '../../../core/api/encounter.service';
import { CombatApiService } from '../../../core/api/combat.service';
import { Combatant, Encounter } from '../../../shared/models/encounter.model';
import { InitiativeTrackerComponent } from '../initiative-tracker/initiative-tracker.component';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Setup', SETUP: 'Setup', ACTIVE: 'Active',
  PAUSED: 'Paused', ENDED: 'Ended',
};

const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
  'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
  'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious',
];

@Component({
  selector: 'app-combat-view',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatToolbarModule, MatButtonModule, MatIconModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule,
    MatDividerModule, MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule,
    InitiativeTrackerComponent,
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

        @if (encounter()?.status === 'DRAFT' || encounter()?.status === 'SETUP') {
          <button mat-raised-button color="accent" (click)="startCombat()" [disabled]="busy()">
            <mat-icon>play_arrow</mat-icon> Start Combat
          </button>
        }
        @if (encounter()?.status === 'ACTIVE') {
          <button mat-button (click)="nextTurn()" [disabled]="busy()" matTooltip="Next Turn">
            <mat-icon>skip_next</mat-icon> Next Turn
          </button>
          <button mat-button (click)="pause()" [disabled]="busy()">
            <mat-icon>pause</mat-icon> Pause
          </button>
          <button mat-button color="warn" (click)="endCombat()" [disabled]="busy()">
            <mat-icon>stop</mat-icon> End
          </button>
        }
        @if (encounter()?.status === 'PAUSED') {
          <button mat-raised-button color="accent" (click)="resume()" [disabled]="busy()">
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

            <!-- Right: Map placeholder -->
            <div class="right-panel">
              <div class="map-placeholder">
                <mat-icon class="map-icon">map</mat-icon>
                <p>Battle Map</p>
                <span class="map-hint">Coming in Phase 7</span>
              </div>
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
                    <label class="action-label">Damage</label>
                    <div class="input-row">
                      <input type="number" min="0" #dmgInput class="num-input" placeholder="0">
                      <button mat-raised-button color="warn" [disabled]="busy()"
                              (click)="applyDamage(dmgInput.value); dmgInput.value=''">
                        Apply
                      </button>
                    </div>
                  </div>

                  <!-- Heal -->
                  <div class="action-group">
                    <label class="action-label">Heal</label>
                    <div class="input-row">
                      <input type="number" min="0" #healInput class="num-input" placeholder="0">
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

                  <!-- Add Condition -->
                  <div class="action-group">
                    <label class="action-label">Add Condition</label>
                    <div class="input-row">
                      <select #condSel class="num-input">
                        @for (c of conditionOptions; track c) {
                          <option [value]="c">{{ c }}</option>
                        }
                      </select>
                      <input type="number" #condDur class="num-input small" placeholder="rnds">
                      <button mat-button [disabled]="busy()"
                              (click)="addCondition(condSel.value, condDur.value)">
                        Add
                      </button>
                    </div>
                  </div>

                  <!-- Remove conditions -->
                  @if (selectedCombatant()!.conditions.length > 0) {
                    <div class="action-group conditions-remove">
                      <label class="action-label">Remove Condition</label>
                      <div class="cond-chips">
                        @for (cond of selectedCombatant()!.conditions; track cond.name) {
                          <button mat-stroked-button class="cond-chip" [disabled]="busy()"
                                  (click)="removeCondition(cond.name)">
                            {{ cond.name }} ✕
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
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; overflow: hidden; }
    .combat-layout { display: flex; flex-direction: column; height: 100%; }
    .combat-toolbar { gap: 8px; }
    .encounter-name { font-size: 16px; font-weight: 600; }
    .status-badge {
      font-size: 12px; padding: 2px 8px; border-radius: 10px;
      background: rgba(255,255,255,.2); margin-left: 8px;
    }
    .spacer { flex: 1; }
    .ended-label { font-weight: 600; color: #ffcdd2; }
    .loading-center { flex: 1; display: flex; align-items: center; justify-content: center; }

    .content-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .difficulty-banner {
      padding: 6px 16px; font-size: 13px; font-weight: 600; text-align: center;
      background: #e8f5e9; border-bottom: 1px solid #c8e6c9; color: #2e7d32;
    }
    .difficulty-banner[data-level="HARD"] { background: #ffebee; border-color: #ffcdd2; color: #c62828; }
    .difficulty-banner[data-level="DEADLY"] { background: #f3e5f5; border-color: #e1bee7; color: #6a1b9a; }
    .difficulty-banner[data-level="MEDIUM"] { background: #fff3e0; border-color: #ffe0b2; color: #e65100; }
    .difficulty-banner[data-level="TRIVIAL"] { background: #f5f5f5; border-color: #e0e0e0; color: #757575; }

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
      max-height: 260px; overflow-y: auto;
    }
    .action-grid { display: flex; flex-wrap: wrap; gap: 12px; padding: 8px 0; }
    .action-group { display: flex; flex-direction: column; gap: 4px; }
    .action-label { font-size: 11px; font-weight: 600; color: rgba(0,0,0,.6); text-transform: uppercase; }
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
  `],
})
export class CombatViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private encounterService = inject(EncounterService);
  private combatApi = inject(CombatApiService);
  private snack = inject(MatSnackBar);

  encounter = signal<Encounter | null>(null);
  selectedId = signal<string | null>(null);
  busy = signal(false);

  conditionOptions = CONDITIONS;
  STATUS_LABEL = STATUS_LABEL;

  selectedCombatant = computed(() => {
    const enc = this.encounter();
    const id = this.selectedId();
    if (!enc || !id) return null;
    return enc.combatants.find(c => c.id === id) ?? null;
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('encounterId')!;
    this.encounterService.getById(id).subscribe({
      next: enc => this.encounter.set(enc),
      error: () => this.snack.open('Failed to load encounter', 'Close', { duration: 3000 }),
    });
  }

  selectCombatant(id: string) {
    this.selectedId.set(this.selectedId() === id ? null : id);
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
