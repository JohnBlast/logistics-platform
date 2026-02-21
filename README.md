# Logistics Platform

> AI-assisted logistics data platform for fleet operators. ETL configuration, natural-language querying, and data discovery—built with Spec-Driven Development.

[![Node.js 20+](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)

---

## Overview

The Logistics Platform is a portfolio of marketplace applications for fleet and logistics operations. It enables non-technical users to:

- **Configure ETL pipelines** — Map raw logistics data (CSV/Excel) to a standardized schema using plain English for joins and filters
- **Query data in natural language** — Ask questions like "What are my top 5 profitable routes?" or "How many jobs are running between London and Birmingham?" and get structured results
- **Discover insights** — Explore processed pipeline data via a chat interface powered by Claude

Data flows from **ETL Configurator** (map, join, filter) → **Simulate Pipeline** (run & persist) → **Discovery** (query with natural language).

---

## Features

### 001 – ETL Configurator *(Built & Deployed)*

- **Configuration profiles** — Create, duplicate, activate; draft/active/archive states
- **Ingestion** — Upload CSV/Excel or generate prototype dirty data for Loads, Quotes, Driver+Vehicle
- **Mapping** — AI-suggested column mapping (Claude or mocked); lock & regenerate; 1:1 to target schema
- **Enum mapping** — Map source enum values to target schema (e.g. status variations)
- **Joins** — Quote→Load→Driver+Vehicle; natural language join definitions
- **Filtering** — Inclusion/exclusion in plain language; real-time validation
- **Pipeline validation** — Before/after previews; row counts, dropped rows, warnings
- **Show Overall Data** — Run pipeline and view flat table; data persists in session
- **Data model preview** — View target schema before and during configuration

### 002 – Logistics Discovery *(Built)*

- **Natural language queries** — Chat interface; Claude interprets intent → `TableInstruction` JSON → query engine
- **Pipeline data source** — Consumes Simulate Pipeline output; no separate export
- **Flexible filters** — Supports OR logic, location aliases, fuzzy enum matching, European number formats
- **Conversation history** — Multi-turn refinement of queries

### 003 – Job Market *(Planned)*

Marketplace for loads, quotes, and fleets — placeholder for future development.

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Router |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | SQLite (better-sqlite3) |
| **AI** | Claude (Anthropic) or mocked mode for demos |

### AI Modes

| Mode | Use when | Behavior |
|------|----------|----------|
| **Claude** | Live AI, best accuracy | Mapping suggestions, NL joins/filters, enum mappings. Requires `ANTHROPIC_API_KEY`. |
| **Mocked** | Demos, offline, no key | Deterministic; fuzzy column matching, rule-based NL. May need manual fixes. |

Chosen at profile creation; applies to Mapping, Enum Mapping, Joins, Filtering, and Discovery chat.

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
git clone <repo-url>
cd logistics-platform
npm install
cp .env.example .env   # optional: configure AI_MODE, ANTHROPIC_API_KEY
```

### Run

```bash
# Both frontend and backend
npm run dev
```

Then open **http://localhost:5173**.

| URL | Product |
|-----|---------|
| `/etl` | ETL configuration profiles |
| `/etl/model` | Data model preview |
| `/etl/profiles/:id` | ETL flow (ingestion → mapping → joins → filtering → validation) |
| `/etl/simulate` | Simulate pipeline & view data |
| `/discovery` | Natural language data discovery (requires pipeline data) |

### Run Separately

```bash
npm run dev:backend   # http://localhost:3001
npm run dev:frontend  # http://localhost:5173
```

---

## Testing

```bash
npm test
```

Runs frontend (Vitest) and backend tests. Includes Discovery acceptance tests for NL→TableInstruction→query flow.

---

## Project Structure

```
logistics-platform/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/       # etl/ (steps), discovery/, shared UI
│   │   ├── pages/            # ProfilesList, ETLFlow, Discovery, ShowOverallData, DataModelPreview
│   │   ├── layouts/
│   │   ├── context/          # PipelineOutputContext (Discovery data source)
│   │   ├── lib/discovery/    # queryEngine, deriveViews
│   │   └── services/
│   └── ...
├── backend/                   # Express API
│   ├── src/
│   │   ├── api/              # profiles, mapping, ingest, joins, filters, pipeline, chat, discovery
│   │   ├── services/         # transformation, dedup, join, filter, validation, enum mapping
│   │   ├── generators/       # dirtyDataGenerator
│   │   └── models/
│   └── ...
├── docs/                      # UX research, design notes
├── .specify/                  # Spec-Kit specs and platform docs
│   ├── specs/
│   │   ├── 001-etl-configurator/   # ETL PRD, spec, plan, tasks, data model
│   │   ├── 002-data-discovery/    # Discovery PRD, spec, nl-interpretation, prompt-spec (002-PRD-discovery.md)
│   │   └── 003-job-market/
│   ├── memory/constitution.md     # Platform principles
│   ├── platform-data-model.md     # Canonical schema
│   └── etl-discovery-integration.md
├── PRD.md                     # Platform index & condensed summaries
├── AGENTS.md                  # AI agent guidance (document hierarchy, Spec-Kit)
├── render.yaml                 # Render blueprint (optional)
└── vercel.json                 # Vercel config (frontend-only)
```

---

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | Frontend (build-time) | Backend API URL; omit for local (Vite proxy) |
| `ANTHROPIC_API_KEY` | Backend | Claude API key; omit for mocked AI |
| `AI_MODE` | Backend | `claude` or `mocked` |
| `DATABASE_PATH` | Backend | SQLite path (default: `./data/etl.db`) |
| `PORT` | Backend | Server port (default: 3001) |

---

## Deployment

Deploys to [Render](https://render.com) (primary) or [Vercel](https://vercel.com) (frontend only).

### Render (Full Stack)

| Service | Type | URL |
|---------|------|-----|
| **Backend** | Web Service | `https://logistics-platform-ttx9.onrender.com` |
| **Frontend** | Static Site | `https://logistics-platform-demo.onrender.com` |

**Backend (Web Service):**
- Root dir: repo root
- Build: `npm install; npm run build`
- Start: `npx tsx backend/src/index.ts`
- Env: `ANTHROPIC_API_KEY`, `DATABASE_PATH`, `PORT`

**Frontend (Static Site):**
- Root dir: `frontend`
- Build: `npm install && npm run build`
- Publish: `dist`
- Env: `VITE_API_URL` = backend URL
- Rewrites: `/*` → `/index.html` for SPA routing

Enable Auto-Deploy so pushes to `main` trigger builds.

**SQLite:** Default disk can lose data on redeploy. For production, use a [Persistent Disk](https://render.com/docs/disks) or migrate to Postgres.

---

## Documentation

| Document | Purpose |
|----------|---------|
| [PRD.md](PRD.md) | Platform index, product summaries, links to golden-source PRDs |
| [AGENTS.md](AGENTS.md) | AI agent guidance, document hierarchy, Spec-Kit commands |
| [.specify/PLATFORM.md](.specify/PLATFORM.md) | Spec-Kit workflow, product navigation |
| [.specify/platform-data-model.md](.specify/platform-data-model.md) | Canonical data model for ETL & Discovery |

**Product specs:**
- [001 ETL Configurator](.specify/specs/001-etl-configurator/001-ETL-PRD.md)
- [002 Logistics Discovery](.specify/specs/002-data-discovery/002-PRD-discovery.md)

---

## Contributing

See [AGENTS.md](AGENTS.md) for AI agent guidance. The project uses [Spec-Kit](https://github.com/github/spec-kit) for Spec-Driven Development—reference the golden-source PRDs when specifying or implementing features.
