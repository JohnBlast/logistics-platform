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

## AI Modes

| Mode | Use when | Behavior |
|------|----------|----------|
| **Claude** | Live AI assistance | Uses Anthropic API; best accuracy for mapping, NL joins/filters, enum mappings. Requires `ANTHROPIC_API_KEY`. |
| **Mocked** | Demos, offline, no key | Deterministic logic; fuzzy column matching, rule-based NL. May produce errors user corrects. |

Set `AI_MODE=mocked` in `.env` to run without an API key. AI mode is chosen at profile creation.

**Claude unavailable**: If a profile uses Claude but `ANTHROPIC_API_KEY` is not set, the app shows a warning banner; AI features do not work until the key is configured and backend restarted.

---

## Default Template

On first run, a default ETL template profile is created. User can generate data, map, join, filter, validate, and save.

---

## Data Location

- **Configs**: SQLite at `./data/etl.db` (or `DATABASE_PATH`)
- **Dirty data**: In-memory only; regenerated per session

---

## Deployed Demo

Live instance on Render:
- **Frontend**: https://logistics-platform-demo.onrender.com
- **Backend**: https://logistics-platform-ttx9.onrender.com

See project [README.md](../../../README.md#deployment-render) for deploy setup.
