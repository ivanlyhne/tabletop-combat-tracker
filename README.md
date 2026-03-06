# GM Combat Tracker

> The GM Combat Tracker is a web app for tabletop RPG game masters (primarily D&D 5e) to run combat encounters digitally. The GM creates campaigns with players and enemies, then starts encounters when needed as part of his/her gameplay (outside this app) — the GM choose party members (players) and enemies for this encounter — the app can generate enemies for encounter from a prompt or difficulty automatically. During encounters/battle, the GM runs turn-by-turn combat round on a live battle map: tracking initiative order, HP, and conditions for every creature (players and enemies). Players can follow along in real time on their own devices via a shared read-only view, seeing the same battlefield and combatant status as the GM.

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Angular + Angular Material + Konva.js | 21.2.0 |
| Backend | Java + Spring Boot + Spring Security | 21 / 3.5.0 |
| Database | PostgreSQL + Flyway migrations | 16 |
| Real-time | STOMP over native WebSocket | @stomp/stompjs 7 |
| Auth | JWT (stateless, BCrypt passwords) | jjwt |
| AI | Claude (Anthropic) / Perplexity (optional) | claude-3-5-haiku |
| Encryption | Jasypt (API key at-rest encryption) | — |

## Implementation Status

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Monorepo scaffold (Docker Compose, Spring Boot, Angular) | ✅ Done |
| 2 | JWT authentication (register / login, guards, HTTP interceptor) | ✅ Done |
| 3 | Campaign / Character / Enemy CRUD | ✅ Done |
| 4 | Encounter setup + 5e XP difficulty calculator | ✅ Done |
| 5 | Combat engine (initiative, HP, conditions, turns, round counter) | ✅ Done |
| 6 | Real-time STOMP WebSocket sync across all connected clients | ✅ Done |
| 7 | Battle map (Konva.js canvas, tokens, hex/square grid, annotations) | ✅ Done |
| 8 | AI encounter generation (Claude / Perplexity providers, settings UI) | ✅ Done |
| 9 | Security hardening + unit test suite | ✅ Done |
| 10 | Polish — conditions library, player view, keyboard shortcuts, persistent sidebar nav, UX overhaul, share link | ✅ Done |
| 10b | Rename Monster → Enemy throughout (UI, code, DB); remove dice roller | ✅ Done |
| 11 | Global enemy library (cross-campaign); AI generate enemy from CR | ✅ Done |

## Features

### Navigation
- Persistent 56px icon-only sidebar visible on all authenticated pages
- Icons for Campaigns, Enemy Library, AI Settings, and Logout
- Sidebar hidden automatically on login, register, and public player view routes
- Active route highlighted in purple; hover tooltips identify each icon

### Campaign Management
- Create and manage campaigns, each with its own ruleset (DND_5E / GENERIC)
- Full CRUD for player characters and enemy roster per campaign

### Global Enemy Library
- Shared catalogue of enemy stat blocks available across all campaigns
- Add, edit, and delete reusable enemies outside any specific campaign
- Encounter setup pulls from both campaign enemies and the global library

### Encounter Setup
- Build encounters by picking party members and enemies from the campaign or global library
- Live 5e difficulty badge: **TRIVIAL / EASY / MEDIUM / HARD / DEADLY**
  - CR→XP lookup table, per-PC threshold tables, encounter multipliers
- AI-assisted encounter generation: describe a scenario, Claude or Perplexity suggests enemies matched against your library
- AI generate from CR: enter a Challenge Rating, let the AI fill in a full enemy stat block

### Combat Engine
- Initiative order with drag-to-reorder, full round counter
- Per-combatant HP / temp HP / AC tracking
- Damage, healing, and temp-HP mutations with audit log via WebSocket events
- D&D 5e conditions with icons and rules descriptions (Blinded, Charmed, … Concentrating — 16 total)
- Duration tracking per condition (rounds); status management (Alive / Down / Dead / Fled)
- Mid-fight combatant additions

### Real-time Sync
- STOMP over native WebSocket (`/ws`) — no SockJS dependency
- Every GM action broadcasts a typed `CombatStateMessage` to all subscribers
- Event types: `COMBAT_STARTED`, `TURN_ADVANCED`, `HP_CHANGED`, `CONDITION_ADDED/REMOVED`, `INITIATIVE_SET`, `COMBATANT_MOVED`, `STATUS_CHANGED`, and more

### Battle Map (Konva.js)
- Background image upload (JPEG / PNG / WebP, MIME-validated)
- Square and flat-top hex grid with configurable board dimensions
- Draggable tokens with snap-to-grid, HP bar overlay, active-turn highlight, stats popup
- Annotation toolbar: marker pins, area shapes, and text labels
- Right-click to delete any annotation
- Read-only mode for the player view (tokens visible, no editing)

### Player Read-Only View
- Public URL `/player/:encounterId` — no login required
- Shows only combatants marked "visible to players"
- Live HP bars, conditions, and active-turn banner via STOMP
- Read-only battle map showing the same board the GM sees
- Share button in combat view copies the player link to clipboard

### Keyboard Shortcuts (Combat View)

| Key | Action |
|-----|--------|
| `N` | Next turn |
| `P` | Pause / Resume combat |
| `H` | Focus Heal input |
| `X` | Focus Damage input |
| `C` | Toggle condition picker |
| `?` | Show / hide shortcut reference |

### Security
- JWT secrets and Jasypt encryption passwords loaded from environment variables only — no fallback defaults; application fails fast if unset
- File uploads: extension whitelist + server-side MIME-type validation
- Bean Validation (`@Pattern`, `@Min`/`@Max`) on all mutable endpoints; `@Validated` at controller level
- WebSocket CORS origin configurable via `ALLOWED_ORIGINS` env var (no wildcard `*` in production)

### AI Integration (optional)
- Strategy pattern: `NoneAiProvider` (default) / `ClaudeAiProvider` / `PerplexityAiProvider`
- API keys stored Jasypt-encrypted in the database; never returned in responses
- Settings UI at `/settings/ai`; key presence indicated with a `hasKey` boolean, not the raw value

---

## Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Java | 21+ |
| Maven | via `./mvnw` wrapper (no install needed) |
| Node.js | 20+ |
| npm | 10+ |
| Docker + Docker Compose | any recent |

### Environment variables

The backend requires these variables at startup (no defaults — it will refuse to start without them):

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Base64-encoded secret, ≥ 32 bytes | `$(openssl rand -base64 48)` |
| `JASYPT_PASSWORD` | Master password for Jasypt AES encryption | `$(openssl rand -base64 32)` |
| `ALLOWED_ORIGINS` | CORS + WebSocket allowed origins | `http://localhost:4200` |
| `DB_URL` | JDBC URL | `jdbc:postgresql://localhost:5432/combat_db` |
| `DB_USERNAME` | DB user | `combat` |
| `DB_PASSWORD` | DB password | (your choice) |

For local development you can set them in your shell or create a `.env` file and `source` it.

### Run locally

```bash
# 1. Start PostgreSQL (from project root)
docker compose up -d postgres

# 2. Export required environment variables
export JWT_SECRET="$(openssl rand -base64 48)"
export JASYPT_PASSWORD="$(openssl rand -base64 32)"
export ALLOWED_ORIGINS="http://localhost:4200"
export DB_URL="jdbc:postgresql://localhost:5432/combat_db"
export DB_USERNAME=combat
export DB_PASSWORD=combat

# 3. Start the backend
cd backend && ./mvnw spring-boot:run

# 4. Start the frontend (in a new terminal)
cd frontend && npm start

# 5. Open http://localhost:4200
```

### Run with Docker Compose (full stack)

```bash
# Copy and edit the example env file
cp .env.example .env   # fill in JWT_SECRET and JASYPT_PASSWORD

docker compose up --build
```

> The `docker-compose.yml` includes a `backend` service that reads the env vars above.

---

## Running Tests

### Backend unit tests (no Docker required)

```bash
cd backend && ./mvnw test -Dtest="DiceParserTest,Dnd5eDifficultyCalculatorTest,AiConfigServiceTest"
```

28 tests across three suites — pure logic with no Spring context or database.

### Backend integration tests (Docker required for Testcontainers)

```bash
cd backend && ./mvnw test
```

`AuthControllerTest` and `UserRepositoryTest` spin up a real PostgreSQL container via Testcontainers.
Requires Docker to be running.

### Frontend build check

```bash
cd frontend && npm run build
```

---

## REST API Overview

All endpoints except `/api/auth/**`, `/api/player/**`, `/uploads/**`, and `/ws` require an `Authorization: Bearer <token>` header.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register a new GM account |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/campaigns` | List campaigns |
| `POST` | `/api/campaigns` | Create campaign |
| `GET` | `/api/campaigns/:id/characters` | List characters |
| `GET/POST/PUT/DELETE` | `/api/campaigns/:id/enemies` | Campaign enemy CRUD |
| `GET/POST/PUT/DELETE` | `/api/enemies/global` | Global enemy library CRUD |
| `GET` | `/api/campaigns/:id/encounters` | List encounters |
| `POST` | `/api/campaigns/:id/encounters` | Create encounter |
| `GET` | `/api/rulesets/{rulesetId}/conditions` | Get condition list (e.g. `DND_5E`) |
| `POST` | `/api/encounters/:id/combat/start` | Start combat |
| `POST` | `/api/encounters/:id/combat/next-turn` | Advance turn |
| `PATCH` | `/api/encounters/:id/combat/combatants/:cid/damage` | Apply damage |
| `PATCH` | `/api/encounters/:id/combat/combatants/:cid/heal` | Apply healing |
| `POST` | `/api/encounters/:id/combat/combatants/:cid/conditions` | Add condition |
| `DELETE` | `/api/encounters/:id/combat/combatants/:cid/conditions/:name` | Remove condition |
| `GET/POST` | `/api/maps` | Map CRUD |
| `POST` | `/api/maps/:id/background` | Upload background image |
| `GET/POST/DELETE` | `/api/maps/:id/encounters/:eid/annotations` | Annotation CRUD |
| `GET/PUT` | `/api/settings/ai` | Read / write AI provider settings |
| `POST` | `/api/ai/generate-encounter` | AI encounter generation |
| `POST` | `/api/ai/generate-enemy` | AI generate enemy stat block from CR |
| `GET` | `/api/player/encounters/:id` | **Public** — player read-only view |

### WebSocket

Connect to `ws://localhost:8080/ws` (STOMP protocol).
Subscribe to `/topic/encounter/{encounterId}` to receive live `CombatStateMessage` updates.

---

## Project Structure

```
tabletop-combat-tracker/
├── backend/
│   └── src/main/java/com/gm/combat/
│       ├── ai/              # AiProvider strategy + Claude/Perplexity/None providers
│       ├── config/          # Spring Security, WebSocket config
│       ├── controller/      # REST controllers (Auth, Campaign, Combat, Map, AI, Player, Enemy…)
│       ├── dto/             # Request / response records
│       ├── entity/          # JPA entities (User, Campaign, Character, Enemy, Encounter, Combatant…)
│       ├── repository/      # Spring Data JPA repositories
│       ├── ruleset/         # RulesetAdapter interface + DND_5E + Generic implementations
│       ├── security/        # JWT filter, UserDetailsService, SecurityUtils
│       ├── service/         # Business logic (Combat, Encounter, Map, Enemy, AiConfig…)
│       └── websocket/       # STOMP message types
├── frontend/
│   └── src/app/
│       ├── core/
│       │   ├── api/         # Angular HTTP services (Campaign, Character, Enemy, Combat, Map, AI…)
│       │   ├── auth/        # AuthService, JWT interceptor, authGuard
│       │   └── websocket/   # StompService
│       ├── features/
│       │   ├── auth/        # Login / Register pages
│       │   ├── campaigns/   # Campaign list
│       │   ├── characters/  # Character CRUD
│       │   ├── enemies/     # Enemy CRUD + Global enemy library
│       │   ├── encounters/  # Encounter setup
│       │   ├── combat/      # CombatView, InitiativeTracker, BattleMap, ConditionPicker
│       │   ├── map/         # Konva.js battle map
│       │   ├── player/      # Public player view
│       │   └── settings/    # AI settings
│       └── shared/models/   # TypeScript interfaces (Encounter, Combatant, Enemy, Map…)
└── docker-compose.yml
```

---

## Ruleset Architecture

The backend uses a `RulesetAdapter` strategy pattern:

```
RulesetAdapter (interface)
├── Dnd5eRulesetAdapter  — 16 conditions, XP difficulty calculator
└── GenericRulesetAdapter — empty conditions, no difficulty calculation
```

Adding a new ruleset (e.g. Pathfinder 2e) requires only a new `RulesetAdapter` `@Component` — no changes to controllers or services.
