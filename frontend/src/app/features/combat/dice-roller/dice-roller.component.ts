import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface DiceResult {
  dice: string;
  value: number;
  modifier: number;
  total: number;
}

@Component({
  selector: 'app-dice-roller',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="dice-panel" [class.expanded]="open()">

      <!-- FAB toggle -->
      <button class="fab" (click)="toggle()" [matTooltip]="open() ? 'Close dice roller' : 'Open dice roller (D)'" matTooltipPosition="left">
        🎲
      </button>

      @if (open()) {
        <div class="panel-body">
          <div class="panel-title">Dice Roller</div>

          <!-- Dice buttons -->
          <div class="dice-grid">
            @for (sides of diceSides; track sides) {
              <button class="die-btn" (click)="roll(sides)"
                      [class.last-rolled]="lastResult()?.dice === 'd' + sides"
                      [matTooltip]="'Roll d' + sides">
                d{{ sides }}
              </button>
            }
          </div>

          <!-- Modifier -->
          <div class="modifier-row">
            <label class="mod-label">Modifier</label>
            <input class="mod-input" type="number" [(ngModel)]="modifier" placeholder="0" />
          </div>

          <!-- Result -->
          @if (lastResult()) {
            <div class="result-area" [class.critical]="lastResult()!.value === 20 && lastResult()!.dice === 'd20'"
                                     [class.fumble]="lastResult()!.value === 1  && lastResult()!.dice === 'd20'">
              <div class="result-dice">{{ lastResult()!.dice }}</div>
              <div class="result-value">{{ lastResult()!.value }}</div>
              @if (lastResult()!.modifier !== 0) {
                <div class="result-modifier">
                  {{ lastResult()!.modifier > 0 ? '+' : '' }}{{ lastResult()!.modifier }}
                  = <strong>{{ lastResult()!.total }}</strong>
                </div>
              }
              @if (lastResult()!.value === 20 && lastResult()!.dice === 'd20') {
                <div class="crit-label">NAT 20! 🎉</div>
              }
              @if (lastResult()!.value === 1 && lastResult()!.dice === 'd20') {
                <div class="fumble-label">NAT 1 💀</div>
              }
            </div>
          }

          <!-- History -->
          @if (history().length > 0) {
            <div class="history">
              @for (r of history(); track $index) {
                <span class="hist-item">{{ r.dice }}={{ r.total }}</span>
              }
            </div>
          }

          <!-- Clear -->
          @if (history().length > 0) {
            <button class="clear-btn" (click)="clearHistory()">Clear history</button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { position: fixed; bottom: 24px; right: 24px; z-index: 200; }

    .dice-panel { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }

    .fab {
      width: 52px; height: 52px; border-radius: 50%; border: none;
      background: #3f51b5; color: white; font-size: 24px;
      cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,.3);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.15s, background 0.15s;
    }
    .fab:hover { background: #303f9f; transform: scale(1.08); }

    .panel-body {
      background: #fff; border-radius: 12px; padding: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,.2);
      min-width: 220px; max-width: 260px;
      animation: slideUp 0.15s ease;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .panel-title {
      font-size: 13px; font-weight: 700; color: #3f51b5;
      text-transform: uppercase; letter-spacing: .5px;
      margin-bottom: 10px; text-align: center;
    }

    .dice-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px; }

    .die-btn {
      padding: 8px 4px; border-radius: 6px; border: 2px solid #c5cae9;
      background: #e8eaf6; font-size: 13px; font-weight: 700; cursor: pointer;
      transition: all 0.12s; color: #3f51b5;
    }
    .die-btn:hover { background: #3f51b5; color: #fff; border-color: #3f51b5; transform: scale(1.07); }
    .die-btn.last-rolled { background: #3f51b5; color: #fff; border-color: #283593; }

    .modifier-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .mod-label { font-size: 12px; color: rgba(0,0,0,.6); }
    .mod-input {
      width: 56px; height: 28px; border: 1px solid #bdbdbd;
      border-radius: 4px; padding: 0 6px; font-size: 13px; text-align: center;
    }

    .result-area {
      background: #e8eaf6; border-radius: 8px; padding: 10px;
      text-align: center; margin-bottom: 8px;
      border: 2px solid #c5cae9;
      animation: pop 0.2s ease;
    }
    @keyframes pop {
      0%   { transform: scale(0.85); opacity: .4; }
      60%  { transform: scale(1.08); }
      100% { transform: scale(1);    opacity: 1; }
    }
    .result-area.critical { background: #e8f5e9; border-color: #66bb6a; }
    .result-area.fumble   { background: #ffebee; border-color: #ef9a9a; }

    .result-dice  { font-size: 11px; color: rgba(0,0,0,.5); text-transform: uppercase; }
    .result-value { font-size: 40px; font-weight: 900; color: #3f51b5; line-height: 1; }
    .result-modifier { font-size: 14px; color: rgba(0,0,0,.6); margin-top: 2px; }
    .crit-label   { font-size: 14px; font-weight: 700; color: #388e3c; margin-top: 4px; }
    .fumble-label { font-size: 14px; font-weight: 700; color: #c62828; margin-top: 4px; }

    .history {
      display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px;
    }
    .hist-item {
      font-size: 11px; background: #f5f5f5; padding: 2px 6px;
      border-radius: 10px; color: rgba(0,0,0,.6);
    }

    .clear-btn {
      font-size: 11px; background: none; border: none; cursor: pointer;
      color: rgba(0,0,0,.4); text-decoration: underline; padding: 0;
    }
  `],
})
export class DiceRollerComponent {
  open = signal(false);
  lastResult = signal<DiceResult | null>(null);
  history = signal<DiceResult[]>([]);
  modifier = 0;

  readonly diceSides = [4, 6, 8, 10, 12, 20, 100];

  toggle() { this.open.update(v => !v); }

  roll(sides: number): void {
    const value = Math.floor(Math.random() * sides) + 1;
    const mod = Number(this.modifier) || 0;
    const result: DiceResult = { dice: `d${sides}`, value, modifier: mod, total: value + mod };
    this.lastResult.set(result);
    this.history.update(h => [result, ...h].slice(0, 10));
  }

  clearHistory() {
    this.history.set([]);
    this.lastResult.set(null);
  }
}
