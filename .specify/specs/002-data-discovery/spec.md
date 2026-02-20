# Feature Specification: 002 – Logistics Discovery

**Feature Branch**: `002-data-discovery`
**Created**: 2025-02-20
**Status**: Planned
**Product**: Logistics Platform – Second Product
**Source of Truth**: [002-prd-logistics-discovery .md](../../../002-prd-logistics-discovery .md) — full product requirements; reference when specifying, clarifying, or validating.

---

## Overview

### Product Context

A web-based LLM interface that allows logistics operators to query their ingested quoting and operational data using natural language and generate answers and tables. The user operates in a marketplace where Load Posters and Fleets meet supply and demand.

### Problem Statement

Marketplaces treat analytics as a "nice to have" rather than essential. Logistics operators are non-technical—they can't use SQL or complex data tools. They're left guessing or manually reviewing each completed job one-by-one, which is time-consuming and inefficient.

### Target Users

**Fleet Operator User** — Operations staff belonging to a Fleet Operator organization. Capabilities: query their organization's submitted Quotes, query Loads awarded to their organization, view structured outputs and summaries, access validation datasets. No other user types in MVP.

### Goals (MVP)

- Query and analyze data using natural language prompts
- View Quotes submitted by their organization
- View Loads awarded to their organization
- Receive structured tabular outputs derived strictly from tenant-accessible data
- Filter, group, and aggregate data
- Maintain strict tenant-level data isolation
- Access validation transparency via a Validation Dataset view

### Core Architecture: LLM-to-Table Expression

The product uses an **LLM-to-Table Expression** pattern:

```
User prompt (natural language)
    → LLM (interprets intent, produces TableInstruction JSON)
    → API response (summary + optional tableInstruction)
    → Client query engine (executes instruction on dataset)
    → Rendered table / report
```

**Design principles:** Interpretation vs execution (LLM produces declarative instruction; client runs deterministically). Schema-bound (only platform data model fields). No data fabricated by the LLM.

---

## Data Source: Simulate Pipeline Output

**Primary data flow:** Discovery operates on data produced by the **Simulate Pipeline** (Show Overall Data) page:

1. **Add** — User clicks Add to generate and accumulate rows (Quote, Load, Driver+Vehicle). Multiple clicks add more data.
2. **Run Pipeline** — User clicks Run Pipeline. Active ETL profile processes data through mapping, joins, filters.
3. **Pipeline output** — ETL produces four outputs: `flatRows`, `quoteRows`, `loadRows`, `vehicleDriverRows` (per `.specify/platform-data-model.md`).
4. **Discovery consumes** — Discovery loads the processed output from the latest run. No separate export; Run Pipeline output *is* the Discovery data source.

**Contract:** See `.specify/etl-discovery-integration.md`. Implementation options: shared API, session/state, or backend store.

**Fallback (C-4):** If user opens Discovery without running the pipeline: show empty state with message ("Add data and run pipeline in ETL to query"). Mock data optional for demos; if provided, use single-tenant mock.

---

## Tenant Filtering (Fleet Operator)

**Tenant field:** `associated_fleet_id` on Quote identifies the Fleet Operator.

**Prototype (C-1):** Single implicit tenant. Treat the first distinct `associated_fleet_id` in the pipeline output as the "current user's tenant." No login. All visible data filtered to that one fleet.

**Fleet Operator sees:**
- **quotes:** Quotes where `associated_fleet_id` = tenant
- **loads (C-2):** Distinct Load rows from flat where the quote for that load has `status = 'accepted'` AND `associated_fleet_id` = tenant (loads awarded to Fleet Operator)
- **loads_and_quotes (C-3):** Filter flat where `quote.status = 'accepted'`; distinct by `load_id`. One row per load with its accepted quote. Tenant filter as for loads. Use `quote_status` and `load_status` when both exist to disambiguate.

**Revenue:** Use `loads_and_quotes` dataSource for revenue queries; `loads` has Load fields only, no `quoted_price` (C-11).

---

## Clarifications

*Resolved underspecified areas. Full table in [clarifications.md](clarifications.md).*

| # | Key resolution |
|---|----------------|
| C-1 | Single implicit tenant in prototype |
| C-2 | loads = awarded loads only |
| C-3 | Quote.status drives "accepted quote"; use quote_status/load_status in joined views |
| C-4 | Prefer empty state when no pipeline run |
| C-5 | TableFilter uses `operator` (not `op`) |
| C-6 | Filters: AND between objects; OR within include/exclude |
| C-7 | Empty result: empty table + "No rows match your criteria"; no fabricated stats |
| C-8 | Rate limit: per IP in MVP |
| C-9 | Conversations in localStorage; independent of ETL |
| C-10 | Validate tab: raw rows when aggregated; same filtered rows when raw output |
| C-11 | loads_and_quotes for revenue (quoted_price) |
| C-12 | OR across different fields not supported |
| C-13 | pctChange first row: show "—" or "N/A" |
| C-14 | Max 2000 rows: pipeline output, Add accumulation, Discovery tables; Render free tier friendly |

---

## User Scenarios & Testing

### User Story 1 – Create Conversation and Retrieve Insights (P1)

A user understands operational data using plain English.

**Independent Test:** Create conversation → submit query → see written response and (if requested) structured table.

**Acceptance Scenarios:**

1. **Given** new conversation, **When** user submits natural language query, **Then** system displays generation state and prevents additional prompts until complete
2. **Given** query submitted, **When** system processes, **Then** written response appears in Conversation tab; structured table (if requested) appears; Output and Validate tabs become available when table generated
3. **Given** table generated, **When** user views Output tab, **Then** structured table with grey header row displays; data derived strictly from tenant dataset
4. **Given** conversation with table, **When** system generates, **Then** conversation title reflects first prompt; conversation appears in sidebar

---

### User Story 2 – Refine Existing Conversation (P1)

A user clarifies or narrows previous results.

**Acceptance Scenarios:**

1. **Given** existing conversation, **When** user selects it and enters new prompt, **Then** system displays generation state and locks input
2. **Given** follow-up submitted, **When** system generates, **Then** updated response and/or table appears; Validate tab reflects dataset for latest output
3. **Given** follow-up like "make month more readable", **When** client sends previousTableInstruction, **Then** LLM returns modified instruction with format (e.g. month_name)

---

### User Story 3 – View and Filter Table Output (P1)

A user explores structured output with Excel-style filtering.

**Acceptance Scenarios:**

1. **Given** Output tab with table, **When** user navigates to it, **Then** structured table displays with filter icon in each column header
2. **Given** user clicks filter icon, **When** popover opens, **Then** filter controls appear (categorical: include/exclude + checkboxes; numeric: operator + value)
3. **Given** user applies filter and clicks Apply, **When** filter activates, **Then** Active Filters bar appears above table; user can remove individual filter or "Clear all"
4. **Given** filters applied, **When** user switches to Validate tab, **Then** same filter controls available; filtered dataset displayed
5. **Given** filters return no rows, **When** table updates, **Then** empty-state message displays ("No rows match your criteria"); no fabricated stats (C-7)
6. **Given** user switches conversation, **When** switch occurs, **Then** table filters clear (C-9)

---

### User Story 4 – Validate Generated Output (P1)

A user confirms output aligns with actual tenant dataset.

**Acceptance Scenarios:**

1. **Given** output generated, **When** user navigates to Validate tab, **Then** filtered dataset used for output displays
2. **Given** aggregated output (groupBy + aggregations), **When** user views Validate tab, **Then** raw row attributes (all Load/Quote fields) display so user can verify underlying data (C-10)
3. **Given** raw output (no aggregations), **When** user views Validate tab, **Then** same filtered rows as Output display
4. **Given** Validate tab open, **When** user applies filters, **Then** validation dataset updates with same filter logic as Output

---

### User Story 5 – Bookmark Conversation (P2)

A user gets quick access to frequently used conversations.

**Acceptance Scenarios:**

1. **Given** conversation, **When** user selects bookmark, **Then** conversation marked bookmarked; surfaces at top of sidebar
2. **Given** 2 bookmarks already, **When** user tries to bookmark 3rd, **Then** system displays "Maximum 2 bookmarks. Unbookmark one first."; message clears when user unbookmarks
3. **Given** 10 conversations, **When** user tries to create new, **Then** system displays "Maximum 10 conversations. Delete one to continue."; message clears when user deletes

---

### User Story 6 – Delete Conversation (P2)

A user permanently removes a conversation.

**Acceptance Scenarios:**

1. **Given** conversation, **When** user selects delete, **Then** confirmation modal displays ("Delete this conversation? This cannot be undone.")
2. **Given** modal open, **When** user confirms, **Then** conversation removed; disappears from sidebar; unrecoverable
3. **Given** modal open, **When** user cancels, **Then** conversation preserved

---

### User Story 7 – Guardrail Enforcement (P1)

A user submits unsupported or invalid requests.

**Acceptance Scenarios:**

1. **Given** user requests cross-tenant data, **When** system evaluates, **Then** system denies request
2. **Given** user requests non-existent data, **When** system evaluates, **Then** system informs data unavailable
3. **Given** user requests fabricated/hypothetical data, **When** system evaluates, **Then** system refuses and explains limitation
4. **Given** query returns no results, **When** system responds, **Then** empty-state message displays (C-7)
5. **Given** generation fails or times out, **When** error occurs, **Then** system notifies user and allows retry
6. **Given** generation exceeds limit, **When** API returns 429, **Then** user sees message to try again (rate limit: 10/30 min per IP, C-8)

---

### User Story 8 – Add Data in Simulate Pipeline and Query in Discovery (P1)

A user adds data via Simulate Pipeline; that data flows to Discovery for querying.

**Acceptance Scenarios:**

1. **Given** Active ETL profile, **When** user goes to Simulate Pipeline, **Then** user can Add (generate data) and Run Pipeline
2. **Given** pipeline run complete, **When** user navigates to Data Discovery, **Then** Discovery loads pipeline output from latest run
3. **Given** pipeline output loaded, **When** Discovery derives views, **Then** quotes, loads, loads_and_quotes derived from flat with tenant filter applied
4. **Given** views derived, **When** user submits natural language query, **Then** system queries tenant-filtered data; no separate export step required

### User Story 9 – Common Query Patterns Produce Correct Tables (P1)

A user asks common operational questions and receives structured, correct output.

**Acceptance Scenarios (query engine executes TableInstruction against pipeline data):**

1. **Given** loads_and_quotes data, **When** user asks "Which drivers are the most active", **Then** table shows driver_name and job count, sorted by count descending
2. **Given** loads_and_quotes data, **When** user asks "Which routes are the most profitable" or "top 5 profitable routes", **Then** table shows collection_town, delivery_town, and total revenue; sorted by revenue desc; limit 5
3. **Given** loads_and_quotes data, **When** user asks "Can I see all jobs from [city]", **Then** table shows loads filtered by collection_city (or delivery_city when "to city")
4. **Given** loads_and_quotes data, **When** user asks "Jobs starting from [date]", **Then** table shows loads with collection_date >= date
5. **Given** loads_and_quotes data, **When** user asks "Show me all jobs by [driver]", **Then** table shows loads filtered by driver_name
6. **Given** loads_and_quotes data, **When** user asks "Show me all loads that are small vans", **Then** table shows rows with vehicle_type = small_van
7. **Given** loads_and_quotes data, **When** user asks "How many jobs between London and Birmingham", **Then** table shows count of loads where (collection=London AND delivery=Birmingham) OR (collection=Birmingham AND delivery=London)

---

### Edge Cases

**Data**

- Quote for Load never awarded → Quote visible; Load invisible
- Pipeline output or Discovery result exceeds 2000 rows → Truncate to 2000; show "Showing first 2000 of N rows" or equivalent (C-14)
- Load awarded but later cancelled → Remains visible if award history preserved
- Zero awarded Loads for tenant → Empty views; no error
- filters produce zero records → Empty table; no fabricated summary (C-7)
- OR across different fields requested → Use orFilters for "between X and Y" (C-15); other patterns: guide user to narrow (C-12)

**Generation & API**

- Generation fails → Notify user; allow retry
- Rate limit exceeded → 429; message to try again
- Invalid/invented field in TableInstruction → Query engine omits or fails; schema-bound

**UI**

- New conversation without table → Show conversation prompt, not table empty state
- pctChange first row → Show "—" or "N/A", not "0%" (C-13)

---

## Requirements

### Functional Requirements

**Data Scope**

- System MUST operate on data from Simulate Pipeline output (Add + Run Pipeline) or empty state
- System MUST assume dataset conforms to `.specify/platform-data-model.md`
- System MUST restrict access to tenant data via `associated_fleet_id` (C-1)
- System MUST NOT generate, fabricate, or simulate data beyond ingested dataset

**Interaction Model**

- System MUST allow natural language query via chat prompt
- System MUST prohibit file uploads, images, non-text inputs
- System MUST process one output request at a time per conversation
- System MUST prevent new prompt submission while generation in progress

**Conversation Management**

- System MUST allow create, continue, delete (with confirmation) conversations
- System MUST display conversation list in sidebar; generate title from first prompt
- System MUST support up to 10 conversations; up to 2 bookmarks
- System MUST clear table filters when switching conversation
- System MUST persist conversations in localStorage (client-only; C-9)

**Output Behavior**

- System MUST generate written response in Conversation tab
- System MUST generate structured table when requested; Output tab available only when table exists
- System MUST support follow-up requests via previousTableInstruction
- System MUST support per-column filtering (categorical: include/exclude; numeric: eq, ne, lt, lte, gt, gte, between, top N, bottom N)
- System MUST display Active Filters bar when filters applied
- System MUST display empty-state when filters return no rows (C-7)

**Validation Behavior**

- System MUST make Validate tab available when output generated
- System MUST display filtered dataset used for output; raw rows for aggregated output (C-10)
- System MUST use same filtering as Output tab in Validate

**Guardrails**

- Cross-tenant request → deny
- Non-existent data → inform unavailable
- Fabricated/hypothetical data → refuse and explain
- Generation fail/timeout → notify and allow retry
- No partial or fabricated output

### Key Entities

- **Tenant** — Fleet Operator; identified by `associated_fleet_id` on Quote
- **Conversation** — Persistent session; belongs to user; bookmarkable
- **Prompt** — Natural language query; produces response + optional TableInstruction
- **Generated Output** — Text response and/or structured table
- **Validation Dataset** — Filtered rows used to produce output

---

## Common Query Patterns & Expected TableInstructions

*These patterns map natural language to TableInstruction. The Chat API uses `dataColumns` (actual pipeline field names) when provided; prefer those over schema names when they differ.*

| User prompt | dataSource | Expected instruction shape |
|-------------|------------|----------------------------|
| Which drivers are the most active | loads_and_quotes | groupBy [driver_name], aggregations [{load_id, count, jobCount}], sort desc, limit 5 |
| Which routes are the most profitable / top 5 profitable routes | loads_and_quotes | groupBy [collection_town, delivery_town], aggregations [{quoted_price, sum, totalRevenue}], sort desc, limit 5 |
| Can I see all jobs from this city | loads_and_quotes | filters [{collection_city, eq, city}] or delivery_city for "to city" |
| Find me all jobs starting from this date | loads_and_quotes | filters [{collection_date, gte, date}] |
| Show me all jobs by this driver | loads_and_quotes | filters [{driver_name, eq, driver}] |
| Show me all loads that are small vans | loads / loads_and_quotes | filters [{vehicle_type, eq, small_van}] |
| How many jobs between London and Birmingham | loads_and_quotes | orFilters: [[{collection_city,eq,London},{delivery_city,eq,Birmingham}],[{collection_city,eq,Birmingham},{delivery_city,eq,London}]] |

**Field aliases:** The query engine resolves logical names to actual column names (e.g. quoted_price → "Quoted Amount", collection_town → "Collection Town") when the pipeline uses raw source names.

---

## TableInstruction Schema

*Full specification: PRD §11. Reference for implementation.*

| Field | Type | Description |
|-------|------|-------------|
| dataSource | "loads" \| "quotes" \| "loads_and_quotes" | Which dataset to query |
| columns | Array<{ id, header, format? }> | Output columns; id matches groupBy or aggregation alias; can be [] (auto-inferred from result) |
| filters | Array<TableFilter> | Server-side filters; `operator` key (C-5); AND between, OR within include/exclude (C-6) |
| orFilters | Array<Array<TableFilter>> | Optional; each inner array ANDed; results ORed. Use for "between X and Y" (e.g. London↔Birmingham) |
| groupBy | string[] | Fields to group by |
| groupByFormats | Record<string, day\|week\|month\|year> | Date truncation |
| aggregations | Array<AggregationSpec> | count, count_match, sum, avg, mode, win_rate, ratio |
| sort | Array<{ field, dir }> | Sort by field or alias |
| limit | number | Max rows |
| pctChange | { field, alias } | % change vs previous row; first row "—" (C-13) |

**TableFilter operators:** include, exclude, eq, ne, lt, lte, gt, gte, between, top, bottom.

**Execution order:** Base rows → filters → validation rows → groupBy + aggregations → sort → limit → pctChange.

**API:** POST /api/chat with prompt, conversationHistory, previousTableInstruction. Response: summary, title, tableInstruction (optional).

---

## Success Criteria

- User completes query flow: create conversation → submit prompt → see response and (if requested) table
- Output derived strictly from tenant data (quotes submitted by org; loads awarded to org)
- Validate tab reflects exact dataset used for output
- No fabricated or simulated records
- Table filtering (include/exclude, numeric) works without altering underlying dataset
- Guardrails enforced: cross-tenant denied; empty result shows message
- ETL Add + Run Pipeline → Discovery receives output; no separate export

---

## Out of Scope (MVP)

- Load Poster access
- Non-awarded Loads
- Competitor Quotes
- Marketplace-wide analytics
- Predictive or simulated analytics
- Arbitrary OR across different fields in filters (exception: orFilters for "between X and Y" route pattern, C-15)
- Backend persistence for conversations

---

## Constraints

- **Data:** Platform schema only; snake_case field names
- **Tenant:** Single implicit tenant in prototype (C-1)
- **Conversations:** Max 10; max 2 bookmarks
- **Rate limit:** 10 requests / 30 min per IP (C-8)
- **Persistence:** localStorage for conversations; independent of ETL
- **Views:** quotes (tenant by associated_fleet_id); loads (awarded only, C-2); loads_and_quotes (quote.status = accepted, C-3)
- **Row limits (C-14):** Max 2000 rows in pipeline output (flatRows); max 2000 total rows in Simulate Pipeline Add accumulation (quote + load + driver_vehicle); max 2000 rows in Discovery Output/Validate tables. Keeps payloads and memory within Render free tier limits.

---

## Supporting Documents

- [002-prd-logistics-discovery .md](../../../002-prd-logistics-discovery .md) — Golden source; full product requirements, §11 TableInstruction
- [clarifications.md](clarifications.md) — Resolved underspecified areas
- [.specify/platform-data-model.md](../../platform-data-model.md) — Canonical schema
- [.specify/etl-discovery-integration.md](../../etl-discovery-integration.md) — ETL→Discovery data flow
