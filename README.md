# Tabletop Combat Tracker

A browser-based GM assistant for running turn-based combat encounters. Built for DnD 5e with a multi-edition architecture.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 17 + TypeScript + Angular Material + Konva.js |
| Backend | Java 21 + Spring Boot 3 + Spring Security + Spring WebSocket |
| Database | PostgreSQL 16 + Flyway migrations |
| Real-time | STOMP over WebSocket |
| Auth | JWT (stateless) |

## Implementation Status

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Monorepo scaffold (Docker, Spring Boot, Angular) | ✅ Done |
| 2 | JWT Authentication (register/login, guards, interceptor) | ✅ Done |
| 3 | Campaign / Character / Monster CRUD | ✅ Done |
| 4 | Encounter setup + 5e XP difficulty calculator | ✅ Done |
| 5 | Combat engine (initiative, HP, conditions, turns) | 🔨 In progress |
| 6 | Real-time STOMP WebSocket sync | ⏳ Planned |
| 7 | Battle map (Konva.js canvas, tokens, annotations) | ⏳ Planned |
| 8 | AI encounter generation (Claude / Perplexity) | ⏳ Planned |
| 9 | Polish (dice roller, player view, shortcuts) | ⏳ Planned |
| 10 | JSON export/import, PWA | ⏳ Planned |

## Features (implemented)

- Campaign, character, and monster management with full CRUD
- Encounter creation with 5e XP-based difficulty calculator (CR→XP, threshold tables, multipliers)
- Difficulty ratings: TRIVIAL / EASY / MEDIUM / HARD / DEADLY
- Encounter setup page: party member selection, monster picker, live difficulty badge

## Getting Started

### Prerequisites
- Java 21+
- Node 20+ / npm
- Docker + Docker Compose

### Run locally

```bash
# 1. Start PostgreSQL
docker compose up -d postgres

# 2. Start backend
cd backend && ./mvnw spring-boot:run

# 3. Start frontend
cd frontend && ng serve

# 4. Open http://localhost:4200
```

## Project Structure

```
tabletop-combat-tracker/
├── frontend/     # Angular app
├── backend/      # Spring Boot app
└── docker-compose.yml
```
