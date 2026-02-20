# Implementation Plan: 002 – Logistics Discovery

**Branch**: `002-data-discovery` | **Date**: 2025-02-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-data-discovery/spec.md`

---

## Summary

Build a web-based LLM interface for Fleet Operators to query their logistics data using natural language. Uses the **LLM-to-Table Expression** pattern: natural language → Claude produces TableInstruction JSON → client-side query engine executes against pipeline output → tables and reports. Data source: Simulate Pipeline (Add + Run Pipeline) output. Tenant filtering on `associated_fleet_id`. Single implicit tenant in prototype. Conversations in localStorage; max 10, max 2 bookmarks.

**Technical approach**: Same monorepo—Vite + React frontend, Node.js + Express backend. New route `/discovery` and page. New backend route POST `/api/chat` for Claude to produce summary + TableInstruction. Client-side query engine in frontend derives `quotes`, `loads`, `loads_and_quotes` from pipeline output, applies tenant filter, executes TableInstruction. Pipeline output shared via React Context (set when Run succeeds on Simulate page; empty state if no run). Rate limit: 10 requests / 30 min per IP. **Row limits (C-14):** Max 2000 rows throughout—keeps data within Render free tier constraints.

---

## Technical Context

| Area | Choice |
|------|--------|
| **Language/Version** | TypeScript 5.x (frontend + backend) |
| **Frontend** | React 18 + Vite 5 (existing) |
| **Backend** | Node.js 20+ with Express (existing) |
| **AI** | Anthropic Claude API (existing `@anthropic-ai/sdk`) |
| **Data source** | Pipeline output (flatRows, quoteRows, loadRows, vehicleDriverRows) via React Context |
| **Conversation storage** | localStorage (client-only; max 10 conversations, 2 bookmarks) |
| **Testing** | Vitest (existing) |
| **Target platform** | Web (desktop, same viewport as ETL) |
| **Project type** | Add to existing monorepo |
| **Row limits** | Max 2000 rows (pipeline output, Add accumulation, Discovery tables) per C-14; Render free tier friendly |

---

## Constitution Check

| Principle | Compliance |
|-----------|------------|
| **Specification-First** | Plan derived from spec; spec from PRD + clarifications |
| **Data Integrity** | Tenant filter; no fabricated data; Validate tab mirrors output |
| **Incremental Delivery** | MVP scope: Fleet Operator only; no Load Poster; no auth |
| **AI-Assisted Development** | Claude for NL→TableInstruction; deterministic client execution |

**Gate**: Passed.

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React)                                │
│  ┌──────────────┐   ┌──────────────────┐   ┌─────────────────────────────┐  │
│  │ Simulate     │   │ PipelineOutput   │   │ Discovery                    │  │
│  │ Pipeline     │──►│ Context          │◄──│ - Conversation list          │  │
│  │ (Run)        │   │ (flatRows, etc.) │   │ - Chat input                 │  │
│  └──────────────┘   └────────┬────────┘   │ - Output/Validate tabs       │  │
│                               │            │ - Query engine (client)       │  │
│                               ▼            └──────────────┬──────────────┘  │
│                      ┌──────────────────┐                  │                 │
│                      │ Derive views:    │                  │                 │
│                      │ quotes, loads,    │                  │                 │
│                      │ loads_and_quotes  │                  │                 │
│                      │ + tenant filter   │                  │                 │
│                      └────────┬─────────┘                  │                 │
│                               │                             │                 │
│                               ▼                             ▼                 │
│                      ┌──────────────────────────────────────────────┐       │
│                      │ Execute TableInstruction (filters, groupBy,   │       │
│                      │ aggregations, sort, limit, pctChange)         │       │
│                      └──────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ POST /api/chat
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Backend (Express)                               │
│  ┌──────────────────┐     ┌──────────────────┐                               │
│  │ /api/chat        │────►│ Claude API       │                               │
│  │ - prompt         │     │ (Messages API)    │                               │
│  │ - conversationHistory │ Produces: summary, title, tableInstruction        │
│  │ - previousTableInstruction │                                               │
│  └──────────────────┘     └──────────────────┘                               │
│  Rate limit: 10/30min per IP                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Pipeline Output → Discovery

1. **Simulate page:** User adds data, runs pipeline. `api.pipeline.run(sessionData)` returns `{ flatRows, quoteRows, loadRows, vehicleDriverRows }`.
2. **PipelineOutputContext:** On successful run, frontend stores output in React Context (or equivalent app-level state). Context lives at App root.
3. **Discovery page:** Reads from context. If no data → empty state with message "Add data and run pipeline in ETL to query". If data present → derive views, apply tenant filter, enable queries.

**No backend persistence of pipeline output.** Session-only. Refresh on Discovery without prior run → empty state (C-4).

### Row Limits (C-14)

**Max 2000 rows** to avoid excessive data and stay within Render free tier (memory, response size):

| Location | Cap | Implementation |
|----------|-----|----------------|
| Simulate Pipeline Add accumulation | 2000 total rows (quote + load + driver_vehicle) | Frontend blocks Add when `current total + batch size > 2000`; show message |
| Pipeline run response (flatRows) | 2000 rows | Backend truncates flatRows before returning; include `truncated: true, totalRows: N` if truncated |
| Discovery Output/Validate tables | 2000 rows | Query engine applies hard limit; display "Showing first 2000 of N rows" when truncated |

### Tenant Filtering (C-1)

- **Tenant ID:** First distinct `associated_fleet_id` in flat rows (or quote rows).
- **quotes:** Rows where `associated_fleet_id` = tenant.
- **loads:** Distinct by `load_id` from flat where quote for that load has `status = 'accepted'` AND `associated_fleet_id` = tenant.
- **loads_and_quotes:** Filter flat where `quote_status = 'accepted'` (or `status` on Quote fields); distinct by `load_id`; tenant filter as loads.

**Status disambiguation (C-3):** Flat table has both Load and Quote fields. Use `quote_status` and `load_status` when deriving views if both exist (prefix from entity to avoid collision).

---

## Project Structure

### New / Modified Files

```text
logistics-platform/
├── frontend/
│   └── src/
│       ├── context/
│       │   └── PipelineOutputContext.tsx    # NEW: Store pipeline output; provide to Discovery
│       ├── pages/
│       │   └── Discovery.tsx                 # NEW: Discovery page (conversations, chat, tabs)
│       ├── components/
│       │   ├── discovery/
│       │   │   ├── ConversationSidebar.tsx   # NEW: Conversation list, bookmark, delete
│       │   │   ├── ChatInput.tsx             # NEW: Prompt input; submit; generation lock
│       │   │   ├── ConversationTabs.tsx      # NEW: Conversation | Output | Validate tabs
│       │   │   ├── OutputTable.tsx           # NEW: Structured table + per-column filters
│       │   │   ├── ValidateTable.tsx        # NEW: Raw rows used for output; same filters
│       │   │   ├── ActiveFiltersBar.tsx      # NEW: Pills for applied filters; Clear all
│       │   │   └── EmptyState.tsx           # NEW: No data / no pipeline run message
│       │   └── (existing ETL components unchanged)
│       ├── lib/
│       │   ├── discovery/
│       │   │   ├── queryEngine.ts            # NEW: Execute TableInstruction on dataset
│       │   │   ├── deriveViews.ts            # NEW: quotes, loads, loads_and_quotes from flat
│       │   │   ├── types.ts                  # NEW: TableInstruction, TableFilter, AggregationSpec
│       │   │   └── formatters.ts             # NEW: month_name, percent, currency
│       │   └── (existing)
│       ├── services/
│       │   ├── api.ts                        # MODIFY: Add chat, discoveryData if needed
│       │   └── conversationStore.ts          # NEW: localStorage CRUD for conversations
│       └── App.tsx                           # MODIFY: Add /discovery route; wrap with PipelineOutputContext
│
├── backend/
│   └── src/
│       ├── api/
│       │   └── chat.ts                       # NEW: POST /api/chat; Claude → TableInstruction
│       └── index.ts                          # MODIFY: Mount chatRouter; rate limit middleware
│
└── .specify/specs/002-data-discovery/
    ├── spec.md
    ├── clarifications.md
    ├── plan.md                               # This file
    └── tasks.md                              # From /speckit.tasks
```

---

## API Surface

### New Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/chat | Chat with Claude; produce summary + optional TableInstruction |

**Request (POST /api/chat):**
```json
{
  "prompt": "What was my total revenue last month?",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "previousTableInstruction": { ... }
}
```

**Response (success):**
```json
{
  "summary": "Your total revenue in January 2025 was £45,200.",
  "title": "January revenue summary",
  "tableInstruction": {
    "dataSource": "loads_and_quotes",
    "columns": [{ "id": "totalPrice", "header": "Total Revenue", "format": "currency" }],
    "aggregations": [{ "field": "quoted_price", "op": "sum", "alias": "totalPrice" }]
  }
}
```

- `tableInstruction` optional (text-only or refusal).
- Rate limit: 10 requests / 30 minutes per IP (C-8). Return 429 when exceeded.

### Existing Endpoints (unchanged)

- POST /api/pipeline/run — Returns flatRows, quoteRows, loadRows, vehicleDriverRows. Discovery consumes via frontend context.

---

## Frontend Route Structure

| Route | Page | Notes |
|-------|------|-------|
| /etl | Profiles list | Existing |
| /etl/model | Data Model Preview | Existing |
| /etl/profiles/:id | ETL flow | Existing |
| /etl/simulate | Simulate Pipeline | Existing; sets PipelineOutputContext on run |
| /discovery | Data Discovery | **NEW** |

### Sidebar

- ETL (Configuration, Data Model, Simulate Pipeline)
- **Data Discovery** (activate link; remove "planned" placeholder)
- Job Market (planned)

---

## Query Engine (Client-Side)

**Responsibility:** Execute TableInstruction against dataset. No server round-trip for execution.

**Execution order (PRD §11.10):**
1. Base rows — select `loads`, `quotes`, or `loads_and_quotes` (tenant-filtered).
2. Filters — apply `filters` (AND between; OR within include/exclude).
3. Validation rows — store filtered rows for Validate tab.
4. Group by + aggregations — if present, group and compute.
5. Sort — apply `sort`.
6. Limit — apply `limit`.
7. pctChange — if present, add % change column; first row "—" (C-13).

**Aggregations:** count, count_match, sum, avg, mode, win_rate, ratio.

**Column formats:** month_name, percent, currency.

**Client-side filters (Output/Validate tab UI):** Applied after steps 1–7 for display only. Same logic as TableFilter (include, exclude, eq, ne, lt, lte, gt, gte, between, top, bottom).

---

## Conversation Storage

**Location:** localStorage. Key: `discovery_conversations`.

**Shape:**
```ts
interface StoredConversation {
  id: string
  title: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  tableInstruction?: TableInstruction
  createdAt: string
  bookmarked: boolean
}
```

**Limits:** Max 10 conversations; max 2 bookmarks. Enforce in UI; clear messages on overflow (C-5, Journey 5).

---

## Implementation Phases

### Phase 0: Foundation

- [ ] Create `PipelineOutputContext` — store flatRows, quoteRows, loadRows, vehicleDriverRows; provide to children
- [ ] Modify `ShowOverallData` — on successful run, call context setter with output
- [ ] Modify `App` — wrap with `PipelineOutputContext`; add route `/discovery` → `Discovery` page
- [ ] Modify `MainLayout` — add Data Discovery link; remove "planned" placeholder

### Phase 1: Backend Chat API

- [ ] Create `chatRouter` — POST /api/chat
- [ ] Integrate Claude Messages API — system prompt with TableInstruction schema, field names, example mappings (PRD §11)
- [ ] Return `{ summary, title, tableInstruction? }`
- [ ] Add rate limit middleware — 10/30min per IP; 429 on exceed
- [ ] Mount router in `index.ts`

### Phase 2: Discovery View Derivation

- [ ] Create `deriveViews.ts` — quotes, loads, loads_and_quotes from flat; tenant filter (first distinct associated_fleet_id)
- [ ] Handle status disambiguation — quote_status, load_status when both exist
- [ ] Create `types.ts` — TableInstruction, TableFilter, AggregationSpec, ColumnFormat

### Phase 3: Client Query Engine

- [ ] Create `queryEngine.ts` — execute TableInstruction (filters, groupBy, aggregations, sort, limit, pctChange)
- [ ] Implement aggregations — count, count_match, sum, avg, mode, win_rate, ratio
- [ ] Create `formatters.ts` — month_name, percent, currency
- [ ] Unit tests for query engine (Vitest)

### Phase 4: Discovery UI Shell

- [ ] Create `Discovery.tsx` — layout: sidebar + main content
- [ ] Create `ConversationSidebar` — list conversations; create new; bookmark; delete; max 10, max 2 bookmarks
- [ ] Create `ChatInput` — text input; submit; disable during generation
- [ ] Create `conversationStore.ts` — localStorage CRUD
- [ ] Empty state when no pipeline output (C-4)

### Phase 5: Conversation and Output Tabs

- [ ] Create `ConversationTabs` — Conversation | Output | Validate
- [ ] Conversation tab — display messages; generation state
- [ ] Wire chat API — call on submit; store response; update conversation
- [ ] Output tab — render table from query engine result; grey header row
- [ ] Validate tab — show raw/validation rows (C-10)

### Phase 6: Table Filtering

- [ ] Create `OutputTable` — table with filter icon per column header
- [ ] Create `ActiveFiltersBar` — pills for applied filters; remove one; Clear all
- [ ] Filter popover — categorical: include/exclude + checkboxes; numeric: operator + value
- [ ] Apply client-side filters to displayed table and Validate tab

### Phase 7: Guardrails and Polish

- [ ] Row limits (C-14) — Cap pipeline output at 2000 flat rows (backend pipeline response); cap Simulate Add accumulation at 2000 total rows (frontend blocks Add when at limit); cap Discovery Output/Validate tables at 2000 rows (query engine or display truncation); show "Showing first 2000 of N" when truncated
- [ ] Empty query result — "No rows match your criteria"; no fabricated stats (C-7)
- [ ] Generation fail/timeout — notify user; allow retry
- [ ] Cross-tenant / fabricated data — LLM system prompt enforces; client executes only on tenant data
- [ ] Clear table filters when switching conversation
- [ ] pctChange first row: "—" or "N/A" (C-13)
- [ ] Delete confirmation modal
- [ ] Bookmark/conversation limit messages (Journey 5)

---

## Dependencies

### Frontend (existing + none new)

- react, react-dom, react-router-dom
- vite, tailwindcss
- No new UI lib required; use existing Tailwind patterns

### Backend (existing)

- express
- @anthropic-ai/sdk
- Add: rate limit lib (e.g. `express-rate-limit` or custom middleware)

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API (existing) |
| `VITE_API_URL` | Backend URL (existing) |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Claude timeout / rate limit | Rate limit 10/30min; retry UI; clear error message |
| Large pipeline output in memory | Accept for MVP; pagination/virtualization if needed |
| TableInstruction with invalid field | Query engine validates; omit invalid; no crash |
| User refreshes on Discovery with no run | Empty state (C-4) |
| Flat table column naming (status collision) | Use quote_status, load_status in deriveViews |

---

## Integration with ETL

- **Simulate page:** Already calls `api.pipeline.run(sessionData)`. Add: on success, `setPipelineOutput(res)` in context.
- **Sidebar:** Add link to `/discovery`; style like ETL links.
- **No changes to pipeline API.** Discovery consumes output from frontend state.

---

## Next Step

Run `/speckit.implement` to execute the task breakdown in [tasks.md](tasks.md).
