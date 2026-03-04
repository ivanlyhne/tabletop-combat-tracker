import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Combatant, Encounter } from '../../../shared/models/encounter.model';
import { CombatantCardComponent } from '../combatant-card/combatant-card.component';

@Component({
  selector: 'app-initiative-tracker',
  standalone: true,
  imports: [CommonModule, CombatantCardComponent],
  template: `
    <div class="tracker">
      <div class="tracker-header">
        <span class="round-label">Round {{ encounter().currentRound }}</span>
        <span class="combatant-count">{{ sortedCombatants().length }} combatants</span>
      </div>
      <div class="list">
        @for (combatant of sortedCombatants(); track combatant.id) {
          <app-combatant-card
            [combatant]="combatant"
            [isActive]="combatant.id === activeCombatantId()"
            [isSelected]="combatant.id === selectedCombatantId()"
            (selected)="combatantSelected.emit($event)">
          </app-combatant-card>
        }
        @if (sortedCombatants().length === 0) {
          <div class="empty">No combatants yet</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .tracker { display: flex; flex-direction: column; height: 100%; }
    .tracker-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 12px; background: #37474f; color: white;
      font-size: 13px; border-radius: 4px 4px 0 0;
    }
    .round-label { font-weight: 700; font-size: 15px; }
    .combatant-count { opacity: 0.7; }
    .list {
      flex: 1; overflow-y: auto; display: flex; flex-direction: column;
      gap: 4px; padding: 8px; background: #f5f5f5; border-radius: 0 0 4px 4px;
    }
    .empty { text-align: center; color: rgba(0,0,0,.4); padding: 24px 0; font-size: 13px; }
  `],
})
export class InitiativeTrackerComponent {
  encounter = input.required<Encounter>();
  selectedCombatantId = input<string | null>(null);

  combatantSelected = output<string>();

  activeCombatantId(): string | null {
    const enc = this.encounter();
    if (enc.activeCombatantIndex < 0 || enc.initiativeOrder.length === 0) return null;
    return enc.initiativeOrder[enc.activeCombatantIndex] ?? null;
  }

  sortedCombatants(): Combatant[] {
    const enc = this.encounter();
    if (enc.initiativeOrder.length === 0) return enc.combatants;
    const map = new Map(enc.combatants.map(c => [c.id, c]));
    const ordered = enc.initiativeOrder.map(id => map.get(id)).filter(Boolean) as Combatant[];
    // Append any combatants not in the initiative order (just added)
    const inOrder = new Set(enc.initiativeOrder);
    const extra = enc.combatants.filter(c => !inOrder.has(c.id));
    return [...ordered, ...extra];
  }
}
