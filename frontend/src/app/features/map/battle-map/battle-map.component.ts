import {
  Component, Input, Output, EventEmitter,
  AfterViewInit, OnChanges, OnDestroy, SimpleChanges,
  ViewChild, ElementRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import Konva from 'konva';
import { MapConfig, AnnotationConfig, AnnotationRequest } from '../../../shared/models/map.model';
import { Combatant } from '../../../shared/models/encounter.model';
import { MapApiService } from '../../../core/api/map.service';
import { CombatApiService } from '../../../core/api/combat.service';

type ActiveTool = 'select' | 'marker' | 'area' | 'text';

@Component({
  selector: 'gm-battle-map',
  standalone: true,
  imports: [CommonModule, MatButtonToggleModule, MatIconModule, MatTooltipModule, OverlayModule],
  template: `
    <!-- Toolbar -->
    <div class="map-toolbar">
      <mat-button-toggle-group [(value)]="activeTool" class="tool-group">
        <mat-button-toggle value="select" matTooltip="Select / Move tokens">
          <mat-icon>pan_tool</mat-icon>
        </mat-button-toggle>
        <mat-button-toggle value="marker" matTooltip="Place marker">
          <mat-icon>place</mat-icon>
        </mat-button-toggle>
        <mat-button-toggle value="area" matTooltip="Draw area">
          <mat-icon>radio_button_unchecked</mat-icon>
        </mat-button-toggle>
        <mat-button-toggle value="text" matTooltip="Add label">
          <mat-icon>text_fields</mat-icon>
        </mat-button-toggle>
      </mat-button-toggle-group>
      <span class="grid-info">
        {{ map.widthCells }}×{{ map.heightCells }} cells · {{ map.cellSizeFt }}ft/cell
      </span>
    </div>

    <!-- Konva canvas container -->
    <div class="map-scroll-wrapper">
      <div #mapContainer class="map-container"></div>
    </div>

    <!-- Token popup overlay anchor -->
    <div #popupAnchor class="popup-anchor"></div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; width: 100%; height: 100%; overflow: hidden; }
    .map-toolbar {
      display: flex; align-items: center; gap: 12px;
      padding: 4px 8px; background: #263238; border-bottom: 1px solid #37474f;
      flex-shrink: 0;
    }
    .tool-group { background: transparent; }
    .tool-group ::ng-deep .mat-button-toggle { color: #90a4ae; border-color: #455a64; }
    .tool-group ::ng-deep .mat-button-toggle-checked { color: #fff; background: #37474f; }
    .grid-info { color: #90a4ae; font-size: 12px; margin-left: auto; }
    .map-scroll-wrapper { flex: 1; overflow: auto; background: #1a1a2e; }
    .map-container { display: inline-block; }
    .popup-anchor { position: fixed; pointer-events: none; }
  `],
})
export class BattleMapComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() map!: MapConfig;
  @Input() combatants: Combatant[] = [];
  @Input() activeCombatantId: string | null = null;
  @Input() encounterId!: string;
  @Input() annotations: AnnotationConfig[] = [];

  @Output() annotationCreated = new EventEmitter<AnnotationConfig>();
  @Output() annotationDeleted = new EventEmitter<string>();

  @ViewChild('mapContainer') containerRef!: ElementRef<HTMLDivElement>;

  activeTool: ActiveTool = 'select';

  private combatApi = inject(CombatApiService);
  private mapApi = inject(MapApiService);

  private stage!: Konva.Stage;
  private bgLayer!: Konva.Layer;
  private gridLayer!: Konva.Layer;
  private tokenLayer!: Konva.Layer;
  private annotationLayer!: Konva.Layer;

  // Popup tracking
  private popupOverlayRef: OverlayRef | null = null;
  private selectedTokenId: string | null = null;

  ngAfterViewInit(): void {
    this.initStage();
    this.drawAll();
    this.bindStageClick();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.stage) return;
    if (changes['combatants'] || changes['activeCombatantId']) {
      this.drawTokens();
    }
    if (changes['annotations']) {
      this.drawAnnotations();
    }
    if (changes['map'] && !changes['map'].firstChange) {
      this.stage.width(this.map.widthCells * this.map.cellSizePx);
      this.stage.height(this.map.heightCells * this.map.cellSizePx);
      this.drawAll();
    }
  }

  ngOnDestroy(): void {
    this.closePopup();
    this.stage?.destroy();
  }

  // ── Stage init ────────────────────────────────────────────────────────────

  private initStage(): void {
    const width = this.map.widthCells * this.map.cellSizePx;
    const height = this.map.heightCells * this.map.cellSizePx;

    this.stage = new Konva.Stage({
      container: this.containerRef.nativeElement,
      width,
      height,
    });

    this.bgLayer = new Konva.Layer();
    this.gridLayer = new Konva.Layer();
    this.tokenLayer = new Konva.Layer();
    this.annotationLayer = new Konva.Layer();

    this.stage.add(this.bgLayer, this.gridLayer, this.annotationLayer, this.tokenLayer);
  }

  private drawAll(): void {
    this.drawBackground();
    this.drawGrid();
    this.drawAnnotations();
    this.drawTokens();
  }

  // ── Background ────────────────────────────────────────────────────────────

  private drawBackground(): void {
    this.bgLayer.destroyChildren();
    const { widthCells, heightCells, cellSizePx, backgroundImageUrl } = this.map;
    const w = widthCells * cellSizePx;
    const h = heightCells * cellSizePx;

    // Fill background
    this.bgLayer.add(new Konva.Rect({ x: 0, y: 0, width: w, height: h, fill: '#2d3748' }));

    if (backgroundImageUrl) {
      const img = new Image();
      img.onload = () => {
        this.bgLayer.add(new Konva.Image({ image: img, x: 0, y: 0, width: w, height: h }));
        this.bgLayer.draw();
      };
      img.src = backgroundImageUrl;
    } else {
      this.bgLayer.draw();
    }
  }

  // ── Grid ──────────────────────────────────────────────────────────────────

  drawGrid(): void {
    this.gridLayer.destroyChildren();
    if (this.map.gridType === 'HEX') {
      this.drawHexGrid();
    } else {
      this.drawSquareGrid();
    }
  }

  private drawSquareGrid(): void {
    const { widthCells, heightCells, cellSizePx, gridColor } = this.map;

    for (let x = 0; x <= widthCells; x++) {
      this.gridLayer.add(new Konva.Line({
        points: [x * cellSizePx, 0, x * cellSizePx, heightCells * cellSizePx],
        stroke: gridColor,
        strokeWidth: 1,
        listening: false,
      }));
    }
    for (let y = 0; y <= heightCells; y++) {
      this.gridLayer.add(new Konva.Line({
        points: [0, y * cellSizePx, widthCells * cellSizePx, y * cellSizePx],
        stroke: gridColor,
        strokeWidth: 1,
        listening: false,
      }));
    }
    this.gridLayer.draw();
  }

  /** Flat-top hex grid. Each cell's center: (col * hexWidth * 0.75, row * hexHeight + offset). */
  private drawHexGrid(): void {
    const { widthCells, heightCells, cellSizePx, gridColor } = this.map;
    const r = cellSizePx / 2;
    const hexHeight = Math.sqrt(3) * r;
    const hexWidth = 2 * r;

    for (let col = 0; col < widthCells; col++) {
      for (let row = 0; row < heightCells; row++) {
        const cx = col * hexWidth * 0.75 + r;
        const cy = row * hexHeight + hexHeight / 2 + (col % 2 !== 0 ? hexHeight / 2 : 0);
        const corners: number[] = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * 60 * Math.PI) / 180; // flat-top: 0° = right
          corners.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
        }
        this.gridLayer.add(new Konva.Line({
          points: corners,
          stroke: gridColor,
          strokeWidth: 1,
          closed: true,
          listening: false,
        }));
      }
    }
    this.gridLayer.draw();
  }

  // ── Tokens ────────────────────────────────────────────────────────────────

  drawTokens(): void {
    this.tokenLayer.destroyChildren();
    for (const combatant of this.combatants) {
      if (!combatant.active) continue;
      this.tokenLayer.add(this.createToken(combatant));
    }
    this.tokenLayer.draw();
  }

  private createToken(combatant: Combatant): Konva.Group {
    const { cellSizePx } = this.map;
    const x = (combatant.positionX ?? 0) * cellSizePx;
    const y = (combatant.positionY ?? 0) * cellSizePx;
    const isActive = combatant.id === this.activeCombatantId;

    const group = new Konva.Group({
      x, y,
      draggable: this.activeTool === 'select',
      id: combatant.id,
    });

    // Token circle
    group.add(new Konva.Circle({
      x: cellSizePx / 2,
      y: cellSizePx / 2,
      radius: cellSizePx * 0.4,
      fill: combatant.tokenColor ?? '#4a90e2',
      stroke: isActive ? '#ffcc00' : '#ffffff',
      strokeWidth: isActive ? 3 : 1,
    }));

    // Initials label
    const initials = combatant.displayName.substring(0, 2).toUpperCase();
    group.add(new Konva.Text({
      x: 0,
      y: cellSizePx * 0.35,
      width: cellSizePx,
      text: initials,
      fontSize: cellSizePx * 0.3,
      fill: '#ffffff',
      align: 'center',
    }));

    // HP bar (below token)
    const hpRatio = combatant.maxHp > 0 ? combatant.currentHp / combatant.maxHp : 0;
    const barW = cellSizePx * 0.8;
    const barH = 4;
    const barX = cellSizePx * 0.1;
    const barY = cellSizePx - barH - 2;

    group.add(new Konva.Rect({ x: barX, y: barY, width: barW, height: barH, fill: '#555', cornerRadius: 2 }));
    group.add(new Konva.Rect({
      x: barX, y: barY,
      width: barW * hpRatio,
      height: barH,
      fill: hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.25 ? '#ff9800' : '#f44336',
      cornerRadius: 2,
    }));

    // Down/Dead indicator
    if (combatant.status === 'DOWN' || combatant.status === 'DEAD') {
      group.add(new Konva.Text({
        x: 0, y: cellSizePx * 0.1, width: cellSizePx,
        text: combatant.status === 'DEAD' ? '✕' : '💀',
        fontSize: cellSizePx * 0.35, align: 'center', fill: '#f44336',
      }));
    }

    // Snap-to-grid on drag end + persist position
    group.on('dragend', () => {
      const snappedX = Math.round(group.x() / cellSizePx) * cellSizePx;
      const snappedY = Math.round(group.y() / cellSizePx) * cellSizePx;
      group.position({ x: snappedX, y: snappedY });
      this.tokenLayer.draw();

      const gridX = Math.round(snappedX / cellSizePx);
      const gridY = Math.round(snappedY / cellSizePx);
      this.combatApi.moveCombatant(this.encounterId, combatant.id, gridX, gridY).subscribe();
    });

    // Token click → show popup
    group.on('click tap', (evt) => {
      evt.cancelBubble = true;
      this.showTokenPopup(combatant, group.getAbsolutePosition());
    });

    return group;
  }

  // ── Token popup ───────────────────────────────────────────────────────────

  private showTokenPopup(combatant: Combatant, pos: { x: number; y: number }): void {
    this.closePopup();
    this.selectedTokenId = combatant.id;

    // Build a simple floating info card using a native div (no CDK portal needed for MVP)
    const existing = document.getElementById('token-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'token-popup';
    popup.style.cssText = `
      position: fixed;
      left: ${pos.x + 8}px;
      top: ${pos.y + 8}px;
      background: #263238;
      color: #fff;
      border: 1px solid #455a64;
      border-radius: 6px;
      padding: 10px 14px;
      z-index: 1000;
      font-size: 13px;
      min-width: 160px;
      box-shadow: 0 4px 12px rgba(0,0,0,.5);
      pointer-events: auto;
    `;

    const conditions = combatant.conditions.map(c => c.name).join(', ') || 'None';
    popup.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px">${combatant.displayName}</div>
      <div>HP: ${combatant.currentHp} / ${combatant.maxHp}${combatant.tempHp > 0 ? ` (+${combatant.tempHp})` : ''}</div>
      <div>AC: ${combatant.armorClass}</div>
      <div>Status: ${combatant.status}</div>
      <div style="margin-top:4px;font-size:11px;color:#90a4ae">Conditions: ${conditions}</div>
      <div style="margin-top:8px;text-align:right">
        <button onclick="document.getElementById('token-popup').remove()"
          style="background:transparent;border:none;color:#90a4ae;cursor:pointer;font-size:11px">✕ Close</button>
      </div>
    `;

    document.body.appendChild(popup);

    // Close on outside click
    setTimeout(() => {
      const handler = (e: MouseEvent) => {
        if (!popup.contains(e.target as Node)) {
          popup.remove();
          document.removeEventListener('click', handler);
        }
      };
      document.addEventListener('click', handler);
    }, 50);
  }

  private closePopup(): void {
    document.getElementById('token-popup')?.remove();
    this.selectedTokenId = null;
  }

  // ── Annotations ───────────────────────────────────────────────────────────

  drawAnnotations(): void {
    this.annotationLayer.destroyChildren();
    for (const ann of this.annotations) {
      this.drawAnnotation(ann);
    }
    this.annotationLayer.draw();
  }

  private drawAnnotation(ann: AnnotationConfig): void {
    const { cellSizePx } = this.map;
    const px = ann.position.x * cellSizePx;
    const py = ann.position.y * cellSizePx;

    const group = new Konva.Group({ x: px, y: py, id: ann.id });

    if (ann.annotationType === 'MARKER') {
      group.add(new Konva.RegularPolygon({
        x: cellSizePx / 2, y: cellSizePx / 2,
        sides: 3, radius: cellSizePx * 0.3,
        fill: ann.color, stroke: '#fff', strokeWidth: 1,
        rotation: 180,
      }));
    } else if (ann.annotationType === 'AREA') {
      const r = ann.position.radius ?? 1;
      group.add(new Konva.Circle({
        x: cellSizePx / 2, y: cellSizePx / 2,
        radius: r * cellSizePx,
        fill: ann.color + '44', stroke: ann.color, strokeWidth: 2,
      }));
    }

    if (ann.label) {
      group.add(new Konva.Text({
        x: 0, y: -16, width: cellSizePx * 2,
        text: ann.label, fontSize: 12, fill: '#fff',
        shadowColor: '#000', shadowBlur: 3,
      }));
    }

    // Right-click to delete
    group.on('contextmenu', (evt) => {
      evt.evt.preventDefault();
      evt.cancelBubble = true;
      this.mapApi.deleteAnnotation(this.encounterId, ann.id).subscribe(() => {
        group.destroy();
        this.annotationLayer.draw();
        this.annotationDeleted.emit(ann.id);
      });
    });

    this.annotationLayer.add(group);
  }

  // ── Stage click → place annotation ───────────────────────────────────────

  private bindStageClick(): void {
    this.stage.on('click', (evt) => {
      if (this.activeTool === 'select' || evt.target !== this.stage) return;

      const pos = this.stage.getPointerPosition()!;
      const { cellSizePx } = this.map;
      const gridX = Math.floor(pos.x / cellSizePx);
      const gridY = Math.floor(pos.y / cellSizePx);

      const req: AnnotationRequest = {
        annotationType: this.activeTool === 'marker' ? 'MARKER'
          : this.activeTool === 'area' ? 'AREA' : 'TEXT',
        position: { x: gridX, y: gridY, radius: this.activeTool === 'area' ? 1 : undefined },
      };

      this.mapApi.createAnnotation(this.encounterId, req).subscribe(ann => {
        this.drawAnnotation(ann);
        this.annotationLayer.draw();
        this.annotationCreated.emit(ann);
      });
    });
  }
}
