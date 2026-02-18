# Quickstart: 001 – ETL Configurator

How to run the ETL Configurator locally.

---

## Prerequisites

- Node.js 20+
- npm (or pnpm)

---

## Setup

```bash
cd logistics-platform
npm install

# Optional: copy .env.example to .env for AI_MODE, etc.
```

---

## Run

```bash
# Terminal 1 – Backend (port 3001)
npm run dev:backend

# Terminal 2 – Frontend (port 5173)
npm run dev:frontend
```

Open http://localhost:5173. Select ETL from sidebar.

---

## Mocked AI Mode

Set `AI_MODE=mocked` to run without Claude API key. AI suggestions and NL interpretation use predefined logic. Useful for demos and offline development.

---

## Default Template

On first run, a default ETL template profile is created. User can generate data, map, join, filter, validate, and save.

---

## Data Location

- **Configs**: SQLite at `./data/etl.db` (or `DATABASE_PATH`)
- **Dirty data**: In-memory only; regenerated per session
