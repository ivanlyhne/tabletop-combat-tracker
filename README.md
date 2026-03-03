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

## Features

- Campaign, character, and monster management
- Encounter creation with 5e XP-based difficulty calculator
- Turn-based combat: initiative, HP, conditions, round tracking
- Real-time sync across GM and player views via WebSocket
- Interactive battle map (Konva.js canvas) with grid, draggable tokens, annotations
- Optional AI-assisted encounter generation (Claude / Perplexity)
- Secure API key storage (Jasypt encryption)
- JSON export/import

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
