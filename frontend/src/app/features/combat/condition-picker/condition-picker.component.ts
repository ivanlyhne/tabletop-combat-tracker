import {
  Component, EventEmitter, Input, OnChanges, OnInit, Output, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConditionDefinition } from '../../../core/api/ruleset.service';

export interface ConditionSelection {
  name: string;
  durationRounds?: number;
}

@Component({
  selector: 'app-condition-picker',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatTooltipModule,
  ],
  template: `
    <div class="picker-container">
      <input
        class="search-input"
        type="text"
        placeholder="Search conditions…"
        [(ngModel)]="searchText"
        (ngModelChange)="filterConditions()"
      />

      <div class="condition-list">
        @for (cond of filtered(); track cond.name) {
          <button
            class="cond-btn"
            [class.selected]="selected()?.name === cond.name"
            [matTooltip]="cond.description"
            matTooltipPosition="above"
            (click)="select(cond)"
          >
            <span class="cond-icon">{{ cond.icon }}</span>
            <span class="cond-name">{{ cond.name }}</span>
          </button>
        }
      </div>

      @if (selected()) {
        <div class="duration-row">
          <label class="dur-label">Duration (rounds, optional):</label>
          <input
            class="dur-input"
            type="number"
            min="1"
            placeholder="∞"
            [(ngModel)]="durationRounds"
          />
          <button
            class="add-btn"
            (click)="confirm()"
          >Add {{ selected()!.icon }} {{ selected()!.name }}</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .picker-container { display: flex; flex-direction: column; gap: 6px; }

    .search-input {
      width: 100%; height: 30px; border: 1px solid #bdbdbd;
      border-radius: 4px; padding: 0 8px; font-size: 13px; box-sizing: border-box;
    }
    .search-input:focus { outline: none; border-color: #3f51b5; }

    .condition-list {
      display: flex; flex-wrap: wrap; gap: 4px;
      max-height: 140px; overflow-y: auto;
    }

    .cond-btn {
      display: flex; align-items: center; gap: 3px;
      padding: 3px 7px; border-radius: 12px; border: 1px solid #bdbdbd;
      background: #f5f5f5; cursor: pointer; font-size: 12px;
      transition: background 0.15s, border-color 0.15s;
    }
    .cond-btn:hover { background: #e3f2fd; border-color: #1976d2; }
    .cond-btn.selected { background: #1976d2; border-color: #1565c0; color: #fff; }
    .cond-icon { font-size: 14px; }
    .cond-name { white-space: nowrap; }

    .duration-row {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 0; border-top: 1px solid #e0e0e0;
    }
    .dur-label { font-size: 12px; color: rgba(0,0,0,.6); white-space: nowrap; }
    .dur-input {
      width: 56px; height: 28px; border: 1px solid #bdbdbd;
      border-radius: 4px; padding: 0 6px; font-size: 13px;
    }
    .add-btn {
      padding: 4px 10px; background: #3f51b5; color: #fff;
      border: none; border-radius: 4px; cursor: pointer; font-size: 13px;
      white-space: nowrap;
    }
    .add-btn:hover { background: #303f9f; }
  `],
})
export class ConditionPickerComponent implements OnChanges {
  @Input() conditions: ConditionDefinition[] = [];
  @Output() conditionAdded = new EventEmitter<ConditionSelection>();

  searchText = '';
  durationRounds: number | null = null;
  selected = signal<ConditionDefinition | null>(null);
  filtered = signal<ConditionDefinition[]>([]);

  ngOnChanges() {
    this.filterConditions();
  }

  filterConditions() {
    const term = this.searchText.toLowerCase().trim();
    this.filtered.set(
      term
        ? this.conditions.filter(c => c.name.toLowerCase().includes(term))
        : [...this.conditions]
    );
  }

  select(cond: ConditionDefinition) {
    this.selected.set(this.selected()?.name === cond.name ? null : cond);
    this.durationRounds = null;
  }

  confirm() {
    const cond = this.selected();
    if (!cond) return;
    this.conditionAdded.emit({
      name: cond.name,
      durationRounds: this.durationRounds ?? undefined,
    });
    // Reset picker
    this.selected.set(null);
    this.durationRounds = null;
    this.searchText = '';
    this.filterConditions();
  }
}
