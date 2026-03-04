import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Monster } from '../../../shared/models/monster.model';

@Component({
  selector: 'gm-monster-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data?.id ? 'Edit Monster' : 'New Monster' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" />
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>Name is required</mat-error>
          }
        </mat-form-field>

        <div class="row-2">
          <mat-form-field>
            <mat-label>Challenge Rating</mat-label>
            <input matInput type="number" formControlName="challengeRating" min="0" step="0.125" />
          </mat-form-field>

          <mat-form-field>
            <mat-label>XP Value</mat-label>
            <input matInput type="number" formControlName="xpValue" min="0" />
          </mat-form-field>
        </div>

        <div class="row-2">
          <mat-form-field>
            <mat-label>HP Formula (e.g. 2d8+4)</mat-label>
            <input matInput formControlName="hpFormula" />
          </mat-form-field>

          <mat-form-field>
            <mat-label>Average HP</mat-label>
            <input matInput type="number" formControlName="hpAverage" min="1" />
            @if (form.get('hpAverage')?.hasError('min')) {
              <mat-error>Must be at least 1</mat-error>
            }
          </mat-form-field>
        </div>

        <div class="row-2">
          <mat-form-field>
            <mat-label>Armor Class</mat-label>
            <input matInput type="number" formControlName="armorClass" min="1" />
          </mat-form-field>

          <mat-form-field>
            <mat-label>Walk Speed (ft)</mat-label>
            <input matInput type="number" formControlName="walkSpeed" min="0" />
          </mat-form-field>
        </div>
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
    .form-grid { display: flex; flex-direction: column; min-width: 440px; padding-top: 8px; }
    .full-width { width: 100%; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  `],
})
export class MonsterFormComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<MonsterFormComponent>);
  readonly data: Monster | null = inject(MAT_DIALOG_DATA);

  form = this.fb.group({
    name: [this.data?.name ?? '', [Validators.required, Validators.maxLength(255)]],
    challengeRating: [this.data?.challengeRating ?? null],
    xpValue: [this.data?.xpValue ?? null],
    hpFormula: [this.data?.hpFormula ?? ''],
    hpAverage: [this.data?.hpAverage ?? 1, [Validators.required, Validators.min(1)]],
    armorClass: [this.data?.armorClass ?? 10, [Validators.required, Validators.min(1)]],
    walkSpeed: [(this.data?.speed?.['walk'] as number) ?? 30],
  });

  save() {
    if (this.form.valid) {
      const v = this.form.value;
      this.dialogRef.close({
        name: v.name,
        challengeRating: v.challengeRating,
        xpValue: v.xpValue,
        hpFormula: v.hpFormula,
        hpAverage: v.hpAverage,
        armorClass: v.armorClass,
        speed: { walk: v.walkSpeed ?? 30 },
      });
    }
  }
}
