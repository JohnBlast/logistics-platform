# Tasks: 001 – ETL Configurator

**Input**: [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md)
**Path convention**: Web app — `backend/src/`, `frontend/src/`

**Format**: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: US1–US8 from spec

---

## Phase 0: Setup

**Purpose**: Project initialization, monorepo, tooling

- [x] T001 Create monorepo: root `package.json` with workspaces (pnpm or npm), `frontend/` and `backend/` packages
- [x] T002 [P] Init `frontend/`: Vite + React 18 + TypeScript; `frontend/package.json`, `vite.config.ts`, `tsconfig.json`
- [x] T003 [P] Init `backend/`: Express + TypeScript; `backend/package.json`, `tsconfig.json`; entry `backend/src/index.ts`
- [x] T004 [P] Add backend deps: express, better-sqlite3, papaparse, xlsx, @anthropic-ai/sdk
- [x] T005 [P] Add frontend deps: react, react-dom, react-router-dom; Tailwind (or chosen UI approach)
- [x] T006 [P] Configure Vitest for `backend/tests/` and `frontend/tests/`
- [x] T007 Create `.env.example`: `ANTHROPIC_API_KEY`, `AI_MODE`, `DATABASE_PATH`, `PORT`, `VITE_API_URL`

**Checkpoint**: `pnpm install` works; `pnpm --filter backend dev` and `pnpm --filter frontend dev` start

---

## Phase 1: Foundation

**Purpose**: Core infra – data model, profile store, layout, routes. Blocks all user stories.

### Data & Storage

- [x] T008 Define data model types in `backend/src/models/schema.ts`: Quote, Load, Driver, Vehicle field definitions (required/optional, types, enums) per data-model.md
- [x] T009 Create SQLite schema in `backend/src/models/db.ts`: `profiles` table (id, name, description, status, dataModelVersion, aiMode, mappings, joins, filters, createdAt, updatedAt)
- [x] T010 Implement `ProfileStore` in `backend/src/services/profileStore.ts`: create, get, list, update, delete, duplicate
- [x] T011 Seed default template profile on first run (or migration): one Draft profile with empty config

### API – Profiles

- [x] T012 Implement `GET /api/profiles` in `backend/src/api/profiles.ts` — list all profiles
- [x] T013 Implement `POST /api/profiles` — create (name, description, dataModelVersion, aiMode required)
- [x] T014 Implement `GET /api/profiles/:id` — get single profile
- [x] T015 Implement `PATCH /api/profiles/:id` — update (Draft only; reject Active/Archived)
- [x] T016 Implement `POST /api/profiles/:id/duplicate` — create Draft copy
- [x] T017 Implement `DELETE /api/profiles/:id` — delete with guardrail: block if last profile (C-1)

### Frontend – Shell

- [x] T018 Create `frontend/src/layouts/MainLayout.tsx`: sidebar with ETL, Data Discovery, Job Market; ETL active for 001
- [x] T019 Create `frontend/src/pages/ProfilesList.tsx`: list profiles; Create, Duplicate, Delete (with confirm modal per C-2)
- [x] T020 Configure React Router: `/etl` → ProfilesList, `/etl/model`, `/etl/profiles/:id`, `/etl/simulate`
- [x] T021 Create `frontend/src/services/api.ts`: fetch wrapper for `VITE_API_URL`; types for Profile

### ETL Flow Shell

- [x] T022 Create `frontend/src/pages/ETLFlow.tsx`: step indicator (Configuration Profiles → Ingestion → Mapping → Joins → Filtering → Validation); current step from route/state
- [x] T023 Add placeholder steps in ETLFlow: Ingestion, Mapping, Joins, Filtering, Validation (empty content for now)
- [x] T024 Enforce 1280px min width in layout (GR-10.3)

**Checkpoint**: Can create/list/duplicate/delete profiles; navigate ETL flow; sidebar works

---

## Phase 2: Ingestion

**Purpose**: Upload CSV/Excel, generate dirty data, preview. Enables US1, US4, US7.

### Backend – Parsing & Generation

- [x] T025 Implement `FileParser` in `backend/src/parsers/fileParser.ts`: parse CSV (papaparse), Excel (xlsx first sheet only per C-5); reject >10MB (GR-2.3), non-CSV/Excel (GR-2.2), parse errors (GR-2.4)
- [x] T026 Implement `DirtyDataGenerator` in `backend/src/generators/dirtyDataGenerator.ts`: generate Quote (100), Load (50), Driver+Vehicle (50) per FR-4.4a–g; deterministic seed for tests
- [x] T027 Implement `POST /api/ingest/upload`: accept multipart file; return `{ headers, rows }` or error
- [x] T028 Implement `POST /api/ingest/generate`: body `{ objectType: 'quote'|'load'|driver_vehicle' }`; return generated rows

### Frontend – Ingestion Page

- [x] T029 Create `frontend/src/pages/Ingestion.tsx`: data model breakdown per object (Load, Quote, Driver+Vehicle); Upload + Generate buttons per object
- [x] T030 Implement Upload: drag-and-drop or file picker; call `/api/ingest/upload`; show filename, row count, error on reject
- [x] T031 Implement Generate: call `/api/ingest/generate` per object; show row count; regenerate replaces (GR-2.6)
- [x] T032 Create `DataPreview` component: collapsible panels, 5–10 rows (C-7); use in Ingestion
- [x] T033 Gate "Next" to Mapping: enable only when all three objects have data (GR-2.1)

**Checkpoint**: Can upload CSV/Excel or generate for all three; see preview; proceed to Mapping when ready

---

## Phase 3: Mapping

**Purpose**: Column mapping with AI suggestions, lock & suggest remaining. Enables US1, US3.

### Backend – Mapping

- [x] T034 Implement `MappingService` in `backend/src/services/mappingService.ts`: validate 1:1 mapping; apply mappings to rows
- [x] T035 Implement `POST /api/mapping/suggest`: input `{ objectType, sourceHeaders, sourceRows }`; output `{ suggestions: [{ targetField, sourceColumn, confidence }] }`; use Claude or mocked logic per AI_MODE
- [x] T036 Implement mocked mapping suggestions: fuzzy match column names to target schema (FR-4.4c style variations)

### Frontend – Mapping Page

- [x] T037 Create `frontend/src/pages/Mapping.tsx`: split by Quote, Load, Driver+Vehicle; each section: target fields (required/optional), dropdown to pick source column
- [x] T038 Show progress per object: "X/Y mapped"; support collapse/expand (FR-5.3)
- [x] T039 On load or "Suggest mappings": call `/api/mapping/suggest`; display suggestions with confidence; user can lock individual mappings
- [x] T040 Implement "Suggest remaining": call suggest with locked mappings excluded; only update unlocked fields (GR-3.6)
- [x] T041 Gate "Next" to Joins: enable only when all required fields mapped (GR-3.1)
- [x] T042 Implement error suggestions for unmapped required: "Suggest mapping source column 'X' → target" with Apply button (US3, FR-1.9)
- [x] T043 Implement error suggestions for invalid enum: suggest valid value; Apply (US3)
- [x] T044 Mapping dropdown: search/filter when many columns (EC-2.6)

**Checkpoint**: Can map all required fields; AI suggests; lock & suggest remaining; errors with Apply; proceed to Joins

---

## Phase 4: Joins & Filtering

**Purpose**: Configure joins and filters; NL interpret. Enables US1.

### Backend – Joins

- [x] T045 Implement `JoinService` in `backend/src/services/joinService.ts`: execute Quote→Load→Driver+Vehicle (INNER); user-provided keys/fallbacks; drop rows with missing IDs (GR-4.5)
- [x] T046 Implement `POST /api/joins/interpret`: input NL; output structured join config (Claude or mocked)
- [x] T047 Implement join validation: reject if keys missing (GR-4.1); enforce order (GR-4.3)

### Backend – Filtering

- [x] T048 Implement `FilterService` in `backend/src/services/filterService.ts`: apply inclusion/exclusion rules to flat table; order: inclusion first, exclusion second (C-11)
- [x] T049 Implement `POST /api/filters/interpret`: input NL; output structured filter (Claude or mocked)
- [x] T050 Reject filter rules referencing non-existent fields (GR-5.4); reject unparseable (GR-5.1)

### Frontend – Joins Page

- [x] T051 Create `frontend/src/pages/Joins.tsx`: list join ops (Quote→Load, Load→Driver+Vehicle); define keys and fallbacks (vehicle_id or driver_id)
- [x] T052 Optional NL input for joins; call `/api/joins/interpret`; show result, editable
- [x] T053 Before/after preview: row count change after joins (collapsible)

### Frontend – Filtering Page

- [x] T054 Create `frontend/src/pages/Filtering.tsx`: add inclusion/exclusion rules; NL input; call `/api/filters/interpret`
- [x] T055 Rule list: edit, remove; before/after row count
- [x] T056 Warn when filters would drop all rows (GR-5.2)

**Checkpoint**: Can configure joins and filters; NL interpret; preview; proceed to Validation

---

## Phase 5: Validation & Save

**Purpose**: Run pipeline, show summary, save with Active/Archived. Enables US1.

### Backend – Pipeline

- [x] T057 Implement `ValidationService` in `backend/src/services/validationService.ts`: run dedup → joins → filter; return `{ rowsSuccessful, rowsDropped, fieldsWithWarnings }`
- [x] T058 Implement dedup in `backend/src/services/deduplicationService.ts`: per entity, keep latest by updated_at; tie-break: first (C-4); exclude rows with null updated_at, warn (C-3)
- [x] T059 Implement `POST /api/pipeline/validate`: input profile id + session dirty data; run full pipeline; return summary
- [x] T060 Implement `POST /api/pipeline/run`: same as validate but for Show Overall Data; uses Active config

### Frontend – Validation Page

- [x] T061 Create `frontend/src/pages/Validation.tsx`: "Run validation" button; call `/api/pipeline/validate`
- [x] T062 Summary view: rows successful, dropped, fields with warnings (C-8)
- [x] T063 Save gate: enable only when ≥1 row succeeds (GR-6.1); disable until validation run (GR-6.2)
- [x] T064 On Save: PATCH profile status; set new Active, previous Active → Archived (FR-9.6)
- [x] T065 Success feedback: stay on Validation step; toast/banner (C-9)
- [x] T066 Re-run validation when config or data changes (GR-6.3, GR-6.4)

**Checkpoint**: Full ETL flow works: generate → map → join → filter → validate → save; config becomes Active

---

## Phase 6: Show Overall Data

**Purpose**: Simulate pipeline, view flat table. Enables US2.

- [x] T067 Create `frontend/src/pages/ShowOverallData.tsx`: block access if no Active profile (GR-8.1); show empty state
- [x] T068 Generate button: call generate for all three; replace previous run (GR-8.3)
- [x] T069 Run button: call `/api/pipeline/run`; display flat table (post-join, post-filter)
- [x] T070 Table: flat wide table; pagination or virtual scroll for large sets (EC-9.4)
- [x] T071 Link/tab to Show Overall Data from ETL area

**Checkpoint**: With Active profile, can generate → run → see flat table

---

## Phase 7: Data Model Preview & Pop-up

**Purpose**: View data model before/during ETL. Enables US5, US8.

- [x] T072 Create `frontend/src/pages/DataModelPreview.tsx`: list Quote, Load, Driver, Vehicle; per field: required/optional, description, format, examples (FR-2.1, FR-2.2)
- [x] T073 Add route `/etl/model`; link from sidebar or ETL entry
- [x] T074 Create `DataModelPopover` component: modal/slide-over; full model (C-10)
- [x] T075 Add "View data model" trigger in Mapping, Joins, Filtering; open popover

**Checkpoint**: Data model viewable before ETL and during config steps

---

## Phase 8: Guardrails & Polish

**Purpose**: All GR-*; edge cases; UX polish.

- [x] T076 Delete confirmation modal (C-2)
- [x] T077 Block delete of last profile (C-1)
- [x] T078 Reject upload: >10MB, non-CSV/Excel, parse errors — clear messages (GR-2.2–2.5)
- [x] T079 Empty file (headers only): reject or warn (GR-2.5)
- [x] T080 Invalid enum: warning + null; do not drop row (FR-11.1, GR-7.2)
- [x] T081 Preserve Draft on navigation; dirty data session-only (GR-10.2)
- [x] T082 AI timeout/error: show message; allow retry; no partial apply (GR-9.3)
- [x] T083 Loading states for async ops (generate, suggest, validate, run)
- [x] T084 Error states: inline errors; step indicator reflects errors
- [x] T085 Update `quickstart.md` with actual commands; validate run

---

## Phase 9: Tests (Recommended)

**Purpose**: Verify critical paths; regression safety.

- [x] T086 [P] Unit test `DirtyDataGenerator`: row counts, IDs valid, schema compliance
- [x] T087 [P] Unit test `JoinService`: correct join order; drop orphan rows
- [x] T088 [P] Unit test `FilterService`: inclusion before exclusion; field existence
- [x] T089 [P] Unit test `FileParser`: CSV parse; Excel first sheet; reject >10MB
- [x] T090 Integration test: `POST /api/profiles` → create → `GET /api/profiles` → list
- [x] T091 Integration test: generate all → map → join → filter → validate → ≥1 row success
- [x] T092 [P] Frontend: ProfilesList — Create, list, Duplicate
- [x] T093 [P] Frontend: Ingestion — Generate; gate to Mapping

---

## Dependencies & Order

| Phase | Depends on | Blocks |
|-------|-------------|--------|
| 0 Setup | — | Phase 1 |
| 1 Foundation | Phase 0 | Phases 2–8 |
| 2 Ingestion | Phase 1 | Phase 3 |
| 3 Mapping | Phase 2 | Phase 4 |
| 4 Joins & Filtering | Phase 3 | Phase 5 |
| 5 Validation & Save | Phase 4 | Phase 6 |
| 6 Show Overall Data | Phase 1, 5 | — |
| 7 Data Model | Phase 1 | — |
| 8 Guardrails | Phases 2–7 | — |
| 9 Tests | Phases 2–5 | — |

**Execution**: 0 → 1 → 2 → 3 → 4 → 5 → (6 and 7 in parallel) → 8 → 9

---

## MVP Checkpoint

After **Phase 5**: User can complete full ETL (generate → map → join → filter → validate → save) without upload. Config becomes Active. Independent test: US1 happy path.
