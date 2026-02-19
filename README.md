# Logistics Platform

AI-assisted ETL configuration tool for fleet operators. Enables non-technical users to map raw logistics data (CSV/Excel) to a standardized schema using plain English for joins and filters.

**Product docs**: [PRD.md](PRD.md) · **Spec**: [.specify/specs/001-etl-configurator](.specify/specs/001-etl-configurator)

---

## Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript, SQLite (better-sqlite3)
- **AI**: Claude (optional) or mocked mode for demos

### AI Modes

| Mode | Use when | Behavior |
|------|----------|----------|
| **Claude** | Live AI, best accuracy | Uses Anthropic API for mapping suggestions, NL joins/filters, enum mappings. Requires `ANTHROPIC_API_KEY`. |
| **Mocked** | Demos, offline, no key | Deterministic logic; fuzzy column matching, rule-based NL. May need manual fixes. |

Chosen at profile creation; applies to Mapping, Enum Mapping, Joins, Filtering.

---

## Local Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
cp .env.example .env   # optional: configure AI_MODE, etc.
```

### Run

```bash
# Both frontend and backend
npm run dev
```

Or separately:

```bash
npm run dev:backend   # http://localhost:3001
npm run dev:frontend  # http://localhost:5173
```

Open http://localhost:5173, select **ETL** from the sidebar.

---

## Deployment

The project deploys to [Render](https://render.com) (primary) or [Vercel](https://vercel.com) (frontend only; see `vercel.json`).

### Render

Deploy as two services:

| Service | Type | Build | URL |
|---------|------|-------|-----|
| **Backend** | Web Service | `npm install; npm run build` (from repo root) | `https://logistics-platform-ttx9.onrender.com` |
| **Frontend** | Static Site | `npm install && npm run build` (rootDir: `frontend`) | `https://logistics-platform-demo.onrender.com` |

### Backend (Web Service)

- **Root Directory**: (leave empty – repo root)
- **Build Command**: `npm install; npm run build`
- **Start Command**: `npx tsx backend/src/index.ts`
- **Env vars** (optional): `ANTHROPIC_API_KEY`, `DATABASE_PATH`, `PORT`

### Frontend (Static Site)

- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Env vars**: `VITE_API_URL` = backend URL (e.g. `https://logistics-platform-ttx9.onrender.com`)
- **Redirects/Rewrites**: Add rewrite `/*` → `/index.html` for client-side routing (SPA)

**Auto-deploy**: Enable Auto-Deploy in each service’s Settings so pushes to `main` trigger builds.

**SQLite on Render**: By default, the backend uses SQLite on the instance filesystem. Data can be lost on redeploy. For production, consider adding a [Persistent Disk](https://render.com/docs/disks) for the database directory or migrating to Render Postgres.

---

## Environment Variables

| Variable | Where | Purpose |
|----------|------|---------|
| `VITE_API_URL` | Frontend (build-time) | Backend API URL; omit for local (Vite proxy) |
| `ANTHROPIC_API_KEY` | Backend | Claude API key; omit for mocked AI |
| `AI_MODE` | Backend | `claude` or `mocked` |
| `DATABASE_PATH` | Backend | SQLite path (default: `./data/etl.db`) |
| `PORT` | Backend | Server port (default: 3001) |

---

## Project Structure

```
logistics-platform/
├── frontend/          # React + Vite SPA
├── backend/           # Express API + SQLite
├── render.yaml        # Render Blueprint (optional IaC)
├── vercel.json        # Vercel config (frontend-only deploy)
├── PRD.md             # Product requirements index
└── .specify/          # Spec-Kit specs and plans
```
