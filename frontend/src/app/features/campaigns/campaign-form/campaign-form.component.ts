import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Campaign } from '../../../shared/models/campaign.model';

@Component({
  selector: 'gm-campaign-form',
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
    <h2 mat-dialog-title>{{ data?.id ? 'Edit Campaign' : 'New Campaign' }}</h2>
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
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field class="full-width">
          <mat-label>Ruleset</mat-label>
          <mat-select formControlName="ruleset">
            <mat-option value="DND_5E">D&amp;D 5th Edition</mat-option>
            <mat-option value="GENERIC">Generic</mat-option>
          </mat-select>
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
    .form-grid { display: flex; flex-direction: column; min-width: 380px; padding-top: 8px; }
    .full-width { width: 100%; }
  `],
})
export class CampaignFormComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CampaignFormComponent>);
  readonly data: Campaign | null = inject(MAT_DIALOG_DATA);

  form = this.fb.group({
    name: [this.data?.name ?? '', [Validators.required, Validators.maxLength(255)]],
    description: [this.data?.description ?? ''],
    ruleset: [this.data?.ruleset ?? 'DND_5E', Validators.required],
  });

  save() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
