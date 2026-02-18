# Implementation Plan: 001 – ETL Configurator

**Branch**: `001-etl-configurator` | **Date**: 2025-02-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-etl-configurator/spec.md`

---

## Summary

Build an AI-assisted ETL configuration tool for non-technical fleet operators. Users upload CSV/Excel files (or generate dirty data), map columns to a standardized schema, configure joins and filters (with optional natural language), and run a pipeline that produces a flat table ready for downstream AI applications. The MVP is desktop-only (1280px min), single-user, with no auth. Configs persist; dirty data does not.

**Technical approach**: Monorepo with React + Vite frontend and Node.js + Express backend. SQLite for config persistence. Anthropic Claude API for AI (mapping, joins, filters); Mocked AI mode for demos. File parsing in backend (CSV, Excel first-sheet-only). ETL pipeline (ingestion → dedup → joins → filtering) runs server-side.

---

## Technical Context

| Area | Choice |
|------|--------|
| **Language/Version** | TypeScript 5.x (frontend + backend) |
| **Frontend** | React 18 + Vite 5 |
| **Backend** | Node.js 20+ with Express |
| **Storage** | SQLite (better-sqlite3) for configuration profiles |
| **AI** | Anthropic Claude API (Messages API); Mocked AI for offline/demo |
| **File parsing** | papaparse (CSV), xlsx/SheetJS (Excel, first sheet only) |
| **Testing** | Vitest (unit + integration); React Testing Library |
| **Target platform** | Web (desktop, 1280px min); Node 20+ |
| **Project type** | Web application (frontend + backend) |
| **Constraints** | 10MB max file size; configs persist; dirty data session-only |

---

## Constitution Check

| Principle | Compliance |
|-----------|------------|
| **User-Centric Design** | Plain language, AI assistance, step indicator, before/after previews, error suggestions – all in spec |
| **Data Integrity** | Data model source of truth; validation gates; guardrails documented |
| **Specification-First** | Plan derived from spec; no vibe coding |
| **Incremental Delivery** | MVP scope explicit; out-of-scope documented |
| **AI-Assisted Development** | Claude for config; Mocked AI option; user retains control |

**Gate**: Passed.

---

## Project Structure

### Documentation

```text
.specify/specs/001-etl-configurator/
├── 001-ETL-PRD.md       # Golden source
├── spec.md              # Feature spec (with clarifications)
├── plan.md              # This file
├── data-model.md        # Target schema
├── research.md          # Phase 0 (tech choices)
├── quickstart.md        # Run instructions
└── contracts/           # API contracts (if any)
```

### Source Code

```text
logistics-platform/
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI (StepIndicator, DataPreview, etc.)
│   │   ├── pages/          # ETL pages (Profiles, Ingestion, Mapping, Joins, Filtering, Validation, ShowOverallData)
│   │   ├── layouts/        # Sidebar, main layout
│   │   ├── services/        # API client, state
│   │   └── lib/            # Types, utils
│   └── tests/
│
├── backend/
│   ├── src/
│   │   ├── api/            # Express routes
│   │   ├── services/       # ETL pipeline, dedup, joins, filtering, AI
│   │   ├── models/         # Config profile, data model
│   │   ├── parsers/        # CSV, Excel (first sheet)
│   │   └── generators/     # Dirty data generation
│   └── tests/
│
└── package.json           # Root workspace (npm workspaces or pnpm)
```

**Structure decision**: Web application (Option 2). Frontend handles UI/UX; backend handles file parsing, ETL pipeline, AI calls, and config storage.

---

## Architecture

### High-Level Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────►│   Backend   │────►│   Claude    │
│   (React)   │     │  (Express)  │     │   API      │
└─────────────┘     └──────┬──────┘     └─────────────┘
       │                   │
       │                   ▼
       │            ┌─────────────┐
       └───────────►│   SQLite    │  (configs only)
                    └─────────────┘
```

### Data Flow (ETL Pipeline)

1. **Ingestion**: User uploads CSV/Excel or clicks Generate → backend parses or generates
2. **Mapping**: Frontend shows source columns; AI suggests mappings; user locks/corrects
3. **Deduplication**: Backend-only; per entity, keep latest by `updated_at`
4. **Joins**: Quote → Load → Driver+Vehicle (INNER); user configures keys/fallbacks
5. **Filtering**: NL rules interpreted by AI; applied to flat table
6. **Validation**: Run full pipeline; show summary; enable Save if ≥1 row succeeds

### Key Services (Backend)

| Service | Responsibility |
|---------|----------------|
| `FileParser` | Parse CSV/Excel; first sheet for Excel; reject >10MB, bad encoding |
| `DirtyDataGenerator` | Generate Quotes=100, Loads=50, Driver+Vehicle=50 per FR-4.4a–g |
| `MappingService` | Validate 1:1 mapping; AI suggestions (Claude or mocked) |
| `JoinService` | Execute Quote→Load→Driver+Vehicle; INNER only |
| `FilterService` | Interpret NL rules (Claude); apply inclusion/exclusion |
| `ValidationService` | Run full pipeline; return summary (success, dropped, warnings) |
| `ProfileStore` | SQLite CRUD for config profiles |

### API Surface (REST)

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/profiles | List profiles |
| POST | /api/profiles | Create profile |
| GET | /api/profiles/:id | Get profile (mappings, joins, filters) |
| PATCH | /api/profiles/:id | Update profile (Draft only) |
| POST | /api/profiles/:id/duplicate | Duplicate profile |
| DELETE | /api/profiles/:id | Delete profile (guardrails apply) |
| POST | /api/ingest/upload | Upload file; return parsed rows + headers |
| POST | /api/ingest/generate | Generate dirty data for object type |
| POST | /api/mapping/suggest | AI mapping suggestions (or mocked) |
| POST | /api/joins/interpret | NL → join config (or mocked) |
| POST | /api/filters/interpret | NL → filter rule (or mocked) |
| POST | /api/pipeline/validate | Run full pipeline; return summary |
| POST | /api/pipeline/run | Run pipeline for Show Overall Data (Active config) |

### Frontend Route Structure

| Route | Page | Notes |
|-------|------|-------|
| /etl | Profiles list | Default landing |
| /etl/model | Data Model Preview | FR-2.1 |
| /etl/profiles/:id | ETL flow | Step indicator; Ingestion → Mapping → Joins → Filtering → Validation |
| /etl/simulate | Show Overall Data | Requires Active profile |

### Sidebar (Platform Shell)

- ETL (active for 001)
- Data Discovery (placeholder)
- Job Market (placeholder)

---

## Implementation Phases

### Phase 0: Setup

- [ ] Init monorepo (pnpm workspaces or npm)
- [ ] Frontend: Vite + React + TypeScript
- [ ] Backend: Express + TypeScript
- [ ] SQLite + better-sqlite3
- [ ] Vitest config (frontend + backend)
- [ ] Environment: `ANTHROPIC_API_KEY` for Claude; `AI_MODE=claude|mocked`

### Phase 1: Foundation

- [ ] Data model schema (Quote, Load, Driver, Vehicle) in code
- [ ] Profile store (SQLite): create, read, update, delete
- [ ] Default template profile
- [ ] Sidebar + layout shell
- [ ] ETL route structure (profiles list, placeholder steps)

### Phase 2: Ingestion

- [ ] File upload API (CSV, Excel first sheet; 10MB limit)
- [ ] Dirty data generator (FR-4.4a–g)
- [ ] Ingestion page: Upload + Generate per object; data model breakdown
- [ ] Before/after preview (collapsible, 5–10 rows)

### Phase 3: Mapping

- [ ] Mapping API: suggest (Claude or mocked)
- [ ] Mapping page: split by object; X/Y progress; lock & "Suggest remaining"
- [ ] Error suggestions (unmapped, invalid enum, join mismatch)
- [ ] Real-time validation gates

### Phase 4: Joins & Filtering

- [ ] Join config API; NL interpret (Claude or mocked)
- [ ] Joins page: Quote→Load, Load→Driver+Vehicle; fallbacks
- [ ] Filter API; NL interpret
- [ ] Filtering page: inclusion/exclusion rules; before/after

### Phase 5: Validation & Save

- [ ] Pipeline validation API (dedup → joins → filter)
- [ ] Validation page: run test; summary view; Save gate
- [ ] Active/Archived on save

### Phase 6: Show Overall Data

- [ ] Simulate page: generate → run → flat table
- [ ] Table view (pagination/virtual scroll for large sets)

### Phase 7: Data Model Preview & Pop-up

- [ ] Data Model Preview page
- [ ] Pop-up during Mapping/Joins/Filtering

### Phase 8: Guardrails & Polish

- [ ] All guardrails (GR-1.x–GR-10.x)
- [ ] Delete confirmation; block last profile delete
- [ ] 1280px min layout
- [ ] Error states, loading states

---

## Dependencies

### Frontend

- react, react-dom
- react-router-dom
- (UI library TBD: Tailwind + Headless UI, or Radix, or MUI – per team preference)

### Backend

- express
- better-sqlite3
- papaparse
- xlsx (SheetJS)
- @anthropic-ai/sdk

### Dev

- typescript, vite, vitest
- @types/node, @types/express

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API key (omit for Mocked AI) |
| `AI_MODE` | `claude` or `mocked` |
| `DATABASE_PATH` | SQLite file path (default: `./data/etl.db`) |
| `PORT` | Backend port (default: 3001) |
| `VITE_API_URL` | Backend URL for frontend (default: http://localhost:3001) |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Claude rate limits / timeout | Mocked AI fallback; retry on timeout; clear error message |
| Large file parse | 10MB limit enforced; stream if needed |
| Excel format edge cases | First sheet only; reject unparseable; clear error |
| Complex join logic | Fixed order; INNER only; user configures keys – keep simple |

---

## Next Step

Run `/speckit.implement` to execute the task breakdown in [tasks.md](tasks.md).
