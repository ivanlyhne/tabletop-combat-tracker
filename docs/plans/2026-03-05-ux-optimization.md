# UX Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Overhaul the GM Combat Tracker UI across all 9 pages based on collected user feedback, improving visual design, usability, and key player-facing feature gaps.

**Architecture:** Primarily Angular standalone component changes (inline templates + styles). One small backend change (Monster HP consolidation removes hpAverage from form, backend derives it). Encounter board-size field needs a Flyway V2 migration + EncounterRequest DTO update. Global styles live in `frontend/src/styles.scss`.

**Tech Stack:** Angular 21 standalone, Angular Material M3 dark theme, Konva.js, Spring Boot 3 / Java 21, Flyway migrations, STOMP WebSocket.

---

## Feedback Summary (collected across 9 pages)

| Page | Feedback |
|------|---------|
| All  | D&D SVG tile background on body; tighter spacing; section headings unreadable (dark on dark) |
| Campaigns / Characters / Monsters | Remove `max-width: 1000px; margin: 0 auto` — fill screen width |
| Monsters | Remove "Avg HP" concept — single HP field (formula only); backend derives average |
| Encounter Setup | Top cut off / no scroll; monster table overflows; remove Objectives, Terrain Notes, Loot Notes; add tooltip to Estimated Difficulty |
| AI Settings | Rename "Model Name" → "Model ID"; add link to Anthropic models page |
| Combat View | Guidance banner; initiative prominent per combatant; remove broken toolbar buttons; dynamic map size; better headings |
| Player View | GM needs a "Copy Link" button; player view needs battle map (read-only); navigation header |

---

## Task 1: Global – D&D SVG Background Pattern

**Files:**
- Modify: `frontend/src/styles.scss`

**What to do:**
Add a repeating SVG tile background to `body` — stroke-only d20 (icosahedron hex), crossed swords, and a shield at ~4% white opacity, tiled every 120px. This gives the dark background a subtle D&D feel without overwhelming the UI content.

**Step 1: Add SVG background to body in styles.scss**

Replace the `html, body` block in `frontend/src/styles.scss` with:

```scss
html, body {
  height: 100%;
  margin: 0;
  font-family: Roboto, "Helvetica Neue", sans-serif;
  background-color: #1a1a2e;
  color: #e0e0e0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cg fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1.2'%3E%3C!-- d20 (simplified hexagon with inner lines) --%3E%3Cpolygon points='60,8 82,22 82,50 60,64 38,50 38,22' /%3E%3Cline x1='60' y1='8' x2='60' y2='64'/%3E%3Cline x1='38' y1='22' x2='82' y2='50'/%3E%3Cline x1='82' y1='22' x2='38' y2='50'/%3E%3C!-- crossed swords (bottom-left area) --%3E%3Cline x1='10' y1='78' x2='36' y2='104'/%3E%3Cline x1='14' y1='78' x2='14' y2='86'/%3E%3Cline x1='10' y1='82' x2='18' y2='82'/%3E%3Cline x1='30' y1='104' x2='30' y2='96'/%3E%3Cline x1='26' y1='100' x2='34' y2='100'/%3E%3Cline x1='36' y1='78' x2='10' y2='104'/%3E%3Cline x1='40' y1='78' x2='40' y2='86'/%3E%3Cline x1='36' y1='82' x2='44' y2='82'/%3E%3Cline x1='12' y1='104' x2='12' y2='96'/%3E%3Cline x1='8' y1='100' x2='16' y2='100'/%3E%3C!-- shield (bottom-right area) --%3E%3Cpath d='M85,75 L105,75 L105,95 L95,108 L85,95 Z'/%3E%3Cline x1='95' y1='75' x2='95' y2='108'/%3E%3C/g%3E%3C/svg%3E");
  background-repeat: repeat;
}
```

**Step 2: Verify in browser**
Navigate to any page — the background should show faint d20/sword/shield icons tiling across the dark surface. They should be barely visible (decorative, not distracting).

**Step 3: Commit**
```bash
git add frontend/src/styles.scss
git commit -m "style: add D&D SVG tile background pattern to app body"
```

---

## Task 2: Global – Section Heading Colors & Spacing

**Files:**
- Modify: `frontend/src/styles.scss`

**Problem:** Section headings like "Party Members", "Monsters", "Basic Info" use `color: rgba(0,0,0,.6)` which is nearly invisible on the dark Material theme background.

**Step 1: Add global heading utility to styles.scss**

Append to `frontend/src/styles.scss`:

```scss
// Section headings — readable on dark background
.section-title {
  color: rgba(255, 255, 255, 0.75) !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

// Tighter mat-form-field density globally
.mat-mdc-form-field {
  --mat-form-field-container-vertical-padding: 8px;
}

// Compact card content padding
.mat-mdc-card-content {
  padding: 8px 16px !important;
}
```

**Step 2: Commit**
```bash
git add frontend/src/styles.scss
git commit -m "style: fix section heading colors and tighten global spacing"
```

---

## Task 3: Full-width List Pages (Campaigns, Characters, Monsters)

**Files:**
- Modify: `frontend/src/app/features/campaigns/campaign-list/campaign-list.component.ts`
- Modify: `frontend/src/app/features/characters/character-list/character-list.component.ts`
- Modify: `frontend/src/app/features/monsters/monster-list/monster-list.component.ts`

**Problem:** All three list pages have `.page-content { max-width: 1000px; margin: 0 auto }` which caps width and centres the table, wasting screen space.

**Step 1: Campaign list — remove max-width**

In `campaign-list.component.ts`, change the styles block:
```css
/* OLD */
.page-content { padding: 24px; max-width: 1000px; margin: 0 auto; }

/* NEW */
.page-content { padding: 24px 32px; }
```

**Step 2: Character list — same fix**

In `character-list.component.ts`:
```css
/* OLD */
.page-content { padding: 24px; max-width: 1000px; margin: 0 auto; }

/* NEW */
.page-content { padding: 24px 32px; }
```

**Step 3: Monster list — same fix**

In `monster-list.component.ts`:
```css
/* OLD */
.page-content { padding: 24px; max-width: 1000px; margin: 0 auto; }

/* NEW */
.page-content { padding: 24px 32px; }
```

**Step 4: Verify** — open each list page and confirm tables stretch to fill available width.

**Step 5: Commit**
```bash
git add frontend/src/app/features/campaigns/campaign-list/campaign-list.component.ts
git add frontend/src/app/features/characters/character-list/character-list.component.ts
git add frontend/src/app/features/monsters/monster-list/monster-list.component.ts
git commit -m "style: remove max-width constraint from list pages — fill screen width"
```

---

## Task 4: Monster HP Formula Consolidation

**Goal:** Remove the two-field model (hpFormula + hpAverage). The user enters one value — the HP formula or a flat number (e.g. `2d8+4` or `45`). The backend derives hpAverage from it using `DiceParser`.

**Files:**
- Modify: `frontend/src/app/features/monsters/monster-form/monster-form.component.ts`
- Modify: `frontend/src/app/features/monsters/monster-list/monster-list.component.ts`
- Modify: `frontend/src/app/shared/models/monster.model.ts`
- Modify: `backend/src/main/java/com/gm/combat/dto/monster/MonsterRequest.java`
- Modify: `backend/src/main/java/com/gm/combat/service/MonsterService.java` (read first)

### Backend changes

**Step 1: Read MonsterService.java** to find the `create` and `update` methods.

**Step 2: Update MonsterRequest.java** — make `hpAverage` optional (it will be auto-computed):

```java
package com.gm.combat.dto.monster;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;

public record MonsterRequest(
        @NotBlank String name,
        String ruleset,
        Double challengeRating,
        Integer xpValue,
        @Min(1) int armorClass,
        String hpFormula,
        // hpAverage is now optional — derived from hpFormula by MonsterService
        Integer hpAverage,
        Map<String, Integer> speed,
        Map<String, Integer> savingThrows,
        Map<String, Integer> skills,
        List<String> damageResistances,
        List<String> damageImmunities,
        List<String> damageVulnerabilities,
        List<String> conditionImmunities,
        List<Map<String, Object>> traits,
        List<Map<String, Object>> actions,
        List<String> environmentTags,
        String externalId,
        Map<String, Object> extraAttributes) {}
```

**Step 3: Update MonsterService create/update** — after reading the service, add HP derivation logic in both methods. Find where the Monster entity is built from the request and add:

```java
// Derive hpAverage from formula when not explicitly provided
int computedHpAverage = request.hpAverage() != null
    ? request.hpAverage()
    : DiceParser.average(request.hpFormula());  // DiceParser.average handles null → 0
```

Then use `computedHpAverage` when setting `monster.setHpAverage(...)`.

> If `DiceParser` doesn't have an `average()` method yet, add one: parse the formula (e.g. `2d8+4` → rolls 2 eight-sided dice + 4 → average = 2×4.5+4 = 13). For flat numbers like `"45"`, just parse as int. Return 1 as default if null.

**Step 4: Add DiceParser.average() if missing** — check `backend/src/main/java/com/gm/combat/util/DiceParser.java`. If no average method exists, add:

```java
/** Returns the statistical average of a dice expression (e.g. "2d8+4" → 13). */
public static int average(String formula) {
    if (formula == null || formula.isBlank()) return 1;
    try {
        // Try plain integer first
        return Integer.parseInt(formula.trim());
    } catch (NumberFormatException ignored) {}
    // Simple NdX+C parser
    String f = formula.trim().toLowerCase();
    java.util.regex.Matcher m = java.util.regex.Pattern
        .compile("(\\d+)d(\\d+)([+-]\\d+)?")
        .matcher(f);
    if (m.find()) {
        int count  = Integer.parseInt(m.group(1));
        int sides  = Integer.parseInt(m.group(2));
        int bonus  = m.group(3) != null ? Integer.parseInt(m.group(3)) : 0;
        return (int) Math.round(count * ((sides + 1) / 2.0)) + bonus;
    }
    return 1;
}
```

### Frontend changes

**Step 5: Update monster-form.component.ts** — remove the "Average HP" field entirely; rename "HP Formula" label to just "HP":

Remove this from the template:
```html
<mat-form-field>
  <mat-label>Average HP</mat-label>
  <input matInput type="number" formControlName="hpAverage" min="1" />
  @if (form.get('hpAverage')?.hasError('min')) {
    <mat-error>Must be at least 1</mat-error>
  }
</mat-form-field>
```

Change the HP Formula field label:
```html
<!-- OLD -->
<mat-label>HP Formula (e.g. 2d8+4)</mat-label>

<!-- NEW -->
<mat-label>HP (e.g. 2d8+4 or 45)</mat-label>
```

In the form group, remove `hpAverage` and make `hpFormula` required:
```typescript
// OLD
hpFormula: [this.data?.hpFormula ?? ''],
hpAverage: [this.data?.hpAverage ?? 1, [Validators.required, Validators.min(1)]],

// NEW
hpFormula: [this.data?.hpFormula ?? '', [Validators.required]],
```

In the `.row-2` containing those two fields, it will now only have one field — change to single column:
```html
<!-- The row-2 div now wraps only hpFormula, change to full-width -->
<mat-form-field class="full-width">
  <mat-label>HP (e.g. 2d8+4 or 45)</mat-label>
  <input matInput formControlName="hpFormula" />
  @if (form.get('hpFormula')?.hasError('required') && form.get('hpFormula')?.touched) {
    <mat-error>HP is required</mat-error>
  }
</mat-form-field>
```

In the `save()` method, remove `hpAverage` from the returned object:
```typescript
save() {
  if (this.form.valid) {
    const v = this.form.value;
    this.dialogRef.close({
      name: v.name,
      challengeRating: v.challengeRating,
      xpValue: v.xpValue,
      hpFormula: v.hpFormula,
      // hpAverage removed — backend derives it
      armorClass: v.armorClass,
      speed: { walk: v.walkSpeed ?? 30 },
    });
  }
}
```

**Step 6: Update monster-list.component.ts** — replace the `hp` column:

Change the column definition from:
```html
<ng-container matColumnDef="hp">
  <th mat-header-cell *matHeaderCellDef>Avg HP</th>
  <td mat-cell *matCellDef="let m">{{ m.hpAverage }} {{ m.hpFormula ? '(' + m.hpFormula + ')' : '' }}</td>
</ng-container>
```
To:
```html
<ng-container matColumnDef="hp">
  <th mat-header-cell *matHeaderCellDef>HP</th>
  <td mat-cell *matCellDef="let m">{{ m.hpFormula || m.hpAverage }}</td>
</ng-container>
```

**Step 7: Update monster.model.ts** — make `hpAverage` optional:
```typescript
// OLD
hpAverage: number;

// NEW
hpAverage?: number;
```

**Step 8: Test the flow**
1. Open a campaign → Monsters
2. Click "New Monster" — confirm only one HP field (no "Average HP")
3. Enter `2d8+4` and save
4. Confirm monster appears in list showing `2d8+4`
5. Click Edit — confirm the formula pre-fills
6. Backend: confirm `hpAverage` is auto-computed (check via psql or API: `GET /api/campaigns/{id}/monsters`)

**Step 9: Commit**
```bash
git add frontend/src/app/features/monsters/
git add frontend/src/app/shared/models/monster.model.ts
git add backend/src/main/java/com/gm/combat/dto/monster/MonsterRequest.java
git add backend/src/main/java/com/gm/combat/service/MonsterService.java
git add backend/src/main/java/com/gm/combat/util/DiceParser.java
git commit -m "feat: consolidate monster HP to single formula field; backend derives hpAverage via DiceParser"
```

---

## Task 5: Encounter Setup Cleanup

**Files:**
- Modify: `frontend/src/app/features/encounters/encounter-setup/encounter-setup.component.ts`

**Changes:**
1. Fix scroll — the setup container is cut off at the top; give it `overflow-y: auto`
2. Remove Objectives, Terrain Notes, Loot Notes fields
3. Monster picker table — constrain width so it doesn't overflow
4. Add tooltip to Estimated Difficulty badge
5. Tighten section spacing
6. Fix section heading color (`.section-title`)

**Step 1: Update the styles block** — replace `.setup-container` and `.section-title`:

```css
.setup-container {
  padding: 16px 32px;
  max-width: 860px;
  margin: 0 auto;
  overflow-y: auto;
  height: 100%;
  box-sizing: border-box;
}
.section-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.monster-picker {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 260px;
  overflow-y: auto;
  /* prevent horizontal overflow */
  overflow-x: hidden;
}
.monster-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  min-width: 0;
}
.monster-name {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
```

**Step 2: Remove the three fields from the template** — delete these three `mat-form-field` blocks:
- `formControlName="objectives"` (Objectives)
- `formControlName="terrainNotes"` (Terrain Notes)
- `formControlName="lootNotes"` (Loot Notes)

**Step 3: Remove from form group** in the component class:
```typescript
// OLD
form = this.fb.group({
  name:           ['', Validators.required],
  description:    [''],
  objectives:     [''],
  terrainNotes:   [''],
  lootNotes:      [''],
  environmentTag: [''],
});

// NEW
form = this.fb.group({
  name:           ['', Validators.required],
  description:    [''],
  environmentTag: [''],
});
```

**Step 4: Remove removed fields from the `save()` method call**:
```typescript
this.encounterService.create(this.campaignId(), {
  name:           v.name!,
  description:    v.description || undefined,
  environmentTag: v.environmentTag || undefined,
})
```

**Step 5: Remove AI terrain population** — in `generateWithAi()`, remove this block:
```typescript
// DELETE this block:
if (!v.terrainNotes && res.terrainFeatures.length > 0) {
  this.form.patchValue({ terrainNotes: res.terrainFeatures.join(', ') });
}
```

**Step 6: Add tooltip to Estimated Difficulty badge** — wrap the badge:
```html
<!-- OLD -->
<div class="difficulty-badge" [style.background-color]="difficultyColor()">
  {{ estimatedDifficulty() }}
</div>

<!-- NEW -->
<div class="difficulty-badge"
     [style.background-color]="difficultyColor()"
     matTooltip="Based on adjusted XP per party member vs D&D 5e thresholds. Multiplier applied for multiple monsters."
     matTooltipPosition="right">
  {{ estimatedDifficulty() }}
</div>
```

**Step 7: Test**
1. Navigate to a campaign → Encounters
2. Confirm page scrolls fully (top not cut off)
3. Confirm only Name, Environment, Description fields remain
4. Hover over difficulty badge — tooltip appears
5. Monster list should not show horizontal scrollbar

**Step 8: Commit**
```bash
git add frontend/src/app/features/encounters/encounter-setup/encounter-setup.component.ts
git commit -m "feat: clean up encounter setup — remove objectives/terrain/loot, fix scroll, add difficulty tooltip"
```

---

## Task 6: AI Settings – Model ID Label + Help Link

**Files:**
- Modify: `frontend/src/app/features/settings/ai-settings/ai-settings.component.ts`

**Changes:**
1. Rename "Model Name" label → "Model ID"
2. Add a small help link beneath the field pointing to Anthropic's models page

**Step 1: Update the Model Name form field** in the template:

```html
<!-- OLD -->
<mat-form-field appearance="outline" class="full-width">
  <mat-label>Model Name</mat-label>
  <input matInput formControlName="modelName" [placeholder]="providerDefaultModel()">
  <mat-hint>Leave blank to use the default model for this provider</mat-hint>
</mat-form-field>

<!-- NEW -->
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
```

**Step 2: Add `.model-link` style**:
```css
.model-link { color: #b39ddb; text-decoration: none; margin-left: 4px; }
.model-link:hover { text-decoration: underline; }
```

**Step 3: Commit**
```bash
git add frontend/src/app/features/settings/ai-settings/ai-settings.component.ts
git commit -m "ux: rename 'Model Name' to 'Model ID' and add provider model-browse links"
```

---

## Task 7: Combat View – Guidance Banner + Initiative Prominence + Simplified Toolbar

**Files:**
- Modify: `frontend/src/app/features/combat/combat-view/combat-view.component.ts`

First **read the full file** — it is large. Key areas to change:

1. **Guidance banner** — fixed collapsible info box at top explaining "It's [Name]'s turn — move their token on the map, apply damage/healing, add conditions, then click Next Turn."
2. **Initiative order** — ensure each combatant card prominently shows its initiative roll value (large font, golden colour)
3. **Toolbar simplification** — remove the non-functional annotation toolbar buttons ("Select/Move Tracker", "Place Marker", "Draw Area"). The only map interaction during combat should be: move token. Keep the "Next Turn" / "Pause" / dice roller controls.
4. **Section heading colors** — anywhere `color: rgba(0,0,0,X)` appears in the combat view styles, replace with `rgba(255,255,255,0.75)`.

**Step 1: Read `frontend/src/app/features/combat/combat-view/combat-view.component.ts`** fully.

**Step 2: Add guidance banner** — add near the top of the template (below the toolbar, above the main content split):

```html
<!-- Guidance banner — collapsible -->
@if (showGuidance()) {
  <div class="guidance-banner">
    <mat-icon class="guidance-icon">info</mat-icon>
    <div class="guidance-text">
      @if (activeCombatant()) {
        <strong>{{ activeCombatant()!.displayName }}'s turn:</strong>
        Move their token on the map, then apply damage/healing or conditions using the panel on the left.
        Press <kbd>N</kbd> to advance to the next turn.
      } @else {
        Set initiative for all combatants, then click <strong>Start Combat</strong> to begin.
      }
    </div>
    <button mat-icon-button (click)="showGuidance.set(false)" class="guidance-close">
      <mat-icon>close</mat-icon>
    </button>
  </div>
}
```

Add signal in class:
```typescript
showGuidance = signal(true);
```

Add styles:
```css
.guidance-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(124, 58, 237, 0.18);
  border: 1px solid rgba(124, 58, 237, 0.4);
  border-radius: 8px;
  padding: 10px 14px;
  margin: 8px 12px;
  font-size: 13px;
  color: rgba(255,255,255,0.85);
  flex-shrink: 0;
}
.guidance-icon { color: #9c6fe4; font-size: 20px; width: 20px; height: 20px; }
.guidance-text { flex: 1; }
.guidance-text kbd {
  background: rgba(255,255,255,0.12);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 12px;
  font-family: monospace;
}
.guidance-close { flex-shrink: 0; }
```

**Step 3: Make initiative value prominent on each combatant card**

Find the combatant card / initiative list item. Ensure there is a clearly visible initiative badge:

```html
<!-- Inside each combatant row/card, add or update initiative display -->
<div class="init-badge">{{ c.initiativeValue ?? '—' }}</div>
```

```css
.init-badge {
  font-size: 22px;
  font-weight: 900;
  color: #ffd700;
  min-width: 36px;
  text-align: center;
  line-height: 1;
}
```

**Step 4: Remove broken annotation toolbar buttons**

Find the annotation toolbar section (buttons for "Select", "Place Marker", "Draw Area", etc.). Remove those buttons entirely. Keep only:
- Move token (drag on canvas is sufficient — remove explicit button if it's broken)
- Any working HP / condition controls
- Next Turn, Pause/Resume, Dice roller toggle

**Step 5: Fix all `rgba(0,0,0,X)` heading colors** in this component's styles — replace with `rgba(255,255,255,0.75)`.

**Step 6: Test**
1. Open an encounter → combat
2. Guidance banner visible at top
3. Initiative values large and gold-coloured on each combatant
4. No broken toolbar buttons visible
5. Press `N` — banner updates to next combatant

**Step 7: Commit**
```bash
git add frontend/src/app/features/combat/combat-view/combat-view.component.ts
git commit -m "ux: combat view — guidance banner, prominent initiative, remove broken toolbar buttons"
```

---

## Task 8: Combat View – Dynamic Map Sizing

**Files:**
- Modify: `frontend/src/app/features/map/battle-map/battle-map.component.ts`

**Problem:** The Konva stage has a fixed pixel size. It should fill the available container and resize when the browser window changes.

**Step 1: Read `frontend/src/app/features/map/battle-map/battle-map.component.ts`** fully.

**Step 2: Add ResizeObserver** to the BattleMapComponent.

In `ngAfterViewInit()` (or `ngOnInit()`), after the stage is created, add:

```typescript
private resizeObserver: ResizeObserver | null = null;

// Inside ngAfterViewInit, after stage creation:
this.resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect;
    if (width > 0 && height > 0) {
      this.stage.width(width);
      this.stage.height(height);
      this.drawGrid();   // redraw grid to fit new size
      this.stage.batchDraw();
    }
  }
});
this.resizeObserver.observe(this.containerRef.nativeElement);
```

**Step 3: Tear down on destroy**

In `ngOnDestroy()`:
```typescript
this.resizeObserver?.disconnect();
```

**Step 4: Ensure the host element fills its parent**

In the component's `styles` or `:host`:
```css
:host { display: block; width: 100%; height: 100%; }
.map-container { width: 100%; height: 100%; }
```

Also make the `#map-container` div use `100%` width/height:
```html
<div #mapContainer id="map-container" style="width:100%;height:100%;"></div>
```

**Step 5: Test**
1. Open combat view with a linked map
2. Resize the browser window — map canvas should resize to fill the panel
3. Grid should redraw at correct scale

**Step 6: Commit**
```bash
git add frontend/src/app/features/map/battle-map/battle-map.component.ts
git commit -m "feat: dynamic battle map sizing via ResizeObserver"
```

---

## Task 9: Player View – Share Link Button on GM Combat View

**Goal:** GMs need a way to share the player URL. Add a "Copy Player Link" icon button to the combat view toolbar.

**Files:**
- Modify: `frontend/src/app/features/combat/combat-view/combat-view.component.ts`

**Step 1: Add copy-link method to combat-view component class**:

```typescript
copyPlayerLink() {
  const encounterId = this.encounterId(); // or however encounterId is stored
  const url = `${window.location.origin}/player/${encounterId}`;
  navigator.clipboard.writeText(url).then(() => {
    this.snack.open('Player link copied to clipboard!', '', { duration: 2500 });
  });
}
```

**Step 2: Add button to the combat toolbar** (the top `mat-toolbar`):

```html
<button mat-icon-button
        matTooltip="Copy player view link"
        (click)="copyPlayerLink()">
  <mat-icon>share</mat-icon>
</button>
```

**Step 3: Test**
1. Open combat view
2. Click the share icon
3. Snackbar "Player link copied" appears
4. Paste the copied URL in a new tab — player view loads

**Step 4: Commit**
```bash
git add frontend/src/app/features/combat/combat-view/combat-view.component.ts
git commit -m "feat: add 'Copy Player Link' button to combat toolbar"
```

---

## Task 10: Player View – Read-only Battle Map + Navigation Header

**Goal:** Players should see the same Konva.js battle map as the GM (tokens, grid) but with no editing tools. Also add a simplified navigation header instead of the plain toolbar.

**Files:**
- Modify: `frontend/src/app/features/player/player-view.component.ts`
- Modify: `frontend/src/app/features/map/battle-map/battle-map.component.ts` (add `readonly` input)

### Add `readonly` mode to BattleMapComponent

**Step 1: Read `battle-map.component.ts`** fully.

**Step 2: Add `@Input() readonly = false` to `BattleMapComponent`**:

```typescript
@Input() readonly = false;
```

**Step 3: When `readonly` is true, disable all interactive features**:
- Skip registering token drag listeners
- Hide the annotation toolbar div
- Disable `on('click')` handlers for placing annotations
- Tokens still render and update via WebSocket (read from signal/input)

In the template, wrap the toolbar:
```html
@if (!readonly) {
  <div class="annotation-toolbar"> ... </div>
}
```

In token drag setup:
```typescript
// Only enable drag when not in readonly mode
token.draggable(!this.readonly);
```

### Add map to player view

**Step 4: Import `BattleMapComponent`** into `player-view.component.ts` imports array.

**Step 5: Add map to the player view template** — below the combatant grid:

```html
<!-- Battle Map (read-only) -->
@if (encounter()?.mapId) {
  <div class="player-map-container">
    <app-battle-map
      [encounterId]="encounterId"
      [readonly]="true">
    </app-battle-map>
  </div>
}
```

Add style:
```css
.player-map-container {
  height: 60vh;
  margin-top: 16px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
}
```

**Step 6: Check that the player view has access to `encounterId`** — it's available from `route.snapshot.paramMap.get('encounterId')`. Store it as a property:
```typescript
encounterId = this.route.snapshot.paramMap.get('encounterId')!;
```

**Step 7: Test**
1. Open the GM combat view, start combat, place tokens
2. Open the player URL in another tab
3. Player view shows the battle map with tokens visible but no editing tools
4. Move a token in GM view — player view updates in real time

**Step 8: Commit**
```bash
git add frontend/src/app/features/player/player-view.component.ts
git add frontend/src/app/features/map/battle-map/battle-map.component.ts
git commit -m "feat: add read-only battle map to player view"
```

---

## Task 11: Encounter Board Size (Backend + Frontend)

**Goal:** GM sets board width × height (in cells) when creating the encounter. This drives the Konva canvas cell count.

**Files:**
- Create: `backend/src/main/resources/db/migration/V2__encounter_board_size.sql`
- Modify: `backend/src/main/java/com/gm/combat/entity/Encounter.java`
- Modify: `backend/src/main/java/com/gm/combat/dto/encounter/EncounterRequest.java`
- Modify: `backend/src/main/java/com/gm/combat/service/EncounterService.java` (read first)
- Modify: `frontend/src/app/features/encounters/encounter-setup/encounter-setup.component.ts`
- Modify: `frontend/src/app/shared/models/encounter.model.ts` (read first)

### Backend

**Step 1: Create migration**

`backend/src/main/resources/db/migration/V2__encounter_board_size.sql`:
```sql
ALTER TABLE encounters
  ADD COLUMN IF NOT EXISTS board_width_cells  INT NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS board_height_cells INT NOT NULL DEFAULT 16;
```

**Step 2: Add fields to `Encounter.java`**:
```java
@Column(name = "board_width_cells", nullable = false)
private int boardWidthCells = 24;

@Column(name = "board_height_cells", nullable = false)
private int boardHeightCells = 16;
```

**Step 3: Add to `EncounterRequest.java`**:
```java
public record EncounterRequest(
    @NotBlank String name,
    String description,
    String objectives,
    String terrainNotes,
    String lootNotes,
    String ruleset,
    String environmentTag,
    String difficultyTarget,
    Integer boardWidthCells,   // nullable — defaults to 24
    Integer boardHeightCells   // nullable — defaults to 16
) {}
```

**Step 4: Update EncounterService.create()** — read the method, then set the new fields:
```java
encounter.setBoardWidthCells(request.boardWidthCells() != null ? request.boardWidthCells() : 24);
encounter.setBoardHeightCells(request.boardHeightCells() != null ? request.boardHeightCells() : 16);
```

**Step 5: Add fields to `EncounterResponse` / DTO** if one exists (read EncounterResponse.java). The frontend needs these values.

### Frontend

**Step 6: Add board size fields to encounter-setup form**:

In the form group, add:
```typescript
boardWidthCells:  [24, [Validators.required, Validators.min(8), Validators.max(50)]],
boardHeightCells: [16, [Validators.required, Validators.min(8), Validators.max(50)]],
```

Add to Basic Info section in template (after Description):
```html
<div class="row-2">
  <mat-form-field appearance="outline">
    <mat-label>Board Width (cells)</mat-label>
    <input matInput type="number" formControlName="boardWidthCells" min="8" max="50">
    <mat-hint>8–50 squares wide</mat-hint>
  </mat-form-field>
  <mat-form-field appearance="outline">
    <mat-label>Board Height (cells)</mat-label>
    <input matInput type="number" formControlName="boardHeightCells" min="8" max="50">
    <mat-hint>8–50 squares tall</mat-hint>
  </mat-form-field>
</div>
```

Add a `.row-2` style if not present:
```css
.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
```

Add to the `save()` call:
```typescript
boardWidthCells:  v.boardWidthCells ?? 24,
boardHeightCells: v.boardHeightCells ?? 16,
```

**Step 7: Use board size in battle map** — in `battle-map.component.ts`, read `boardWidthCells` / `boardHeightCells` from the encounter and use them to compute `cellSize`:

```typescript
// cellSize = container width / boardWidthCells
const cellSize = Math.floor(containerWidth / encounter.boardWidthCells);
```

Pass the encounter (or just the two cell values) as inputs to BattleMapComponent.

**Step 8: Update `encounter.model.ts`** to include the new fields:
```typescript
boardWidthCells?: number;
boardHeightCells?: number;
```

**Step 9: Test**
1. Create a new encounter with 30×20 cells
2. Enter combat — map canvas shows a 30-wide, 20-tall grid
3. Existing encounters default to 24×16

**Step 10: Commit**
```bash
git add backend/src/main/resources/db/migration/V2__encounter_board_size.sql
git add backend/src/main/java/com/gm/combat/entity/Encounter.java
git add backend/src/main/java/com/gm/combat/dto/encounter/EncounterRequest.java
git add backend/src/main/java/com/gm/combat/service/EncounterService.java
git add frontend/src/app/features/encounters/encounter-setup/encounter-setup.component.ts
git add frontend/src/app/shared/models/encounter.model.ts
git add frontend/src/app/features/map/battle-map/battle-map.component.ts
git commit -m "feat: encounter board size field — width × height in cells, drives map grid scale"
```

---

## Final: Push & Smoke Test

```bash
git push origin main
```

Manual smoke test checklist:
- [ ] Dark background shows subtle D&D icons on all pages
- [ ] Section headings readable (light on dark)
- [ ] Campaign/Character/Monster tables fill screen width
- [ ] Monster form has single HP field; list shows formula
- [ ] Encounter setup scrolls; only Name/Environment/Description fields
- [ ] AI settings shows "Model ID" with browse link
- [ ] Combat view shows guidance banner and gold initiative values
- [ ] Map resizes with browser window
- [ ] Share button copies player URL to clipboard
- [ ] Player view shows read-only map with live token positions
- [ ] New encounter form has board width × height fields
