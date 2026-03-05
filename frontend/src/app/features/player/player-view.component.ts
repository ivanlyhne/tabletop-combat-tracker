import { Component, OnInit, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { StompService } from '../../core/websocket/stomp.service';
import { MapApiService } from '../../core/api/map.service';
import { Encounter } from '../../shared/models/encounter.model';
import { MapConfig, AnnotationConfig } from '../../shared/models/map.model';
import { BattleMapComponent } from '../map/battle-map/battle-map.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-player-view',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule, MatChipsModule, MatCardModule,
    MatIconModule, MatToolbarModule,
    BattleMapComponent,
  ],
  template: `
    <div class="player-layout">

      <mat-toolbar color="primary" class="player-toolbar">
        <mat-icon>shield</mat-icon>
        <span class="title">{{ encounter()?.name ?? 'Combat' }}</span>
        <span class="spacer"></span>
        @if (encounter()?.currentRound) {
          <span class="round-badge">Round {{ encounter()!.currentRound }}</span>
        }
        <span class="status-chip" [attr.data-status]="encounter()?.status">
          {{ encounter()?.status ?? '' }}
        </span>
      </mat-toolbar>

      @if (!encounter()) {
        <div class="loading-center">
          <mat-spinner></mat-spinner>
          <p>Connecting to combat…</p>
        </div>
      } @else {
        <div class="content">

          <!-- Active combatant banner -->
          @if (activeCombatant()) {
            <div class="active-banner">
              <mat-icon>star</mat-icon>
              <span>It's <strong>{{ activeCombatant()!.displayName }}</strong>'s turn!</span>
            </div>
          }

          <!-- Combatant cards -->
          <div class="combatant-grid">
            @for (c of encounter()!.combatants; track c.id) {
              <mat-card class="combatant-card"
                        [class.active]="c.id === activeCombatantId()"
                        [class.down]="c.status === 'DOWN' || c.status === 'DEAD'">
                <mat-card-content>
                  <div class="card-header">
                    <span class="token" [style.background]="c.tokenColor || '#607d8b'">
                      {{ c.displayName.charAt(0) }}
                    </span>
                    <div class="name-block">
                      <div class="combatant-name">{{ c.displayName }}</div>
                      <div class="combatant-type">{{ c.playerCharacter ? 'Player' : 'NPC' }}</div>
                    </div>
                    <div class="status-dot" [attr.data-status]="c.status">
                      {{ statusLabel(c.status) }}
                    </div>
                  </div>

                  <!-- HP bar -->
                  @if (c.playerCharacter || c.visibleToPlayers) {
                    <div class="hp-section">
                      <div class="hp-label">
                        HP {{ c.currentHp }} / {{ c.maxHp }}
                        @if (c.tempHp > 0) { (+{{ c.tempHp }} temp) }
                      </div>
                      <div class="hp-bar-track">
                        <div class="hp-bar-fill"
                             [style.width.%]="hpPercent(c.currentHp, c.maxHp)"
                             [class.hp-low]="hpPercent(c.currentHp, c.maxHp) < 30"
                             [class.hp-med]="hpPercent(c.currentHp, c.maxHp) >= 30 && hpPercent(c.currentHp, c.maxHp) < 60">
                        </div>
                      </div>
                    </div>
                  }

                  <!-- Conditions -->
                  @if (c.conditions.length > 0) {
                    <div class="conditions-row">
                      @for (cond of c.conditions; track cond.name) {
                        <span class="cond-tag">{{ cond.name }}</span>
                      }
                    </div>
                  }

                  <!-- Initiative -->
                  @if (c.initiativeValue !== null) {
                    <div class="init-label">Initiative: {{ c.initiativeValue }}</div>
                  }
                </mat-card-content>
              </mat-card>
            }
          </div>

          <!-- Battle Map (read-only) -->
          @if (encounter()?.mapId && activeMap()) {
            <div class="player-map-container">
              <gm-battle-map
                [map]="activeMap()!"
                [combatants]="encounter()!.combatants"
                [activeCombatantId]="activeCombatantId()"
                [encounterId]="encounterId"
                [annotations]="annotations()"
                [readonly]="true">
              </gm-battle-map>
            </div>
          }

          @if (encounter()!.combatants.length === 0) {
            <div class="empty-state">
              <mat-icon>hourglass_empty</mat-icon>
              <p>Combat hasn't started yet.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #1a1a2e; color: #eee; font-family: sans-serif; }
    .player-layout { display: flex; flex-direction: column; min-height: 100vh; }
    .player-toolbar { background: #16213e !important; gap: 10px; }
    .title { font-size: 18px; font-weight: 700; }
    .spacer { flex: 1; }
    .round-badge {
      font-size: 13px; background: rgba(255,255,255,.15);
      padding: 2px 10px; border-radius: 10px;
    }
    .status-chip {
      font-size: 12px; padding: 2px 10px; border-radius: 10px;
      background: #27ae60; color: #fff; margin-left: 6px;
    }
    .status-chip[data-status="PAUSED"]  { background: #f39c12; }
    .status-chip[data-status="ENDED"]   { background: #7f8c8d; }
    .status-chip[data-status="DRAFT"],
    .status-chip[data-status="SETUP"]   { background: #2980b9; }

    .loading-center {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 16px; color: #888;
    }

    .content { padding: 16px; }

    .active-banner {
      display: flex; align-items: center; gap: 10px;
      background: linear-gradient(90deg, #27ae60, #2ecc71);
      color: #fff; padding: 12px 20px; border-radius: 10px;
      font-size: 18px; font-weight: 700; margin-bottom: 20px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(39,174,96,.5); }
      50%       { box-shadow: 0 0 0 10px rgba(39,174,96,0); }
    }

    .combatant-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px;
    }

    .combatant-card {
      background: #16213e !important; color: #eee !important;
      border: 2px solid transparent; border-radius: 12px !important;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .combatant-card.active {
      border-color: #27ae60; box-shadow: 0 0 16px rgba(39,174,96,.4);
    }
    .combatant-card.down {
      opacity: .55; border-color: #c0392b;
    }

    .card-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
    }
    .token {
      width: 38px; height: 38px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 900; color: #fff; flex-shrink: 0;
    }
    .name-block { flex: 1; min-width: 0; }
    .combatant-name { font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .combatant-type { font-size: 11px; color: #888; text-transform: uppercase; }
    .status-dot {
      font-size: 11px; padding: 2px 8px; border-radius: 8px;
      background: #27ae60; color: #fff;
    }
    .status-dot[data-status="DOWN"] { background: #e74c3c; }
    .status-dot[data-status="DEAD"] { background: #7f8c8d; }
    .status-dot[data-status="FLED"] { background: #f39c12; }

    .hp-section { margin-bottom: 8px; }
    .hp-label { font-size: 12px; color: #aaa; margin-bottom: 4px; }
    .hp-bar-track {
      height: 8px; background: #0f3460; border-radius: 4px; overflow: hidden;
    }
    .hp-bar-fill {
      height: 100%; background: #27ae60; border-radius: 4px;
      transition: width 0.4s ease;
    }
    .hp-bar-fill.hp-med { background: #f39c12; }
    .hp-bar-fill.hp-low { background: #e74c3c; }

    .conditions-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .cond-tag {
      font-size: 11px; padding: 2px 8px; border-radius: 10px;
      background: #0f3460; color: #7ec8e3; border: 1px solid #2980b9;
    }

    .init-label { font-size: 11px; color: #888; margin-top: 6px; }

    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; color: #555; margin-top: 60px; font-size: 18px;
    }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }

    .player-map-container {
      height: 60vh;
      margin-top: 16px;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.1);
    }
  `],
})
export class PlayerViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private stomp = inject(StompService);
  private mapApi = inject(MapApiService);
  private destroyRef = inject(DestroyRef);

  encounterId = this.route.snapshot.paramMap.get('encounterId')!;

  encounter = signal<Encounter | null>(null);
  activeMap = signal<MapConfig | null>(null);
  annotations = signal<AnnotationConfig[]>([]);

  activeCombatantId = computed(() => {
    const enc = this.encounter();
    if (!enc || enc.initiativeOrder.length === 0) return null;
    return enc.initiativeOrder[enc.activeCombatantIndex] ?? null;
  });

  activeCombatant = computed(() => {
    const enc = this.encounter();
    const id = this.activeCombatantId();
    if (!enc || !id) return null;
    return enc.combatants.find(c => c.id === id) ?? null;
  });

  ngOnInit() {
    const id = this.encounterId;

    // Public endpoint — no auth header needed
    this.http.get<Encounter>(`${environment.apiUrl}/player/encounters/${id}`)
      .subscribe({
        next: enc => {
          this.encounter.set(enc);
          if (enc.mapId) {
            this.mapApi.getByIdPublic(enc.mapId).subscribe(map => this.activeMap.set(map));
            this.mapApi.getAnnotationsPublic(id).subscribe(anns => this.annotations.set(anns));
          }
        }
      });

    // Real-time updates via STOMP (WebSocket is unauthenticated)
    this.stomp.subscribeToEncounter(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(msg => {
        // Filter to visible combatants on the client side too
        const filtered = {
          ...msg.encounterState,
          combatants: msg.encounterState.combatants.filter(c => c.visibleToPlayers || c.playerCharacter),
        };
        this.encounter.set(filtered as Encounter);
        // Reload annotations on state updates in case GM added/removed some
        if (filtered.mapId) {
          this.mapApi.getAnnotationsPublic(id).subscribe(anns => this.annotations.set(anns));
        }
      });
  }

  hpPercent(current: number, max: number): number {
    if (max === 0) return 0;
    return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      ALIVE: '✓ Alive', DOWN: '⬇ Down', DEAD: '💀 Dead', FLED: '↩ Fled',
    };
    return map[status] ?? status;
  }
}
