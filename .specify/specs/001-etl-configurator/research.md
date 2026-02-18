# Research: 001 – ETL Configurator

**Phase 0** – Tech choices and rationale for the ETL Configurator.

---

## 1. Stack Selection

### Frontend: React + Vite

- **React**: Component-based; well-suited for step wizards, complex forms, and collapsible preview panels. Large ecosystem.
- **Vite**: Fast dev server and build; minimal config; good DX for React + TypeScript.
- **Alternative considered**: Next.js – rejected for MVP; no SSR/SSG requirement; simpler Vite setup.

### Backend: Node.js + Express

- **Node.js**: Same language as frontend (TypeScript); good for I/O (file parsing, AI API calls). Single runtime.
- **Express**: Lightweight; sufficient for REST API; widely used.
- **Alternative considered**: Python/FastAPI – would require separate runtime; team may prefer JS/TS consistency.

### Storage: SQLite

- **SQLite**: File-based; no separate server. Fits "single user, no auth" MVP. Configs persist; schema is straightforward (profiles, mappings, joins, filters).
- **better-sqlite3**: Synchronous, fast, native bindings.
- **Alternative considered**: JSON file – rejected; concurrent write issues; SQLite gives ACID and queries.

### File Parsing

- **CSV**: papaparse – handles encoding, BOM, quoted fields. Widely used.
- **Excel**: xlsx (SheetJS) – reads .xlsx; first sheet via `workbook.Sheets[workbook.SheetNames[0]]`. Community edition sufficient for read-only.

### AI: Anthropic Claude

- **Claude API**: Spec explicitly references "Claude or Mocked AI". Anthropic Messages API for mapping suggestions, NL join/filter interpretation.
- **Mocked AI**: Predefined responses for demo; no API key required. Enables offline/prototype use.

---

## 2. ETL Pipeline Design

### Order

Ingestion → Mapping → Deduplication → Joins → Filtering (per PRD).

### Deduplication

- Per entity (Quote, Load, Driver, Vehicle).
- Group by primary key; keep row with latest `updated_at`.
- Tie-break: first by row order (C-4).

### Joins

- Fixed order: Quote → Load → Driver+Vehicle.
- INNER JOIN only.
- User configures: Quote.load_id → Load.load_id; Load.allocated_vehicle_id OR Load.driver_id → Vehicle/Driver.
- Rows without matching keys are dropped.

### Filtering

- Applied to flat table (post-join).
- NL rules interpreted by Claude → structured filter (e.g., `{ field, operator, value }`).
- Inclusion first, then exclusion (C-11).

---

## 3. Dirty Data Generation

Per FR-4.4a–g:

- **Always clean**: quote_id, load_id, created_at, updated_at.
- **Light dirty**: Column name variations ("Quote Ref" vs quote_id); optional nulls; enum variations (case, spaces); extra columns; date format variations.
- Use deterministic seed for reproducibility in tests.
- Row counts: Quotes=100, Loads=50, Driver+Vehicle=50.

---

## 4. UI Component Approach

- **Layout**: Sidebar (ETL, Data Discovery, Job Market) + main content.
- **Step flow**: Linear indicator; click to jump; backward allowed.
- **Before/after**: Collapsible panels, 5–10 rows (C-7).
- **Mapping**: Dropdowns per target field; searchable for many columns (EC-2.6).
- **UI library**: Tailwind + Headless UI or Radix – accessible, unstyled primitives. Final choice TBD in implementation.

---

## 5. Testing Strategy

- **Unit**: Services (dedup, joins, filter application, parsing).
- **Integration**: API routes; full pipeline with mocked AI.
- **Frontend**: React Testing Library; key flows (create profile, generate, map, validate).
- **Contract**: Optional – OpenAPI spec if needed for frontend/backend handoff.

---

## 6. Out of Scope (Confirmed)

- Auth, multi-tenancy, scheduled runs, streaming, export, versioning, mobile, external ETL tools – per PRD and spec.
