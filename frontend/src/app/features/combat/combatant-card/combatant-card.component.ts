import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Combatant } from '../../../shared/models/encounter.model';

@Component({
  selector: 'app-combatant-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatChipsModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="card" [class.active]="isActive()" [class.selected]="isSelected()"
         [class.inactive]="!combatant().active" (click)="selected.emit(combatant().id)">

      <!-- Initiative bubble -->
      <div class="initiative" [matTooltip]="'Initiative: ' + (combatant().initiativeValue ?? '?')">
        {{ combatant().initiativeValue ?? '?' }}
      </div>

      <!-- Active turn indicator -->
      @if (isActive()) {
        <mat-icon class="turn-arrow" color="accent">play_arrow</mat-icon>
      }

      <!-- Name & status -->
      <div class="info">
        <span class="name" [class.downed]="combatant().status === 'DOWN'"
              [class.dead]="combatant().status === 'DEAD'">
          {{ combatant().displayName }}
          @if (combatant().status === 'DOWN') { <span class="status-chip down">DOWN</span> }
          @if (combatant().status === 'DEAD') { <span class="status-chip dead">DEAD</span> }
          @if (combatant().status === 'FLED') { <span class="status-chip fled">FLED</span> }
        </span>
        <div class="stats-row">
          <span class="stat">AC {{ combatant().armorClass }}</span>
          @if (combatant().playerCharacter) {
            <span class="pc-badge">PC</span>
          }
          @if (combatant().tempHp > 0) {
            <span class="stat temp">+{{ combatant().tempHp }} tmp</span>
          }
        </div>
        <!-- Conditions -->
        @if (combatant().conditions.length > 0) {
          <div class="conditions">
            @for (cond of combatant().conditions; track cond.name) {
              <span class="condition-chip" [matTooltip]="cond.durationRounds != null ? cond.durationRounds + ' rounds' : 'Permanent'">
                {{ cond.name }}
              </span>
            }
          </div>
        }
      </div>

      <!-- HP bar -->
      <div class="hp-section">
        <div class="hp-text">{{ combatant().currentHp }}/{{ combatant().maxHp }}</div>
        <div class="hp-bar-track">
          <div class="hp-bar-fill"
               [style.width.%]="hpPercent()"
               [style.background-color]="hpColor()">
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; border-radius: 8px; cursor: pointer;
      background: white; border: 2px solid transparent;
      transition: all 0.15s ease; position: relative;
    }
    .card:hover { border-color: #bdbdbd; background: #fafafa; }
    .card.active { border-color: #ff9800; background: #fff8e1; }
    .card.selected { border-color: #3f51b5; background: #e8eaf6; }
    .card.inactive { opacity: 0.5; }
    .initiative {
      width: 32px; height: 32px; border-radius: 50%;
      background: #607d8b; color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px; flex-shrink: 0;
    }
    .turn-arrow { color: #ff9800; font-size: 18px; flex-shrink: 0; }
    .info { flex: 1; min-width: 0; }
    .name { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 4px; }
    .downed .name { color: #e65100; }
    .dead .name { color: #757575; }
    .stats-row { display: flex; gap: 8px; align-items: center; margin-top: 2px; }
    .stat { font-size: 11px; color: rgba(0,0,0,.6); }
    .temp { color: #1565c0; }
    .pc-badge {
      font-size: 10px; background: #4caf50; color: white;
      padding: 1px 4px; border-radius: 3px;
    }
    .status-chip {
      font-size: 10px; padding: 1px 5px; border-radius: 3px; color: white; font-weight: 600;
    }
    .status-chip.down { background: #e65100; }
    .status-chip.dead { background: #424242; }
    .status-chip.fled { background: #7b1fa2; }
    .conditions { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }
    .condition-chip {
      font-size: 10px; background: #e3f2fd; color: #1565c0;
      border: 1px solid #90caf9; padding: 1px 5px; border-radius: 10px; cursor: default;
    }
    .hp-section { text-align: right; min-width: 60px; flex-shrink: 0; }
    .hp-text { font-size: 12px; font-weight: 600; color: rgba(0,0,0,.7); }
    .hp-bar-track {
      width: 60px; height: 6px; background: #e0e0e0;
      border-radius: 3px; overflow: hidden; margin-top: 3px;
    }
    .hp-bar-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
  `],
})
export class CombatantCardComponent {
  combatant = input.required<Combatant>();
  isActive = input(false);
  isSelected = input(false);

  selected = output<string>();

  hpPercent() {
    const c = this.combatant();
    return c.maxHp > 0 ? Math.round((c.currentHp / c.maxHp) * 100) : 0;
  }

  hpColor() {
    const pct = this.hpPercent();
    if (pct > 60) return '#4caf50';
    if (pct > 30) return '#ff9800';
    return '#f44336';
  }
}
