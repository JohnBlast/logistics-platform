# Logistics Data Discovery Tool - Product Requirements Document

## 1. Overview

### Product Context
A web-based LLM interface that allows logistics operators to query their ingested quoting and operational data using natural language and generate answers and tables. The user operates in a marketplace where Load Posters and Fleets meet supply and demand.

### Problem Statement
Marketplaces treat analytics as a "nice to have" rather than essential. Logistics operators are non-technical—they can't use SQL or complex data tools. They're left guessing or manually reviewing each completed job one-by-one, which is time-consuming and inefficient.

### Primary Goal (MVP)
Enable Fleet Operator organizations to:
- Query and analyze their data using natural language prompts
- View Quotes submitted by their organization
- View Loads awarded to their organization
- Receive structured tabular outputs derived strictly from Tenant-accessible data
- Filter, group, and aggregate data
- Maintain strict tenant-level data isolation
- Access validation transparency via a Validation Dataset view

### Core Capability: LLM-Generated Table Expressions
The product uses an **LLM-to-Table Expression** pattern: the LLM translates natural language questions into a structured **TableInstruction** JSON. A client-side query engine then executes this instruction against the dataset to produce tables and reports. This design separates *interpretation* (LLM) from *execution* (deterministic query engine), ensuring outputs are grounded in real data. See **Section 11** for the full specification—suitable for reuse or integration with other products.

### Out of Scope (MVP)
- Load Poster access
- Viewing non-awarded Loads
- Viewing competitor Quotes
- Marketplace-wide analytics
- Predictive or simulated analytics

---

## 1a. Data Ingestion & Platform Data Model

### One Data Model for All Products

The platform uses a **single data model** across all products. The ETL Configurator (001) transforms raw data into this schema. Logistics Discovery (002) consumes data that conforms to it. **Golden source:** `.specify/platform-data-model.md`

### Data Source: ETL Pipeline Output

Discovery operates on data produced by the ETL Configurator:

1. **ETL Configuration** — User configures profile (mappings, joins, filters) and runs the pipeline.
2. **Pipeline Output** — ETL produces a flat wide table (Quote + Load + Driver + Vehicle joined).
3. **Export for Discovery** — System persists or exposes the processed data for Discovery to consume.
4. **Discovery Ingest** — Discovery loads the exported data and derives queryable views.

### Derivation of Discovery Views from ETL Flat Table

| View | Derivation |
|------|------------|
| **quotes** | Project Quote fields from flat; one row per quote. Filter by tenant (`associated_fleet_id`) for Fleet Operator access. |
| **loads** | Distinct by `load_id`; project Load fields. For Fleet Operator: only loads where the accepted quote has `associated_fleet_id` = tenant. |
| **loads_and_quotes** | Filter flat where `quote.status = 'accepted'`; distinct by `load_id`. One row per load with its accepted quote. Tenant filter as for loads. |

### Tenant Identification (Fleet Operator)

- **Tenant field:** `associated_fleet_id` on Quote identifies the Fleet Operator.
- **Fleet Operator sees:** Quotes where `associated_fleet_id` = their tenant; Loads where the accepted quote's `associated_fleet_id` = their tenant.
- **Accepted quote:** Quote with `status = 'accepted'`. A Load is "awarded" to a Fleet when their quote is the accepted one.

### Persistence & Deployment

- **ETL export:** Processed flat rows are persisted (e.g. API response, file, or database) when the user runs the pipeline and opts to "Use in Discovery" or equivalent.
- **Discovery load:** Discovery fetches the persisted data at runtime (API, static file, or DB query).
- **Fallback:** For standalone Discovery (no ETL run), mock data conforming to the platform schema may be used.

---

## 2. Target Users

### Fleet Operator User
An authenticated user belonging to a Fleet Operator Tenant.

**Capabilities:**
- Query their organization's submitted Quotes
- Query Loads awarded to their organization
- View structured outputs and summaries
- Access validation datasets

**Note:** No other user types exist in MVP.

---

## 3. Core User Journeys

### Journey 1: Create a New Conversation and Retrieve Insights

**Intent:** User wants to understand operational data using plain English.

**Flow:**
1. User creates a new conversation
2. System displays empty chat prompt and empty state
3. User submits a natural language query
4. System:
   - Generates conversation title based on first prompt
   - Displays generation state
   - Prevents additional prompt submission
5. System processes query within ingested tenant dataset
6. System generates:
   - Written response in Conversation tab
   - Structured table (if requested)
7. If table is generated:
   - Output tab becomes available
   - Validate tab becomes available
8. Generation state clears, conversation becomes active in sidebar

**Outcome:** User sees summary and (if requested) structured tabular data derived strictly from their own dataset.

---

### Journey 2: Refine an Existing Conversation

**Intent:** User wants to clarify or narrow previous results.

**Flow:**
1. User selects existing conversation from sidebar
2. User enters new prompt in same conversation
3. System displays generation state and locks additional input
4. System generates updated response and/or table
5. Validate tab reflects dataset used for latest output

**Outcome:** User refines insights while preserving conversation context.

---

### Journey 3: View and Filter Table Output

**Intent:** User wants to explore structured output.

**Flow:**
1. User navigates to Output tab
2. System displays structured table with filter icon in each column header
3. User clicks filter icon on a column; system displays popover with filter controls (categorical: include/exclude + checkboxes; numeric: operator + value)
4. User applies filter and clicks Apply; Active Filters bar appears above table showing applied filters
5. User may remove a filter by clicking its pill or "Clear all"
6. Validate tab reflects filtered dataset with same filter controls

**Outcome:** User manipulates tabular results without altering underlying dataset integrity.

---

### Journey 4: Validate the Generated Output

**Intent:** User wants transparency into how output was derived.

**Flow:**
1. User navigates to Validate tab
2. System displays filtered dataset used for output
3. User applies filters (same as Output tab)
4. System updates validation dataset accordingly

**Outcome:** User confirms that output aligns with actual tenant dataset.

---

### Journey 5: Bookmark a Conversation

**Intent:** User wants quick access to frequently used conversation.

**Flow:**
1. User selects bookmark option on conversation
2. System marks conversation as bookmarked
3. System surfaces bookmarked conversation at top of sidebar
4. System enforces maximum of 2 bookmarks
5. If user tries to bookmark a 3rd conversation, system displays "Maximum 2 bookmarks. Unbookmark one first." (message clears when user unbookmarks)
6. If user creates when at 10 conversations, system displays "Maximum 10 conversations. Delete one to continue." (message clears when user deletes)

**Outcome:** User can quickly access priority conversations; limit messages clear automatically when below limit.

---

### Journey 6: Delete a Conversation

**Intent:** User wants to permanently remove a conversation.

**Flow:**
1. User selects delete
2. System displays custom confirmation modal ("Delete this conversation? This cannot be undone.")
3. User may cancel or confirm
4. Upon confirmation:
   - Conversation is permanently removed
   - Conversation disappears from sidebar
   - Conversation is unrecoverable

**Outcome:** Conversation no longer exists in system.

---

### Journey 7: Guardrail Enforcement

**Intent:** User submits an unsupported or invalid request.

**Scenarios & System Behavior:**
- If user requests cross-tenant data → system denies request
- If user requests non-existent data → system informs data unavailable
- If user requests fabricated/hypothetical data → system refuses and explains limitation
- If query returns no results → system displays empty-state message
- If generation fails or times out → system notifies user and allows retry

**Outcome:** System enforces strict dataset boundaries and avoids fabricated outputs.

---

### Journey 8: Configure ETL and Open Discovery with Processed Data

**Intent:** User wants to analyze their own ETL-processed data in Discovery.

**Flow:**
1. User configures ETL (profile, mappings, joins, filters).
2. User goes to Show Overall Data & Simulate Pipeline.
3. User adds sample data (or uses uploaded data) and runs the pipeline.
4. User selects "Open in Discovery" (or equivalent) or navigates to Discovery.
5. System loads the processed flat rows from the latest ETL run (or from persisted export).
6. Discovery derives `quotes`, `loads`, `loads_and_quotes` views and applies tenant filter.
7. User queries their data in natural language as in Journey 1.

**Outcome:** Discovery operates on the same data the user just processed in ETL.

---

## 4. Functional Requirements

### Data Scope & Assumptions
- System shall operate on data produced by the ETL Configurator (001) or mock data conforming to the platform data model
- System shall assume dataset is pre-processed (mapped, joined, filtered) and conforms to `.specify/platform-data-model.md`
- System shall restrict users to accessing only their own tenant data (via `associated_fleet_id`)
- System shall not generate, fabricate, or simulate data beyond what exists in ingested dataset

### Interaction Model
- System shall allow users to query data using natural language via chat prompt
- System shall prohibit file uploads, images, or non-text inputs
- System shall process only one output request at a time per conversation
- System shall prevent users from submitting new prompt while generation is in progress

### Conversation Management
- System shall allow users to create new conversations
- System shall allow users to continue existing conversations
- System shall allow users to delete conversations with confirmation step
- System shall permanently remove deleted conversations
- System shall display list of previous conversations in sidebar
- System shall generate conversation title based on first prompt
- System shall automatically select newly created conversation
- System shall support up to 10 conversations per user
- System shall allow users to bookmark up to 2 conversations
- System shall clear table filters when the user switches to a different conversation

### Output Behavior
- System shall generate written response within Conversation tab
- System shall generate structured table when requested by user
- System shall make Output tab available only when table is generated
- Output tab shall display structured table with grey header row for clarity
- System shall support follow-up requests (e.g. "make month more readable") by passing previous table instruction to the model
- System shall support per-column filtering (Excel-style): filter icon in each column header opens a popover with filter controls
- System shall display an Active Filters bar above the table when filters are applied, with ability to remove individual filters or clear all
- System shall allow categorical filtering (include, exclude) and numeric filtering (equal, not equal, less than, greater than, between, top N, bottom N)
- System shall display empty-state message when filters return no rows; new or refreshed conversations without table data shall show conversation prompt (not table empty state)

### Validation Behavior
- System shall make Validate tab available when any output is generated
- Validate tab shall display filtered dataset used to produce output
- For aggregated outputs (groupBy + aggregations), Validate tab shall display raw row attributes (all Load/Quote fields) so user can verify underlying data
- Validate tab shall use same filtering capabilities as Output tab

### System Guardrails & States

**Data Guardrails:**
- If user requests data outside their tenancy → system denies request
- If user requests data not present in dataset → system informs user data is unavailable
- If user requests generation of new/hypothetical data → system refuses and explains limitation
- If user requests content outside scope → system refuses and explains

**Generation State Handling:**
- System shall display visible generation state while processing request
- System shall reflect generation status in sidebar
- If generation exceeds acceptable time limits → system notifies user
- If generation fails → system notifies user and allows retry

**Empty & Error States:**
- If query returns no results → system displays empty-state message
- System shall ensure no partial or fabricated output is displayed

---

## 5. Interaction Model (UX Behavior)

### Conversational Workspace
- Interface shall function as conversation-driven workspace
- Users shall interact exclusively through natural language prompts
- System shall display responses inline within active conversation
- Each conversation shall preserve its own context independently

### Conversation States
- Newly created conversation shall display empty state and active input prompt
- Deleted conversation shall be permanently removed and unrecoverable
- Sidebar shall display all existing conversations, including bookmarked state and generation status

### Tab Behavior
- Each conversation shall contain three tabs: Conversation, Output, and Validate
- Conversation tab shall always be available
- Output tab shall only become available when structured table has been generated
- Validate tab shall only become available when any output has been generated
- Output tab shall display only structured tabular data
- Validate tab shall display dataset used to generate output

### Output Visibility Rules
- Written responses shall be displayed in Conversation tab
- Structured tables shall be displayed only in Output tab
- Table filtering shall update visible table without modifying underlying dataset
- Validation filtering shall mirror filtering logic available in Output tab

### Generation Behavior
- When prompt is submitted, system shall display visible generation state
- While generation is in progress, system shall prevent additional prompt submissions
- Generation state shall be reflected within active conversation and sidebar
- If generation fails or exceeds time limits, system shall notify user and allow retry

### Interaction Constraints
- System shall process only one output request at a time per conversation
- Users shall not upload files, images, or non-text inputs
- System shall not interrupt generation once initiated

---

## 6. Data & Domain Concepts

**Platform schema:** All entities and fields conform to `.specify/platform-data-model.md`. Field names use `snake_case`.

### Tenant
- Represents an isolated user organization operating within marketplace (Fleet Operator)
- Identified by `associated_fleet_id` on Quote
- Owns its operational and quoting data
- Cannot access data belonging to other Tenants

### User
- Represents authenticated individual operating under a Tenant
- Belongs to exactly one Tenant
- Can create and manage Conversations
- Can query only data belonging to their Tenant

### Quote
Represents a pricing or bidding record within the marketplace. **Platform fields:** `quote_id`, `load_id`, `quoted_price`, `status`, `date_created`, `distance_km`, `associated_fleet_id`, `fleet_quoter_name`, `requested_vehicle_type`, `created_at`, `updated_at`.

### Load
Represents an entity of work for transportation. **Platform fields:** `load_id`, `collection_town`, `collection_city`, `collection_time`, `collection_date`, `delivery_town`, `delivery_city`, `delivery_time`, `delivery_date`, `distance_km`, `status`, `completion_date`, `load_poster_name`, `allocated_vehicle_id`, `driver_id`, `number_of_items`, `created_at`, `updated_at`. Joined rows may include `vehicle_type`, driver `name` (as `driver_name` in loads_and_quotes view). Price when awarded comes from accepted quote's `quoted_price`.

**Note:** A Load belongs to the Load Poster; when awarded, it is associated with the Fleet Operator whose quote was accepted.

### Conversation
- Represents persistent session of interaction between User and System
- Belongs to a User
- Maintains contextual memory of prompts and outputs
- Can be bookmarked or deleted
- May contain multiple prompt-response exchanges

### Prompt
- Represents natural language query submitted by User
- Belongs to a Conversation
- Produces zero or one structured output
- Generates a written response

### Generated Output
Represents system-produced result from a Prompt.

**Two forms:**
1. Textual Response (summary explanation)
2. Structured Table (tabular dataset view)

**Characteristics:**
- Derived only from ingested Tenant data
- May include aggregated or grouped data
- May be filtered within Output tab
- Enables the Validate view

### Validation Dataset
- Represents dataset used to generate structured output, including applied filters and constraints
- Derived strictly from ingested Tenant data
- Reflects applied filters
- Does not include fabricated or simulated records

---

## 7. Key Relationships

### Organizational Relationships
- A Tenant represents an organization (Load Poster or Fleet Operator)
- A User belongs to exactly one Tenant
- A Tenant owns its Loads and Quotes

### Load and Quote Relationships
- A Load is created and owned by a Load Poster Tenant
- A Load may receive multiple Quotes
- A Quote is submitted by exactly one Fleet Operator Tenant
- A Quote references exactly one Load via Load ID
- A Load may have zero or one Accepted Quote
- When a Quote is accepted, the Load becomes associated with awarded Fleet Operator

### Access Control Relationships

**Load Poster Tenant can access:**
- Loads they created
- All Quotes associated with those Loads

**Fleet Operator Tenant can access:**
- Quotes submitted by their organization only
- Loads they have submitted a Quote for

**Restriction:** Tenants cannot access data belonging to other Tenants outside these rules.

### Interaction Model Relationships
- A Conversation belongs to exactly one User
- A Prompt belongs to exactly one Conversation
- A Generated Output belongs to exactly one Prompt
- A Validation Dataset is derived from and corresponds to a specific Generated Output

---

## 8. Success Criteria

### Tenant Data Isolation
Each Tenant represents a Fleet Operator organization.

**A Tenant can access:**
- Quotes submitted by their organization
- Loads awarded to their organization only

**A Tenant cannot access:**
- Quotes submitted by other Fleet Operators
- Loads not awarded to them

### Relationship Integrity
- A Quote belongs to exactly one Tenant
- A Quote references exactly one Load via Load ID
- A Load may have multiple Quotes across system (not all visible)
- A Tenant can only access Loads where their Quote is the Accepted Quote

### Award Logic Integrity
- A Load may have zero or one Accepted Quote
- A Load becomes visible to Tenant only if their Quote is the Accepted Quote
- Non-awarded Loads must not be accessible

### Output Integrity
**Generated Output is derived strictly from:**
- Tenant-owned Quotes
- Loads awarded to that Tenant

**Requirements:**
- Validation Dataset reflects exactly the filtered dataset used
- No fabricated or simulated records are included
- Aggregations operate only on accessible data

### Conversation Integrity
- A Conversation belongs to exactly one User
- A Prompt belongs to exactly one Conversation
- A Generated Output belongs to exactly one Prompt
- Deleting a Conversation removes associated Prompts and Outputs

---

## 9. Edge Cases & Constraints

### Data Edge Cases
- A Quote may exist for a Load that is never awarded
  - The Quote remains visible
  - The Load remains invisible
- A Load may be awarded but later cancelled
  - It remains visible if award history is preserved
- A Tenant may have:
  - Zero awarded Loads
  - Multiple Quotes for different Loads
- A Load may contain fields not relevant to analytics (must not break queries)

### Access Constraints
**A Tenant must not see:**
- Other Fleet Operators' Quotes
- Loads not awarded to them

**Requirements:**
- Access control must be enforced before filtering and aggregation
- Aggregations must not compute across inaccessible Loads

### State Constraints
- A Load cannot have more than one Accepted Quote
- If award status changes, Load visibility must update accordingly
- Orphaned Quotes (Load deleted externally) must not break queries

### Analytical Constraints
- If filters produce zero records:
  - Structured Output returns empty dataset
  - No derived summary values are fabricated
- Aggregations (count, sum, average, mode, win_rate, ratio, count_match) must operate only on accessible records

---

## 10. Supported Query Capabilities (MVP Implementation)

### Aggregations
The query engine supports the following aggregation operations:

- **count** — Total rows in group (or globally when no groupBy)
- **count_match** — Count rows where a field equals a value (e.g. quotes won = status "accepted", quotes lost = status "rejected")
- **sum** — Sum of numeric field (e.g. total revenue, total distance)
- **avg** — Average of numeric field (e.g. average quoted price)
- **mode** — Most frequent value (e.g. most used vehicle, top load poster)
- **win_rate** — Percentage of rows where field matches value (e.g. % of quotes accepted)
- **ratio** — sum(fieldA) / sum(fieldB) (e.g. price per km = quoted_price / distance_km)

### Derived Metrics
- **Month-over-month / period-over-period change %** — Computed as (current - previous) / previous × 100; first period shows "—"
- **Trend grouping** — By day (YYYY-MM-DD), week (YYYY-Www), month (YYYY-MM), or year (YYYY)
- **Comparisons** — Group by dimension (load poster, vehicle type, period) to compare metrics across categories

### Display Formats
- **month_name** — Dates as YYYY-MM displayed as "January 2026"
- **percent** — Numeric values displayed as "50.0%"
- **currency** — Numeric values displayed as "£1,234.56"

### Data Sources (Views over ETL Flat Output)
- **loads** — Load records only; derived as distinct by `load_id` from flat; tenant-filtered for Fleet Operator
- **quotes** — Quote records only; project Quote fields; tenant-filtered by `associated_fleet_id`
- **loads_and_quotes** — Loads joined with accepted Quote (one row per load); filter flat where `quote.status = 'accepted'`

### Data Ingestion
- **Primary:** ETL pipeline output (processed flat rows from Run Pipeline)
- **Export:** Processed data persisted when user runs pipeline and opts to use in Discovery
- **Fallback:** Mock data conforming to platform schema for standalone Discovery (e.g. JSON in `public/data/`)

### Rate Limiting
- **10 requests per 30 minutes** per IP address
- When exceeded, API returns 429 with message to try again
- Implemented server-side to control API costs

### Deployment
- Application deploys to **Vercel** (or platform backend) via GitHub integration
- `ANTHROPIC_API_KEY` configured as environment variable
- Data: ETL export (API or persisted store) or mock static assets conforming to platform schema
- Conversations and messages persisted in browser localStorage

### Testing
- Query engine tests run via `npm test` (Vitest)

---

## 11. Natural Language to Table Expression System

This section specifies the LLM-to-Table Expression architecture in full. It is intended as a standalone reference for integration, extension, or combination with other products.

### 11.1 Architecture Overview

**Flow:**
```
User prompt (natural language)
    → LLM (interprets intent, produces TableInstruction JSON)
    → API response (summary + optional tableInstruction)
    → Client query engine (executes instruction on dataset)
    → Rendered table / report
```

**Design principles:**
- **Interpretation vs execution:** The LLM only produces a declarative instruction. The client runs it deterministically against the dataset. No data is fabricated by the LLM.
- **Schema-bound:** The LLM must use only fields defined in the data schema (Load, Quote, or joined). Invalid or invented fields cause the query engine to omit or fail.
- **Extensible:** The same pattern can be applied to other domains by defining new data sources, schemas, and optional aggregation ops.

---

### 11.2 TableInstruction Schema (Full Specification)

A **TableInstruction** is a JSON object that fully describes a table or report to be generated.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dataSource` | `"loads" \| "quotes" \| "loads_and_quotes"` | Yes | Which dataset to query. |
| `columns` | `Array<{ id: string; header: string; format?: ColumnFormat }>` | Yes | Output columns. `id` must match `groupBy` field or aggregation `alias`. |
| `filters` | `Array<TableFilter>` | No | Server-side filters applied before grouping/aggregation. |
| `groupBy` | `string[]` | No | Fields to group by. Omit for global totals. |
| `groupByFormats` | `Record<string, "day" \| "week" \| "month" \| "year">` | No | How to truncate date fields for grouping. Default for dates: `month`. |
| `aggregations` | `Array<AggregationSpec>` | No | Required for grouped or totaled output. See §11.4. |
| `sort` | `Array<{ field: string; dir: "asc" \| "desc" }>` | No | Sort by field (or aggregation alias). |
| `limit` | `number` | No | Max rows (e.g. "top 5"). |
| `pctChange` | `{ field: string; alias: string }` | No | Add % change vs previous row. Requires `sort` by period ascending. |

**ColumnFormat** (optional per column):
- `"month_name"` — `YYYY-MM` → "January 2026"
- `"percent"` — numeric → "50.0%"
- `"currency"` — numeric → "£1,234.56"

---

### 11.3 Data Sources and Field Schemas

**Platform alignment:** All field names use the platform data model (`.specify/platform-data-model.md`). Naming convention: `snake_case`.

| dataSource | Description | Row shape |
|------------|--------------|-----------|
| `loads` | Load records only | Load fields (see below) |
| `quotes` | Quote records only | Quote fields (see below) |
| `loads_and_quotes` | Loads joined with accepted Quote | Load + Quote fields (one row per load) |

**Load fields** (exact names; use these in `groupBy`, `columns`, `aggregations`):
`load_id`, `status`, `load_poster_name`, `allocated_vehicle_id`, `driver_id`, `collection_town`, `collection_city`, `collection_date`, `collection_time`, `delivery_town`, `delivery_city`, `delivery_date`, `delivery_time`, `distance_km`, `number_of_items`, `completion_date`, `created_at`, `updated_at`. When joined with Driver+Vehicle: `vehicle_type`, `driver_name` (Driver.name).

**Quote fields:**
`quote_id`, `load_id`, `associated_fleet_id`, `fleet_quoter_name`, `load_poster_name`, `status`, `quoted_price`, `date_created`, `requested_vehicle_type`, `collection_town`, `collection_city`, `collection_date`, `collection_time`, `delivery_town`, `delivery_city`, `delivery_date`, `delivery_time`, `distance_km`, `created_at`, `updated_at`.

**loads_and_quotes** (one row per load with accepted quote): Combines Load fields above with Quote fields. Use `quoted_price` for revenue/price (from accepted quote). Distance: `distance_km`. Status values: Load `status` (draft/posted/in_transit/completed/cancelled), Quote `status` (draft/sent/accepted/rejected/expired).

**Note:** Do not invent field names (e.g. `month`, `profit`). The query engine only recognizes the fields above.

---

### 11.4 Aggregation Expressions

Each aggregation is an object with `op` (required) and optional `field`, `alias`, `matchValue`, `fieldA`, `fieldB` depending on the op.

| op | Parameters | Output | Description |
|----|------------|--------|-------------|
| `count` | `field`, `alias` | number | Total rows in group. Use any non-null field for `field`. |
| `count_match` | `field`, `matchValue`, `alias` | number | Rows where `field === matchValue` (e.g. status = "accepted"). |
| `sum` | `field`, `alias` | number | Sum of numeric `field`. |
| `avg` | `field`, `alias` | number | Mean of numeric `field`. |
| `mode` | `field`, `alias` | string | Most frequent value. |
| `win_rate` | `field`, `matchValue`, `alias` | number | (matching / total) × 100. Typically `format: "percent"`. |
| `ratio` | `fieldA`, `fieldB`, `alias` | number | `sum(fieldA) / sum(fieldB)` (e.g. price per km = quoted_price / distance_km). |

**Global aggregation:** Omit `groupBy` and use `aggregations` alone for one-row totals.

**Example aggregations:**
```json
[
  { "field": "quote_id", "op": "count", "alias": "total" },
  { "field": "status", "op": "count_match", "matchValue": "accepted", "alias": "won" },
  { "field": "quoted_price", "op": "sum", "alias": "totalPrice" },
  { "field": "status", "op": "win_rate", "matchValue": "accepted", "alias": "winRate" },
  { "op": "ratio", "fieldA": "quoted_price", "fieldB": "distance_km", "alias": "pricePerKm" }
]
```

---

### 11.5 Filter Expressions (TableFilter)

Filters can be included in the TableInstruction (server-side, applied at query time) or applied client-side via the Output/Validate tab UI.

| operator | `value` type | `topBottomN` | Description |
|----------|--------------|-------------|-------------|
| `include` | `(string \| number)[]` | — | Keep rows where field is in the list. |
| `exclude` | `(string \| number)[]` | — | Remove rows where field is in the list. |
| `eq` | `string \| number` | — | Equal. |
| `ne` | `string \| number` | — | Not equal. |
| `lt`, `lte`, `gt`, `gte` | number | — | Numeric comparison. |
| `between` | `[number, number]` | — | Min ≤ value ≤ max (inclusive). |
| `top` | — | number | Top N by field value (descending). |
| `bottom` | — | number | Bottom N by field value (ascending). |

---

### 11.6 Date Grouping (groupByFormats)

When `groupBy` includes a date field (e.g. `completion_date`), `groupByFormats` controls truncation:

| format | Output key | Example |
|--------|------------|---------|
| `day` | YYYY-MM-DD | 2025-01-15 |
| `week` | YYYY-Www | 2025-W03 |
| `month` | YYYY-MM | 2025-01 |
| `year` | YYYY | 2025 |

---

### 11.7 Month-over-Month Change (pctChange)

For trend reports, add a % change column:

- `pctChange.field`: The aggregation alias to compare (e.g. `"totalPrice"`).
- `pctChange.alias`: Column id for the change (e.g. `"changePct"`).
- Rows must be `sort`ed by the period field ascending.
- First row shows `null` (no previous period). Subsequent rows: `(current - previous) / previous × 100`.

---

### 11.8 Natural Language → TableInstruction Mapping

The LLM maps user intent to a TableInstruction. Below are representative mappings.

**Complete JSON examples (copy-pasteable):**

*Global totals (total quotes, won, lost):*
```json
{
  "dataSource": "quotes",
  "columns": [
    { "id": "total", "header": "Total" },
    { "id": "won", "header": "Won" },
    { "id": "lost", "header": "Lost" }
  ],
  "aggregations": [
  { "field": "quote_id", "op": "count", "alias": "total" },
  { "field": "status", "op": "count_match", "matchValue": "accepted", "alias": "won" },
  { "field": "status", "op": "count_match", "matchValue": "rejected", "alias": "lost" }
  ]
}
```

*Win rate by load poster (grouped + percent format):*
```json
{
  "dataSource": "quotes",
  "groupBy": ["load_poster_name"],
  "columns": [
    { "id": "load_poster_name", "header": "Load Poster" },
    { "id": "winRate", "header": "Win Rate", "format": "percent" }
  ],
  "aggregations": [
    { "field": "status", "op": "win_rate", "matchValue": "accepted", "alias": "winRate" }
  ]
}
```

*Month-over-month revenue with % change:*
```json
{
  "dataSource": "loads_and_quotes",
  "groupBy": ["completion_date"],
  "groupByFormats": { "completion_date": "month" },
  "columns": [
    { "id": "completion_date", "header": "Month", "format": "month_name" },
    { "id": "totalPrice", "header": "Revenue", "format": "currency" },
    { "id": "changePct", "header": "Change %", "format": "percent" }
  ],
  "aggregations": [{ "field": "quoted_price", "op": "sum", "alias": "totalPrice" }],
  "sort": [{ "field": "completion_date", "dir": "asc" }],
  "pctChange": { "field": "totalPrice", "alias": "changePct" }
}
```

| User intent | Key TableInstruction elements |
|-------------|------------------------------|
| "Total revenue" | `dataSource: "loads_and_quotes"`, `aggregations: [{ field: "quoted_price", op: "sum", alias: "totalPrice" }]`, no groupBy |
| "Revenue by month" | `groupBy: ["completion_date"]`, `groupByFormats: { completion_date: "month" }`, `aggregations: [{ field: "quoted_price", op: "sum", alias: "totalPrice" }]` |
| "Top 5 load posters by revenue" | `groupBy: ["load_poster_name"]`, `aggregations: [{ field: "quoted_price", op: "sum", alias: "totalPrice" }]`, `sort: [{ field: "totalPrice", dir: "desc" }]`, `limit: 5` |
| "Win rate by load poster" | `dataSource: "quotes"`, `groupBy: ["load_poster_name"]`, `aggregations: [{ field: "status", op: "win_rate", matchValue: "accepted", alias: "winRate" }]`, `format: "percent"` |
| "Quotes won vs lost" | `dataSource: "quotes"`, `aggregations`: count, count_match accepted, count_match rejected |
| "Price per km by vehicle" | `groupBy: ["vehicle_type"]`, `aggregations: [{ op: "ratio", fieldA: "quoted_price", fieldB: "distance_km", alias: "pricePerKm" }]` |
| "Monthly revenue with % change" | `groupBy`, `groupByFormats`, `aggregations`, `sort` by date asc, `pctChange: { field: "totalPrice", alias: "changePct" }` |
| "Make month readable" (follow-up) | Same instruction with `format: "month_name"` on date column |

---

### 11.9 API Contract

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

- `previousTableInstruction`: Optional. For follow-ups like "make month more readable", the client sends the last tableInstruction; the LLM returns a modified version.

**Response (success):**
```json
{
  "summary": "Your total revenue in January 2025 was £45,200.",
  "title": "January revenue summary",
  "tableInstruction": {
    "dataSource": "loads",
    "columns": [{ "id": "totalPrice", "header": "Total Revenue", "format": "currency" }],
    "aggregations": [{ "field": "quoted_price", "op": "sum", "alias": "totalPrice" }]
  }
}
```

- `tableInstruction` is optional. Omit when the answer is text-only or when refusing the request.

---

### 11.10 Query Engine Execution Order

The client applies the instruction in this order:

1. **Base rows** — Select dataset (`loads`, `quotes`, or `loads_and_quotes`).
2. **Filters** — Apply `filters` (server-side) to get base result set.
3. **Validation rows** — Store filtered rows for Validate tab.
4. **Group by + aggregations** — If `aggregations` present, group by `groupBy` (or global if empty) and compute aggregations.
5. **Sort** — Apply `sort`.
6. **Limit** — Apply `limit`.
7. **pctChange** — If present, add % change column (rows must be sorted by period).

Client-side filters (Output/Validate tab) are applied after steps 1–7 for display only.

---

### 11.11 Extending for Other Products

To reuse this system with another product:

1. **Define data sources** — Add new `dataSource` values and corresponding row schemas.
2. **Extend schema** — Add fields to Load/Quote or introduce new entity types.
3. **Update LLM system prompt** — Document the new schema, fields, and example mappings.
4. **Add aggregation ops** — Implement new `op` values in the query engine and document them.
5. **API contract** — Request/response shape stays the same; only `tableInstruction` content changes.

---

### 11.12 Natural Language Query Patterns: Comprehensive Reference

This subsection documents how the system supports groupings, conditions/filters, comparisons, trend analysis, and related patterns. Each pattern includes natural language examples and the corresponding TableInstruction approach.

---

#### 11.12.1 Groupings

**Single-dimension grouping:** Aggregate by one field.

| Natural language example | TableInstruction approach |
|-------------------------|---------------------------|
| "Revenue by load poster" | `groupBy: ["load_poster_name"]`, `aggregations: [{ field: "quoted_price", op: "sum", alias: "totalPrice" }]` |
| "How many loads per vehicle type?" | `groupBy: ["vehicle_type"]`, `aggregations: [{ field: "load_id", op: "count", alias: "count" }]` |
| "Win rate by load poster" | `dataSource: "quotes"`, `groupBy: ["load_poster_name"]`, `aggregations: [{ field: "status", op: "win_rate", matchValue: "accepted", alias: "winRate" }]` |
| "Most used vehicle per client" | `groupBy: ["load_poster_name"]`, `aggregations: [{ field: "vehicle_type", op: "mode", alias: "mostUsedVehicle" }]` |

**Multi-dimension grouping:** Group by two or more fields. Rows are partitioned by the composite key (e.g. load poster + vehicle type).

| Natural language example | TableInstruction approach |
|-------------------------|---------------------------|
| "Revenue by load poster and vehicle type" | `groupBy: ["load_poster_name", "vehicle_type"]`, `aggregations: [{ field: "quoted_price", op: "sum", alias: "totalPrice" }]` |
| "Quote count by load poster and status" | `dataSource: "quotes"`, `groupBy: ["load_poster_name", "status"]`, `aggregations: [{ field: "quote_id", op: "count", alias: "count" }]` |
| "Loads and revenue by month and vehicle" | `groupBy: ["completion_date", "vehicle_type"]`, `groupByFormats: { completion_date: "month" }`, `aggregations: [{ field: "load_id", op: "count", alias: "loads" }, { field: "quoted_price", op: "sum", alias: "revenue" }]` |

**Global totals (no grouping):** Single-row summary across all data.

| Natural language example | TableInstruction approach |
|-------------------------|---------------------------|
| "What's my total revenue?" | No `groupBy`, `aggregations: [{ field: "quoted_price", op: "sum", alias: "totalPrice" }]` |
| "Total quotes, won, and lost" | No `groupBy`, three aggregations: count, count_match Accepted, count_match Failed |

---

#### 11.12.2 Conditions and Filters

**Filter logic:** Multiple filters in `filters` are combined with **AND**. Within a single `include` or `exclude` filter, values are combined with **OR** (field matches any value in the list).

**Simple filters (single condition):**

| Natural language example | TableInstruction approach |
|-------------------------|---------------------------|
| "Completed loads only" | `filters: [{ field: "status", operator: "eq", value: "completed" }]` |
| "Quotes that were accepted" | `dataSource: "quotes"`, `filters: [{ field: "status", operator: "eq", value: "accepted" }]` |
| "Loads over £500" | `filters: [{ field: "quoted_price", operator: "gt", value: 500 }]` |
| "Distance between 100 and 300 km" | `filters: [{ field: "distance_km", operator: "between", value: [100, 300] }]` |
| "Exclude small_van" | `filters: [{ field: "vehicle_type", operator: "exclude", value: ["Van"] }]` |

**Compound filters (AND across fields):** Add multiple filter objects. All must match.

| Natural language example | TableInstruction approach |
|-------------------------|---------------------------|
| "Completed loads over £500" | `filters: [{ field: "status", operator: "eq", value: "completed" }, { field: "quoted_price", operator: "gt", value: 500 }]` |
| "small_van or rigid_7_5t loads from Tesco" | `filters: [{ field: "vehicle_type", operator: "include", value: ["small_van", "rigid_7_5t"] }, { field: "load_poster_name", operator: "eq", value: "Tesco" }]` |
| "Accepted quotes for loads over 200 miles" | `dataSource: "loads_and_quotes"`, `filters: [{ field: "status", operator: "eq", value: "accepted" }, { field: "distance_km", operator: "gt", value: 200 }]` |

**Include / exclude (OR within one field):**

| Natural language example | TableInstruction approach |
|-------------------------|---------------------------|
| "Loads for Tesco or Amazon" | `filters: [{ field: "load_poster_name", operator: "include", value: ["Tesco", "Amazon"] }]` |
| "Everything except small_van" | `filters: [{ field: "vehicle_type", operator: "exclude", value: ["Van"] }]` |
| "Exclude Tesco and Asda" | `filters: [{ field: "load_poster_name", operator: "exclude", value: ["Tesco", "Asda"] }]` |

**Top / bottom N:**

| Natural language example | TableInstruction approach |
|-------------------------|---------------------------|
| "Top 10 highest-priced loads" | `filters: [{ field: "quoted_price", operator: "top", topBottomN: 10 }]`, or use `sort` + `limit` on base rows |
| "Bottom 5 by distance" | `filters: [{ field: "distance_km", operator: "bottom", topBottomN: 5 }]` |

**Limitation — OR across different fields:** The system does not support `(status = completed OR vehicle_type = small_van)` as a single logical expression. To approximate, the LLM may return multiple possible interpretations or guide the user to narrower questions. For "A OR B" across different fields, future extensions could add an `or` filter group.

---

#### 11.12.3 Comparisons

**Compare across dimension:** Group by the dimension and aggregate; each row is a comparison.

| Natural language example | TableInstruction approach |
|-------------------------|---------------------------|
| "Compare revenue across load posters" | `groupBy: ["load_poster_name"]`, `aggregations: [{ field: "quoted_price", op: "sum", alias: "revenue" }]`, `sort: [{ field: "revenue", dir: "desc" }]` |
| "Compare win rate by vehicle type" | `dataSource: "quotes"`, `groupBy: ["requested_vehicle_type"]`, `aggregations: [{ field: "status", op: "win_rate", matchValue: "accepted", alias: "winRate" }]` |
| "Which load poster gives the most work?" | `groupBy: ["load_poster_name"]`, `aggregations: [{ field: "load_id", op: "count", alias: "loadCount" }]`, `sort: [{ field: "loadCount", dir: "desc" }]`, `limit: 1` |

**Side-by-side metrics (multiple aggregations per group):** Each column is a different metric for the same dimension.

| Natural language example | TableInstruction approach |
|-------------------------|---------------------------|
| "Per load poster: loads, revenue, and average price" | `groupBy: ["load_poster_name"]`, `aggregations: [{ field: "load_id", op: "count", alias: "loads" }, { field: "quoted_price", op: "sum", alias: "revenue" }, { field: "quoted_price", op: "avg", alias: "avgPrice" }]` |
| "Per vehicle: count, total distance, price per km" | `groupBy: ["vehicle_type"]`, `aggregations: [{ field: "load_id", op: "count", alias: "count" }, { field: "distance_km", op: "sum", alias: "totalKm" }, { op: "ratio", fieldA: "quoted_price", fieldB: "distance_km", alias: "pricePerKm" }]` |

**Ranking (top / bottom N):**

| Natural language example | TableInstruction approach |
|-------------------------|---------------------------|
| "Top 5 load posters by revenue" | `groupBy: ["load_poster_name"]`, `aggregations`, `sort: [{ field: "totalPrice", dir: "desc" }]`, `limit: 5` |
| "Bottom 3 months by load count" | `groupBy: ["completion_date"]`, `groupByFormats: { completion_date: "month" }`, `aggregations`, `sort: [{ field: "count", dir: "asc" }]`, `limit: 3` |

---

#### 11.12.4 Trend Analysis

**Time-based grouping:** Use `groupBy` on a date field and `groupByFormats` for the granularity.

| Natural language example | groupByFormats | Output granularity |
|-------------------------|----------------|--------------------|
| "Revenue by day" | `{ completion_date: "day" }` | YYYY-MM-DD |
| "Weekly load count" | `{ completion_date: "week" }` | YYYY-Www |
| "Monthly revenue" | `{ completion_date: "month" }` | YYYY-MM |
| "Yearly totals" | `{ completion_date: "year" }` | YYYY |

**Period-over-period % change:** Use `pctChange` with rows sorted by period ascending.

| Natural language example | TableInstruction approach |
|-------------------------|---------------------------|
| "Monthly revenue with month-over-month % change" | `groupBy: ["completion_date"]`, `groupByFormats: { completion_date: "month" }`, `aggregations`, `sort: [{ field: "completion_date", dir: "asc" }]`, `pctChange: { field: "totalPrice", alias: "changePct" }` |
| "Weekly trend with change %" | `groupByFormats: { completion_date: "week" }`, `pctChange` |
| "Year-over-year growth" | `groupByFormats: { completion_date: "year" }`, `pctChange` |

**Trend by dimension:** Group by both time and another dimension for breakdowns.

| Natural language example | TableInstruction approach |
|-------------------------|---------------------------|
| "Monthly revenue by vehicle type" | `groupBy: ["completion_date", "vehicle_type"]`, `groupByFormats: { completion_date: "month" }`, `aggregations` |
| "Win rate trend by month" | `dataSource: "quotes"`, `groupBy: ["date_created"]`, `groupByFormats: { date_created: "month" }`, `aggregations: [{ field: "status", op: "win_rate", matchValue: "accepted", alias: "winRate" }]` |

---

#### 11.12.5 Raw Listings and Detail Views

**Unaggregated rows:** Omit `aggregations` to return raw rows. Use `filters`, `sort`, and `limit` to scope.

| Natural language example | TableInstruction approach |
|-------------------------|---------------------------|
| "Show me my last 10 loads" | No `aggregations`, `columns` with desired fields, `sort: [{ field: "completion_date", dir: "desc" }]`, `limit: 10` |
| "List all loads for Tesco" | `filters: [{ field: "load_poster_name", operator: "eq", value: "Tesco" }]`, `columns` with Load fields |
| "Completed loads with price and distance" | `filters: [{ field: "status", operator: "eq", value: "completed" }]`, `columns: [{ id: "load_id", header: "Load" }, { id: "quoted_price", header: "Price" }, { id: "distance_km", header: "Distance" }]` |

---

#### 11.12.6 Combined Patterns

**Filter + group + aggregate + sort + limit:**

| Natural language example | TableInstruction approach |
|-------------------------|---------------------------|
| "Top 5 load posters by revenue" | `groupBy: ["load_poster_name"]`, `aggregations`, `sort: [{ field: "totalPrice", dir: "desc" }]`, `limit: 5` |
| "Top 5 load posters by revenue (completed only)" | `filters: [{ field: "status", operator: "eq", value: "completed" }]`, `groupBy: ["load_poster_name"]`, `aggregations`, `sort`, `limit: 5` |
| "Win rate for small_van quotes only" | `dataSource: "quotes"`, `filters: [{ field: "requested_vehicle_type", operator: "eq", value: "small_van" }]`, `groupBy: ["load_poster_name"]`, `aggregations` |
| "Monthly revenue for Tesco only" | `filters: [{ field: "load_poster_name", operator: "eq", value: "Tesco" }]`, `groupBy: ["completion_date"]`, `groupByFormats: { completion_date: "month" }`, `aggregations` |

*Note: Numeric filters (`eq`, `ne`, `lt`, `lte`, `gt`, `gte`, `between`) work on numeric fields. Date range filtering would require the query engine to support date-aware comparison; for now, scope by grouping (e.g. by month) and use filters on non-date fields.*

---

#### 11.12.7 Summary: Supported vs Not Yet Supported

| Capability | Supported | Notes |
|------------|-----------|-------|
| Single-field grouping | Yes | `groupBy: ["fieldName"]` |
| Multi-field grouping | Yes | `groupBy: ["field1", "field2"]` |
| Date grouping (day/week/month/year) | Yes | `groupByFormats` |
| Global totals (no group) | Yes | Omit `groupBy` |
| AND between filters | Yes | Multiple objects in `filters` |
| OR within one field (include/exclude) | Yes | `include` / `exclude` with value array |
| OR across different fields | No | Would require filter group extension |
| Numeric comparisons (eq, ne, lt, lte, gt, gte, between) | Yes | Per-field filters |
| Top N / Bottom N | Yes | Filter `top`/`bottom` or sort + limit |
| Period-over-period % change | Yes | `pctChange` with sort by period |
| Multiple aggregations per group | Yes | Multiple objects in `aggregations` |
| Raw row listing (no aggregation) | Yes | Omit `aggregations` |
| Filter + group + aggregate | Yes | Combine `filters`, `groupBy`, `aggregations` |
| Sort by multiple columns | Yes | Multiple entries in `sort` (tie-breaking) |
| Date range filter (e.g. "in 2025") | Partial | Numeric filters expect numbers; date-aware filters would require engine extension. Use grouping by period to scope. |

---

## 12. Assumptions

### Platform Data Model
- All entities and fields conform to `.specify/platform-data-model.md`
- Field names use `snake_case`; enum values use lowercase (e.g. `accepted`, `completed`, `small_van`)

### Organizational Assumptions
- Each Tenant represents a Fleet Operator organization only
- Load Poster is stored as a string attribute on Load
- Users belong to exactly one Fleet Operator Tenant

### Data Assumptions
- Load ID and Quote ID are unique
- Status is stored as a string
- Awarded status is determinable from Load or Quote data
- Distance and date fields are stored in consistent format

### Visibility Assumptions
- Load visibility is determined by award status
- Quote visibility is determined by Tenant ownership
- Access restrictions are enforced at query time before output generation

### Scope Assumptions (MVP)
- No Load Poster access model
- No cross-tenant collaboration logic
- No negotiation history modeling
- No shared ownership of Loads
- No predictive or simulated analytics