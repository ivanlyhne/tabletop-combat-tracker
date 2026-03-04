import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Character } from '../../../shared/models/character.model';

@Component({
  selector: 'gm-character-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data?.id ? 'Edit Character' : 'New Character' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" />
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>Name is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field class="full-width">
          <mat-label>Type</mat-label>
          <mat-select formControlName="characterType">
            <mat-option value="PC">Player Character</mat-option>
            <mat-option value="ALLIED_NPC">Allied NPC</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="row-2">
          <mat-form-field>
            <mat-label>Max HP</mat-label>
            <input matInput type="number" formControlName="maxHp" min="1" />
            @if (form.get('maxHp')?.hasError('min')) {
              <mat-error>Must be at least 1</mat-error>
            }
          </mat-form-field>

          <mat-form-field>
            <mat-label>Armor Class</mat-label>
            <input matInput type="number" formControlName="armorClass" min="1" />
          </mat-form-field>
        </div>

        <div class="row-2">
          <mat-form-field>
            <mat-label>Initiative Modifier</mat-label>
            <input matInput type="number" formControlName="initiativeModifier" />
          </mat-form-field>

          <mat-form-field>
            <mat-label>Speed (ft)</mat-label>
            <input matInput type="number" formControlName="speed" min="0" />
          </mat-form-field>
        </div>

        <mat-form-field class="full-width">
          <mat-label>Passive Perception</mat-label>
          <input matInput type="number" formControlName="passivePerception" />
        </mat-form-field>

        <mat-form-field class="full-width">
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid">
        {{ data?.id ? 'Save Changes' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-grid { display: flex; flex-direction: column; min-width: 420px; padding-top: 8px; }
    .full-width { width: 100%; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  `],
})
export class CharacterFormComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CharacterFormComponent>);
  readonly data: Character | null = inject(MAT_DIALOG_DATA);

  form = this.fb.group({
    name: [this.data?.name ?? '', [Validators.required, Validators.maxLength(255)]],
    characterType: [this.data?.characterType ?? 'PC'],
    initiativeModifier: [this.data?.initiativeModifier ?? 0],
    armorClass: [this.data?.armorClass ?? 10, [Validators.required, Validators.min(1)]],
    maxHp: [this.data?.maxHp ?? 1, [Validators.required, Validators.min(1)]],
    speed: [this.data?.speed ?? 30, [Validators.min(0)]],
    passivePerception: [this.data?.passivePerception ?? null],
    notes: [this.data?.notes ?? ''],
  });

  save() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
