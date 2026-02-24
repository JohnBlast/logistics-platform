# Tasks: 002 – Logistics Discovery

**Input**: [plan.md](plan.md), [spec.md](spec.md), [clarifications.md](clarifications.md)
**Path convention**: Web app — `backend/src/`, `frontend/src/`
**Prerequisite**: 001 ETL Configurator implemented (monorepo, pipeline, Simulate page exist)

**Format**: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: US1–US8 from spec

---

## Phase 0: Foundation

**Purpose**: Pipeline output context, routes, sidebar. Blocks all Discovery user stories.

### Pipeline Output Context

- [x] T001 Create `frontend/src/context/PipelineOutputContext.tsx`: context with `{ flatRows, quoteRows, loadRows, vehicleDriverRows } | null`; `setPipelineOutput(data)` and `clearPipelineOutput()`; provide at App root
- [x] T002 Modify `frontend/src/pages/ShowOverallData.tsx`: on successful `api.pipeline.run()`, call `setPipelineOutput(res)` (backend truncates flatRows per T005)
- [x] T003 Modify `frontend/src/App.tsx`: wrap `MainLayout` (or `Routes`) with `PipelineOutputProvider`; add route `path="/discovery"` → `Discovery` page
- [x] T004 Modify `frontend/src/layouts/MainLayout.tsx`: add `Link` to `/discovery` ("Data Discovery"); remove "planned" placeholder; style like ETL links

### Row Limits – Pipeline & Simulate

- [x] T005 Modify `backend/src/api/pipeline.ts`: when returning pipeline run response, truncate `flatRows` to 2000; add `truncated: boolean, totalRows: number` to response if truncated (C-14)
- [x] T006 Modify `frontend/src/pages/ShowOverallData.tsx`: cap Add accumulation at 2000 total rows (quote.rows.length + load.rows.length + driver_vehicle.rows.length); block Add when `current + batchSize > 2000`; show message "Maximum 2000 rows. Clear to add more." or equivalent

**Checkpoint**: Pipeline output flows to context on run; Discovery route exists; sidebar link active; Add capped at 2000; pipeline response capped at 2000 flat rows

---

## Phase 1: Backend Chat API

**Purpose**: POST /api/chat; Claude produces summary + TableInstruction. Enables US1, US2, US7.

### Chat Router

- [x] T007 Install rate-limit package: `express-rate-limit` (or equivalent) in backend
- [x] T008 Create `backend/src/api/chat.ts`: router with `POST /` handler; body `{ prompt, conversationHistory?, previousTableInstruction? }`
- [x] T009 Implement Claude integration: build system prompt with TableInstruction schema, field names (loads, quotes, loads_and_quotes), example mappings from PRD §11.8; call Messages API; parse response for `tableInstruction` JSON
- [x] T010 Return `{ summary, title, tableInstruction? }`; handle text-only (no tableInstruction); handle refusal/invalid
- [x] T011 Add rate limit middleware: 10 requests per 30 minutes per IP; return 429 with message "Rate limit exceeded. Try again later." when exceeded
- [x] T012 Mount `chatRouter` at `/api/chat` in `backend/src/index.ts`

**Checkpoint**: POST /api/chat returns summary + optional tableInstruction; rate limit enforced

---

## Phase 2: Discovery View Derivation

**Purpose**: Derive quotes, loads, loads_and_quotes from flat; tenant filter. Enables US1, US8.

### Types & Derivation

- [x] T013 Create `frontend/src/lib/discovery/types.ts`: define `TableInstruction`, `TableFilter`, `AggregationSpec`, `ColumnFormat`; align with PRD §11
- [x] T014 Create `frontend/src/lib/discovery/deriveViews.ts`: `deriveQuotes(flatRows, tenantId)`, `deriveLoads(flatRows, tenantId)`, `deriveLoadsAndQuotes(flatRows, tenantId)`; tenant = first distinct `associated_fleet_id`; use `quote_status` / `load_status` for disambiguation (C-3)
- [x] T015 Implement loads derivation: distinct by load_id; filter where quote for load has status=accepted AND associated_fleet_id=tenant (C-2)
- [x] T016 Implement loads_and_quotes: filter flat where quote.status=accepted; distinct by load_id; tenant filter (C-3)

**Checkpoint**: Views derive correctly from flat; tenant filtering works; status disambiguation applied

---

## Phase 3: Client Query Engine

**Purpose**: Execute TableInstruction on dataset. Enables US1, US2, US3, US4.

### Query Engine & Formatters

- [x] T017 Create `frontend/src/lib/discovery/formatters.ts`: `formatMonthName(YYYY-MM)`, `formatPercent(n)`, `formatCurrency(n)`; pctChange first row → "—" (C-13)
- [x] T018 Create `frontend/src/lib/discovery/queryEngine.ts`: `execute(tableInstruction, dataset)` — apply execution order: base rows → filters → validation rows → groupBy + aggregations → sort → limit → pctChange
- [x] T019 Implement filters: AND between filter objects; OR within include/exclude; operators: include, exclude, eq, ne, lt, lte, gt, gte, between, top, bottom (C-5, C-6)
- [x] T020 Implement aggregations: count, count_match, sum, avg, mode, win_rate, ratio
- [x] T021 Apply hard limit of 2000 rows on query engine output; return `{ rows, truncated, totalRows }` when truncated (C-14)
- [x] T022 [P] Add unit tests for `queryEngine` in `frontend/src/lib/discovery/queryEngine.test.ts` or similar: filters, aggregations, groupBy, pctChange, limit
- [x] T022a Add acceptance tests in `frontend/src/lib/discovery/queryEngine.acceptance.test.ts`: most active drivers, profitable routes, jobs from city, jobs from date, jobs by driver, small vans, London–Birmingham (orFilters), raw column names (C-15, US9)
- [x] T022b Implement orFilters in query engine: each inner array ANDed; results from groups ORed (C-15)
- [x] T022c Implement date comparison for lt/lte/gt/gte filters (ISO date strings)
- [x] T022d Support dataColumns in chat request; include in prompt so Claude uses actual pipeline field names

**Checkpoint**: Query engine executes TableInstruction; all aggregations work; 2000 row cap; pctChange first row "—"; acceptance tests pass

---

## Phase 4: Discovery UI Shell

**Purpose**: Discovery page layout, sidebar, chat input, empty state. Enables US1, US4, US8.

### Discovery Page & Components

- [x] T023 Create `frontend/src/services/conversationStore.ts`: localStorage CRUD; key `discovery_conversations`; max 10 conversations, max 2 bookmarks; types: `StoredConversation`, `{ id, title, messages, tableInstruction?, createdAt, bookmarked }`
- [x] T024 Add `api.chat(prompt, conversationHistory?, previousTableInstruction?)` to `frontend/src/services/api.ts`; call POST /api/chat
- [x] T025 Create `frontend/src/components/discovery/EmptyState.tsx`: message "Add data and run pipeline in ETL to query" when no pipeline output; link to /etl/simulate (C-4)
- [x] T026 Create `frontend/src/pages/Discovery.tsx`: read from PipelineOutputContext; if no data → render EmptyState; if data → layout: ConversationSidebar (left) + main (chat + tabs)
- [x] T027 Create `frontend/src/components/discovery/ConversationSidebar.tsx`: list conversations (bookmarked first); create new; bookmark (max 2); delete; max 10 conversations; messages for limits (Journey 5)
- [x] T028 Create `frontend/src/components/discovery/ChatInput.tsx`: text input; submit button; disable during generation; no file upload
- [x] T029 Wire Discovery page: ConversationSidebar + ChatInput; create/select conversation; submit calls api.chat

**Checkpoint**: Discovery page loads; empty state when no pipeline run; can create conversations; chat input works; limits enforced

---

## Phase 5: Conversation and Output Tabs

**Purpose**: Messages, generation state, Output/Validate tabs, table render. Enables US1, US2, US4.

### Tabs & Chat Flow

- [x] T030 Create `frontend/src/components/discovery/ConversationTabs.tsx`: tabs Conversation | Output | Validate; Output and Validate only visible when table generated
- [x] T031 Implement Conversation tab: display messages (user/assistant); show generation state (loading); lock input during generation
- [x] T032 Wire chat flow: on submit → call api.chat → store response in conversation (summary as assistant message); extract tableInstruction; generate title from first prompt
- [x] T033 Execute tableInstruction via queryEngine on tenant-filtered views; store result for Output tab
- [x] T034 Implement Output tab: render table from query engine result; grey header row; columns from tableInstruction
- [x] T035 Implement Validate tab: show raw/validation rows (filtered dataset used for output); for aggregated output, show underlying raw rows (C-10); same filter controls as Output
- [x] T036 Show "Showing first 2000 of N rows" when truncated (C-14); empty state "No rows match your criteria" when filters return 0 (C-7)

**Checkpoint**: Full chat flow works; response + table; Output and Validate tabs show correct data; generation state; title from first prompt

---

## Phase 6: Table Filtering

**Purpose**: Per-column filters, Active Filters bar. Enables US3.

### Filter UI

- [x] T037 Create `frontend/src/components/discovery/OutputTable.tsx`: table with filter icon in each column header; click opens filter popover
- [x] T038 Implement filter popover: categorical — include/exclude + checkboxes for distinct values; numeric — operator (eq, ne, lt, lte, gt, gte, between) + value input; top N / bottom N
- [x] T039 Create `frontend/src/components/discovery/ActiveFiltersBar.tsx`: pills for each applied filter; click pill to remove; "Clear all" button
- [x] T040 Apply client-side filters to displayed table; update Validate tab with same filter logic
- [x] T041 Clear table filters when switching conversation (C-9)
- [x] T042 Create `frontend/src/components/discovery/ValidateTable.tsx`: same structure as OutputTable; displays validation dataset with same filter controls

**Checkpoint**: Per-column filtering works; Active Filters bar; Validate mirrors filter state; filters clear on conversation switch

---

## Phase 7: Guardrails and Polish

**Purpose**: Row limits, empty states, delete confirm, limit messages. Enables US5, US6, US7.

### Guardrails

- [x] T043 Row limits: ensure pipeline output cap (T005), Add cap (T006), query engine cap (T021), and truncation messaging (T036) are in place and tested (C-14)
- [x] T044 Empty query result: structured output shows "No rows match your criteria"; text response "Your query returned no results."; no fabricated stats (C-7)
- [x] T045 Generation fail/timeout: catch api.chat errors; show message "Generation failed. Please try again."; allow retry; no partial apply
- [x] T046 Rate limit 429: display "Rate limit exceeded. Try again later." when api returns 429 (C-8)
- [x] T047 Delete confirmation modal: "Delete this conversation? This cannot be undone." with Cancel/Delete (US6)
- [x] T048 Bookmark limit: when at 2 bookmarks, show "Maximum 2 bookmarks. Unbookmark one first."; clear when below limit
- [x] T049 Conversation limit: when at 10, show "Maximum 10 conversations. Delete one to continue."; clear when below limit
- [x] T050 Follow-up with previousTableInstruction: pass last tableInstruction to api.chat for "make month more readable" etc. (US2)

**Checkpoint**: All guardrails enforced; limits clear; delete confirms; no fabricated data

---

## Phase 8: Tests (Recommended)

**Purpose**: Verify critical paths; regression safety.

- [x] T051 [P] Unit test `deriveViews`: tenant filter; loads = awarded only; loads_and_quotes = accepted quote
- [x] T052 [P] Unit test `queryEngine`: filters AND/OR; all aggregation ops; groupBy; pctChange; limit 2000
- [x] T053 Integration test: POST /api/chat with prompt → returns summary + tableInstruction; rate limit 429
- [x] T054 [P] Frontend: Discovery empty state when no pipeline output
- [x] T055 [P] Frontend: Create conversation → submit → receive response; Output tab appears

---

## Dependencies & Order

| Phase | Depends on | Blocks |
|-------|-------------|--------|
| 0 Foundation | 001 ETL (Simulate, pipeline) | Phases 1–7 |
| 1 Backend Chat API | Phase 0 | Phase 5 |
| 2 Discovery View Derivation | Phase 0 | Phase 3 |
| 3 Client Query Engine | Phase 2 | Phase 5 |
| 4 Discovery UI Shell | Phase 0 | Phase 5 |
| 5 Conversation & Output Tabs | Phases 1, 3, 4 | Phase 6 |
| 6 Table Filtering | Phase 5 | Phase 7 |
| 7 Guardrails & Polish | Phases 5, 6 | — |
| 8 Tests | Phases 2, 3, 5 | — |

**Execution**: 0 → [1, 2, 4 in parallel] → 3 → 5 → 6 → 7 → 8

---

## MVP Checkpoint

After **Phase 5**: User can run pipeline on Simulate → navigate to Discovery → create conversation → submit query → see summary and table. Output and Validate tabs work. Independent test: US1 happy path.
