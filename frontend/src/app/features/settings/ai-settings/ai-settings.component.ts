import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AiService } from '../../../core/api/ai.service';

@Component({
  selector: 'app-ai-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="settings-container">
      <mat-card class="settings-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="header-icon">smart_toy</mat-icon>
          <mat-card-title>AI Integration</mat-card-title>
          <mat-card-subtitle>Configure your AI provider for encounter generation</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (loadError()) {
            <div class="load-error">
              <mat-icon>error_outline</mat-icon>
              <span>{{ loadError() }}</span>
            </div>
          }

          <form [formGroup]="form" class="settings-form">

            <!-- Provider -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>AI Provider</mat-label>
              <mat-select formControlName="provider">
                <mat-option value="NONE">None (disabled)</mat-option>
                <mat-option value="CLAUDE">Anthropic Claude</mat-option>
                <mat-option value="PERPLEXITY">Perplexity AI</mat-option>
              </mat-select>
              <mat-hint>Select your preferred AI provider for encounter generation</mat-hint>
            </mat-form-field>

            @if (form.value.provider !== 'NONE') {

              <!-- API Key -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>API Key</mat-label>
                <input matInput type="password" formControlName="apiKey"
                  [placeholder]="hasExistingKey() ? '••••••••••••••••••• (stored securely)' : 'Enter your API key'">
                <mat-icon matSuffix matTooltip="Keys are encrypted with AES-256 before storage">lock</mat-icon>
                <mat-hint>
                  @if (hasExistingKey()) {
                    A key is already stored. Leave blank to keep it.
                  } @else {
                    Required to enable AI encounter generation.
                  }
                </mat-hint>
              </mat-form-field>

              <!-- Model ID -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Model ID</mat-label>
                <input matInput formControlName="modelName" [placeholder]="providerDefaultModel()">
                <mat-hint>
                  Leave blank for default.
                  @if (form.value.provider === 'CLAUDE') {
                    <a href="https://docs.anthropic.com/en/docs/about-claude/models/all-models"
                       target="_blank" rel="noopener" class="model-link">Browse Claude models ↗</a>
                  }
                  @if (form.value.provider === 'PERPLEXITY') {
                    <a href="https://docs.perplexity.ai/guides/model-cards"
                       target="_blank" rel="noopener" class="model-link">Browse Perplexity models ↗</a>
                  }
                </mat-hint>
              </mat-form-field>

              <!-- Max Tokens + Temperature -->
              <div class="row-fields">
                <mat-form-field appearance="outline" class="flex-field">
                  <mat-label>Max Tokens</mat-label>
                  <input matInput type="number" formControlName="maxTokens" min="256" max="8192">
                  <mat-hint>256 – 8192 (response length limit)</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline" class="flex-field">
                  <mat-label>Temperature</mat-label>
                  <input matInput type="number" formControlName="temperature" min="0" max="2" step="0.1">
                  <mat-hint>0.0 = focused · 2.0 = creative</mat-hint>
                </mat-form-field>
              </div>

            }
          </form>

          <!-- Test section (only shown when a key is already stored) -->
          @if (hasExistingKey() && form.value.provider !== 'NONE') {
            <mat-divider class="divider"></mat-divider>
            <div class="test-section">
              <p class="test-hint">
                <mat-icon class="hint-icon">info_outline</mat-icon>
                Test your stored API key by sending a minimal request to the provider.
              </p>
              <button mat-stroked-button color="accent"
                [disabled]="testing()"
                (click)="testConnection()">
                @if (testing()) {
                  <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner>
                  Testing…
                } @else {
                  <ng-container>
                    <mat-icon>wifi_tethering</mat-icon>
                    Test Connection
                  </ng-container>
                }
              </button>
            </div>
          }

        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button (click)="cancel()">Back to Campaigns</button>
          <button mat-raised-button color="primary"
            [disabled]="form.invalid || saving()"
            (click)="save()">
            @if (saving()) {
              <ng-container>
                <mat-spinner diameter="18" style="display:inline-block;margin-right:8px"></mat-spinner>
                Saving…
              </ng-container>
            } @else {
              <ng-container>
                <mat-icon>save</mat-icon>
                Save Settings
              </ng-container>
            }
          </button>
        </mat-card-actions>

      </mat-card>
    </div>
  `,
  styles: [`
    .settings-container {
      max-width: 600px;
      margin: 32px auto;
      padding: 0 16px;
    }
    .settings-card { padding-bottom: 16px; }
    .header-icon { color: #7c4dff; background: #ede7f6; border-radius: 50%; }
    .settings-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-top: 16px;
    }
    .full-width { width: 100%; }
    .row-fields { display: flex; gap: 16px; }
    .flex-field { flex: 1; }
    .divider { margin: 20px 0 16px; }
    .test-section {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    .test-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: rgba(0,0,0,.55);
      margin: 0;
    }
    .hint-icon { font-size: 16px; width: 16px; height: 16px; }
    .load-error {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .model-link { color: #b39ddb; text-decoration: none; margin-left: 4px; }
    .model-link:hover { text-decoration: underline; }
  `],
})
export class AiSettingsComponent implements OnInit {
  private aiService = inject(AiService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  hasExistingKey = signal(false);
  saving = signal(false);
  testing = signal(false);
  loadError = signal<string | null>(null);

  form = this.fb.group({
    provider:    ['NONE', Validators.required],
    apiKey:      [''],
    modelName:   [''],
    maxTokens:   [4096],
    temperature: [0.7],
  });

  ngOnInit() {
    this.aiService.getSettings().subscribe({
      next: (settings) => {
        this.hasExistingKey.set(settings.hasKey);
        this.form.patchValue({
          provider:    settings.provider,
          modelName:   settings.modelName ?? '',
          maxTokens:   settings.maxTokens,
          temperature: Number(settings.temperature),
        });
      },
      error: () => {
        this.loadError.set('Could not load AI settings. The backend may be unavailable.');
      },
    });
  }

  providerDefaultModel(): string {
    switch (this.form.value.provider) {
      case 'CLAUDE':      return 'claude-3-5-haiku-20241022';
      case 'PERPLEXITY':  return 'llama-3.1-sonar-small-128k-online';
      default:            return '';
    }
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.value;

    this.aiService.saveSettings({
      provider:    v.provider!,
      apiKey:      v.apiKey || null,
      modelName:   v.modelName || null,
      maxTokens:   v.maxTokens ?? null,
      temperature: v.temperature != null ? v.temperature : null,
    }).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.hasExistingKey.set(res.hasKey);
        this.form.patchValue({ apiKey: '' });
        this.snackBar.open('AI settings saved!', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? err?.error ?? 'Failed to save settings. Check your API key.';
        this.snackBar.open(typeof msg === 'string' ? msg : JSON.stringify(msg), 'Close', { duration: 6000 });
      },
    });
  }

  testConnection() {
    this.testing.set(true);
    this.aiService.testConnection().subscribe({
      next: (res) => {
        this.testing.set(false);
        this.snackBar.open(res.message ?? 'Connection successful!', 'Close', { duration: 4000 });
      },
      error: (err) => {
        this.testing.set(false);
        const msg = err?.error?.message ?? err?.error ?? 'Connection test failed';
        this.snackBar.open(typeof msg === 'string' ? msg : JSON.stringify(msg), 'Close', { duration: 6000 });
      },
    });
  }

  cancel() {
    this.router.navigate(['/campaigns']);
  }
}
