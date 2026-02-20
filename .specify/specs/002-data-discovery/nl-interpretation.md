# Natural Language Interpretation Requirements — Data Discovery

> **Spec-Kit aligned**: This document applies [Spec-Driven Development](https://github.com/github/spec-kit) principles — explicit acceptance scenarios, concrete example phrasings, and a formal interpretation contract — to ensure the LLM-mediated NL-to-table flow is specified precisely enough for consistent implementation.

## 1. General Interpretation Pattern

Discovery converts natural language prompts into structured `TableInstruction` JSON via an LLM (Claude). The client-side query engine then executes the instruction against the pipeline's flat table.

| Aspect | Contract |
|--------|----------|
| **Input** | User-entered free text (plain English) |
| **Mediator** | Claude API with system prompt + data column context |
| **Output** | `TableInstruction` JSON that the client query engine can execute |
| **Fallback** | Text-only response when no table is applicable |
| **Failure** | Show error message; user must rephrase. Never show raw LLM output as a table. |
| **Scope** | Analytics queries over the pipeline's flat table (loads_and_quotes, loads, quotes views) |

**Specification principle**: Every supported query pattern MUST include:
1. Example phrasings that MUST work
2. The exact `TableInstruction` JSON the LLM should produce
3. The expected output shape (columns, value types, row constraints)
4. Edge cases with expected behaviour

---

## 2. Semantic Taxonomy — Query Intent Categories

User prompts fall into these intent categories. The LLM must classify intent before generating a `TableInstruction`.

| Category | Description | Example phrasings |
|----------|-------------|-------------------|
| **Route profitability** | Group by origin + destination, aggregate revenue | "top 5 profitable routes", "which routes make the most money" |
| **Driver activity** | Group by driver, count jobs | "most active drivers", "which drivers have the most loads" |
| **Vehicle filter** | Filter by vehicle type | "show all loads with small vans", "loads using a luton" |
| **City filter** | Filter by collection or delivery city | "jobs from London", "all loads going to Manchester" |
| **Date filter** | Filter by date range or threshold | "jobs starting from 2025-01-15", "loads in January" |
| **Driver filter** | Filter by driver name | "jobs by Alice Smith", "show Alice's loads" |
| **Bidirectional route count** | Count jobs between two cities (both directions) | "how many jobs between London and Birmingham" |
| **Revenue aggregation** | Sum revenue globally or by group | "total revenue", "revenue by month" |
| **Trend analysis** | Time-series grouping with optional pct change | "monthly revenue trend", "revenue by week" |
| **Raw listing** | Show rows with optional sort/limit, no aggregation | "show my last 10 loads", "list all loads" |

---

## 3. Interpretation Contract (Prompt → TableInstruction)

The LLM MUST map user prompts to a `TableInstruction` following these rules.

### 3.1 Field Resolution Rules

The LLM receives the actual column names from the user's data via `dataColumns`. It MUST use these exact names.

| Concept | Canonical field | Fallback aliases |
|---------|----------------|------------------|
| Revenue / price / profitability | `quoted_price` | `Quoted Amount`, `Quoted price`, `price` |
| Route origin (city) | `collection_city` | `Collection City` |
| Route origin (town) | `collection_town` | `Collection Town` |
| Route destination (city) | `delivery_city` | `Delivery City` |
| Route destination (town) | `delivery_town` | `Delivery Town` |
| Driver | `driver_name` | `name`, `Driver Name` |
| Vehicle type | `vehicle_type` | `requested_vehicle_type`, `Vehicle Type`, `Type` |
| Collection date | `collection_date` | `Collection Date`, `Collection Time` |
| Load identifier | `load_id` | `Load Number`, `Load Reference` |
| Tenant identifier | `associated_fleet_id` | `Fleet ID`, `fleet_id` |
| Quote status | `quote_status` | `Quote Status`, `Status` |

### 3.2 Prohibited Outputs

| ID | Prohibition | Reason |
|----|-------------|--------|
| P-1 | Do NOT add `quote_status = accepted` filter when `dataSource` is `loads_and_quotes` | The `loads_and_quotes` view already filters for accepted quotes |
| P-2 | Do NOT use a field called `route` | No such field exists; routes = `groupBy` on collection + delivery fields |
| P-3 | Do NOT use `op` in filters | Filters use `operator`, not `op`. (`op` is for aggregations only.) |
| P-4 | Do NOT invent field names not present in `dataColumns` | Use only fields from the actual data |
| P-5 | Do NOT produce `tableInstruction` for ambiguous, off-topic, or cross-tenant queries | Respond with text-only refusal |

### 3.3 Phrase → TableInstruction Mapping

| Phrase pattern | dataSource | groupBy | aggregations | filters / orFilters | sort | limit |
|----------------|-----------|---------|-------------|-------------------|------|-------|
| "top N profitable routes" | `loads_and_quotes` | `["collection_city","delivery_city"]` | `[{field:"quoted_price", op:"sum", alias:"total_revenue"}]` | — | `[{field:"total_revenue", dir:"desc"}]` | N |
| "most active drivers" | `loads_and_quotes` | `["driver_name"]` | `[{op:"count", alias:"job_count"}]` | — | `[{field:"job_count", dir:"desc"}]` | 5 (default) |
| "how many jobs between X and Y" | `loads_and_quotes` | — | `[{op:"count", alias:"job_count"}]` | orFilters: `[[{field:"collection_city",operator:"eq",value:"X"},{field:"delivery_city",operator:"eq",value:"Y"}],[{field:"collection_city",operator:"eq",value:"Y"},{field:"delivery_city",operator:"eq",value:"X"}]]` | — | — |
| "loads with small van" | `loads_and_quotes` | — | — | `[{field:"vehicle_type", operator:"eq", value:"small_van"}]` | — | — |
| "jobs from city X" | `loads_and_quotes` | — | — | `[{field:"collection_city", operator:"eq", value:"X"}]` | — | — |
| "jobs to city X" | `loads_and_quotes` | — | — | `[{field:"delivery_city", operator:"eq", value:"X"}]` | — | — |
| "jobs starting from date Y" | `loads_and_quotes` | — | — | `[{field:"collection_date", operator:"gte", value:"Y"}]` | — | — |
| "jobs by driver Z" | `loads_and_quotes` | — | — | `[{field:"driver_name", operator:"eq", value:"Z"}]` | — | — |
| "revenue by month" | `loads_and_quotes` | `["collection_date"]` | `[{field:"quoted_price", op:"sum", alias:"revenue"}]` | — | `[{field:"collection_date", dir:"asc"}]` | — |
| "show last N loads" | `loads_and_quotes` | — | — | — | `[{field:"collection_date", dir:"desc"}]` | N |

### 3.4 Vehicle Type Enum Mapping

When the user says a vehicle type in natural language, the LLM MUST use the exact enum value:

| User says | Enum value |
|-----------|-----------|
| "small van" | `small_van` |
| "medium van" | `medium_van` |
| "large van" | `large_van` |
| "luton" | `luton` |
| "7.5 tonne rigid" | `rigid_7_5t` |
| "18 tonne" | `rigid_18t` |
| "26 tonne" | `rigid_26t` |
| "artic" / "articulated" | `articulated` |

---

## 4. Acceptance Scenarios (Given/When/Then)

### 4.1 Route Profitability

| ID | Given | When | Then |
|----|-------|------|------|
| NL-D-01 | Flat table with accepted quotes having `quoted_price`, `collection_city`, `delivery_city` | User asks "What's my top 5 profitable routes?" | LLM produces `{dataSource:"loads_and_quotes", groupBy:["collection_city","delivery_city"], aggregations:[{field:"quoted_price",op:"sum",alias:"total_revenue"}], sort:[{field:"total_revenue",dir:"desc"}], limit:5}`. Query engine returns >= 1 row with columns `collection_city`, `delivery_city`, `total_revenue`. |
| NL-D-02 | Same | User asks "Which routes make the most money?" | Same TableInstruction as NL-D-01 (synonym) |

### 4.2 Driver Activity

| ID | Given | When | Then |
|----|-------|------|------|
| NL-D-03 | Flat table with `driver_name`, accepted quotes | User asks "Which drivers are the most active?" | LLM produces `{dataSource:"loads_and_quotes", groupBy:["driver_name"], aggregations:[{op:"count",alias:"job_count"}], sort:[{field:"job_count",dir:"desc"}]}`. Result has >= 1 row with `driver_name` and `job_count`. |

### 4.3 Bidirectional Route Count

| ID | Given | When | Then |
|----|-------|------|------|
| NL-D-04 | Flat table with London→Birmingham and Birmingham→London routes | User asks "How many jobs between London and Birmingham?" | LLM produces `{dataSource:"loads_and_quotes", orFilters:[[{field:"collection_city",operator:"eq",value:"London"},{field:"delivery_city",operator:"eq",value:"Birmingham"}],[{field:"collection_city",operator:"eq",value:"Birmingham"},{field:"delivery_city",operator:"eq",value:"London"}]], aggregations:[{op:"count",alias:"job_count"}]}`. Result: single row with `job_count` >= 1. |
| NL-D-05 | Same | User asks "Show jobs running between Birmingham and London" | Same structure as NL-D-04 (order of cities does not matter) |

### 4.4 Vehicle Filter

| ID | Given | When | Then |
|----|-------|------|------|
| NL-D-06 | Flat table with `vehicle_type` including `small_van` | User asks "Show me all loads with small vans" | LLM produces `{dataSource:"loads_and_quotes", filters:[{field:"vehicle_type",operator:"eq",value:"small_van"}]}`. Every result row has `vehicle_type === "small_van"`. |

### 4.5 City Filter

| ID | Given | When | Then |
|----|-------|------|------|
| NL-D-07 | Flat table with `collection_city` including London | User asks "Can I see all jobs from London?" | LLM produces `{dataSource:"loads_and_quotes", filters:[{field:"collection_city",operator:"eq",value:"London"}]}`. Every result row has `collection_city === "London"`. |

### 4.6 Date Filter

| ID | Given | When | Then |
|----|-------|------|------|
| NL-D-08 | Flat table with `collection_date` in YYYY-MM-DD format | User asks "Find me all jobs starting from 2025-01-15" | LLM produces `{dataSource:"loads_and_quotes", filters:[{field:"collection_date",operator:"gte",value:"2025-01-15"}]}`. Every result row has `collection_date >= "2025-01-15"`. |

### 4.7 Driver Filter

| ID | Given | When | Then |
|----|-------|------|------|
| NL-D-09 | Flat table with `driver_name` | User asks "Show me all jobs by Alice Smith" | LLM produces `{dataSource:"loads_and_quotes", filters:[{field:"driver_name",operator:"eq",value:"Alice Smith"}]}`. Every result row has `driver_name === "Alice Smith"`. |

### 4.8 Raw Column Name Handling

| ID | Given | When | Then |
|----|-------|------|------|
| NL-D-10 | Flat table with raw column names (`Collection Town`, `Quoted Amount`, `Load Number`) instead of canonical names | User asks "Top 5 profitable routes" and `dataColumns` includes raw names | LLM uses actual column names from `dataColumns`. Query engine resolves aliases via `getRowValue` and returns correct aggregation. |

---

## 5. Edge Cases

| ID | Edge case | Expected behaviour |
|----|-----------|--------------------|
| NL-D-EC-01 | User asks about a field that does not exist (e.g., "profit margin") | LLM responds with text-only: "This field is not available in your data." No `tableInstruction`. |
| NL-D-EC-02 | User asks for cross-tenant data ("show all fleets") | LLM refuses: text-only response explaining single-tenant scope. (P-5) |
| NL-D-EC-03 | Query matches zero rows (e.g., "jobs from Tokyo") | Query engine returns `{ rows: [], totalRows: 0 }`. UI shows "No rows match your criteria." |
| NL-D-EC-04 | User says "profitable routes" but `quoted_price` values contain comma-decimals (`781,68`) | Query engine's `parseNum` handles European format: `781,68 → 781.68`. Aggregation produces correct sums. |
| NL-D-EC-05 | City name has typo in data (e.g., "Birmigham" instead of "Birmingham") | Query engine's `matchesValue` uses `LOCATION_ALIASES` to match "Birmingham" → "Birmigham". |
| NL-D-EC-06 | LLM adds redundant `quote_status = accepted` filter on `loads_and_quotes` | Prohibited (P-1). If it happens, the extra filter is harmless but wastes processing. System prompt must prevent. |
| NL-D-EC-07 | User gives empty prompt | API returns 400: `"prompt is required and must be a string"`. |
| NL-D-EC-08 | Rate limit exceeded (> 10 requests / 30 min) | API returns 429 with retry message. |
| NL-D-EC-09 | LLM returns malformed JSON | `extractJsonObject` fails; API returns text-only summary. |
| NL-D-EC-10 | Follow-up query: "make that monthly" after a revenue query | LLM modifies `previousTableInstruction` to add `groupByFormats: { collection_date: "month" }`. |

---

## 6. Traceability to PRD

| PRD reference | This doc |
|---------------|----------|
| §11.1 Architecture | §1 General Interpretation Pattern |
| §11.2 TableInstruction schema | §3.3 Phrase → TableInstruction Mapping |
| §11.8 NL → TableInstruction mapping | §3 Interpretation Contract |
| §11.12 Query Patterns Reference | §2 Semantic Taxonomy, §4 Acceptance Scenarios |
| §9 Edge Cases | §5 Edge Cases |
| §4 FR – Guardrails | §3.2 Prohibited Outputs |
| §1a View derivation | §3.1 Field Resolution Rules (loads_and_quotes already filters accepted) |
