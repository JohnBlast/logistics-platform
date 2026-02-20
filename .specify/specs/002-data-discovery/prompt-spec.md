# System Prompt Specification — Discovery Chat API

> The system prompt IS the interface contract for an LLM-mediated feature. This document treats it as a versioned, reviewable artifact — changes to the prompt should be reviewed like API changes.

## 1. Overview

| Attribute | Value |
|-----------|-------|
| **LLM model** | `claude-sonnet-4-20250514` |
| **Max tokens** | 4096 |
| **Endpoint** | `POST /api/chat` |
| **Prompt version** | 1.0.0 |
| **Last updated** | 2026-02-20 |

---

## 2. Prompt Structure

The system prompt is composed of four sections, assembled at request time:

```
┌──────────────────────────────────┐
│  Section 1: Role & Task          │  Static
│  Section 2: Schema Reference     │  Static (TABLE_INSTRUCTION_SCHEMA)
│  Section 3: Data Column Context  │  Dynamic (injected per request)
│  Section 4: Rules & Examples     │  Static
└──────────────────────────────────┘
```

### Section 1: Role & Task (static)

```
You are a logistics analytics assistant. The user queries their fleet's quotes
and loads data using natural language.

Your task: Interpret the user's question and produce EITHER:
1. A text-only answer (when no table is needed, or when refusing)
2. A summary PLUS a TableInstruction JSON for the client to execute
```

### Section 2: Schema Reference (static constant `TABLE_INSTRUCTION_SCHEMA`)

Defines the full `TableInstruction` JSON schema with:
- All properties and their types
- Entity field lists (Load fields, Quote fields, loads_and_quotes composite)
- Status enum values per entity
- Route field guidance (no "route" field; use groupBy on collection + delivery)
- Vehicle type enum values

### Section 3: Data Column Context (dynamic injection point `dataSchema`)

Injected when `dataColumns` are provided in the request body.

**Injection condition**: `Array.isArray(dataColumns) && dataColumns.length > 0`

**Template**:

```
CRITICAL - The user's actual data has these EXACT column names. You MUST use
these exact names in filters, groupBy, aggregations, and sort:
{dataColumns.join(', ')}

Field mapping guide (use the column name that exists in the list above):
- Revenue/price/profitability → "quoted_price"
- Route origin (city level) → "collection_city"
- Route origin (town level) → "collection_town"
- Route destination (city level) → "delivery_city"
- Route destination (town level) → "delivery_town"
- Driver → "driver_name" (or "name" if driver_name missing)
- Vehicle type → "vehicle_type" (or "requested_vehicle_type")
- Date of collection → "collection_date"
- Load identifier → "load_id"
- Quote status → "quote_status" (NOTE: loads_and_quotes dataSource already
  filters for accepted quotes, do NOT add extra quote_status filters)
```

### Section 4: Rules & Examples (static)

**Important notes block**:
- `loads_and_quotes` already filters for accepted quotes — do NOT add redundant status filters
- No "route" field exists — routes are expressed via groupBy
- Filters use `operator` (not `op`)

**Concrete examples** (one per supported query pattern):
- Top N profitable routes
- How many jobs between X and Y (with `orFilters`)
- Show all loads with small van
- Most active drivers
- Jobs from city X
- Jobs starting from date Y
- Jobs by driver Z
- Follow-ups modify `previousTableInstruction`
- Ambiguous/off-topic → text-only refusal

**Output format**:
```json
{"summary": "...", "title": "...", "tableInstruction": { ... }}
```

---

## 3. Dynamic Context Injection Points

| Injection point | Source | When injected | Purpose |
|----------------|--------|---------------|---------|
| `dataColumns` | `Object.keys(pipelineOutput.flatRows[0])` | When pipeline data exists | Ensures Claude uses exact column names from actual data |
| `previousTableInstruction` | Frontend conversation state | On follow-up queries | Allows Claude to modify an existing instruction |
| `conversationHistory` | Frontend conversation state | Always (may be empty) | Multi-turn context |

---

## 4. Explicit Rules (Must-Follow)

| ID | Rule | Rationale |
|----|------|-----------|
| R-1 | Use ONLY fields from the `dataColumns` list | Prevents field-name hallucination |
| R-2 | For routes: `groupBy ["collection_city","delivery_city"]` | No "route" field exists |
| R-3 | For revenue/profitability: field `"quoted_price"`, dataSource `"loads_and_quotes"` | `quoted_price` is the only revenue field |
| R-4 | Do NOT filter `quote_status = accepted` on `loads_and_quotes` | View already pre-filters |
| R-5 | Vehicle types use exact enum: `small_van`, `medium_van`, etc. | Generator produces these canonical values |
| R-6 | For "between X and Y" patterns: use `orFilters` with both direction permutations | Bidirectional route matching |
| R-7 | Filters use `operator`, not `op` | `op` is for aggregations only |
| R-8 | Ambiguous or off-topic queries → text-only response, no `tableInstruction` | Prevents garbage table instructions |
| R-9 | Follow-ups modify `previousTableInstruction` where possible | Maintains conversation continuity |

---

## 5. Few-Shot Examples (Embedded in Prompt)

Each example maps a query pattern to the exact `TableInstruction` Claude should produce.

| # | Query pattern | Key instruction fields |
|---|--------------|----------------------|
| 1 | "top N profitable routes" | `dataSource: "loads_and_quotes"`, `groupBy: ["collection_city","delivery_city"]`, `aggregations: [{field:"quoted_price",op:"sum",alias:"total_revenue"}]`, `sort: [{field:"total_revenue",dir:"desc"}]`, `limit: N` |
| 2 | "how many jobs between X and Y" | `dataSource: "loads_and_quotes"`, `orFilters: [[{field:"collection_city",operator:"eq",value:"X"},{field:"delivery_city",operator:"eq",value:"Y"}],[...reverse...]]`, `aggregations: [{op:"count",alias:"job_count"}]` |
| 3 | "loads with small van" | `dataSource: "loads_and_quotes"`, `filters: [{field:"vehicle_type",operator:"eq",value:"small_van"}]` |
| 4 | "most active drivers" | `dataSource: "loads_and_quotes"`, `groupBy: ["driver_name"]`, `aggregations: [{op:"count",alias:"job_count"}]`, `sort: [{field:"job_count",dir:"desc"}]` |
| 5 | "jobs from city X" | `dataSource: "loads_and_quotes"`, `filters: [{field:"collection_city",operator:"eq",value:"X"}]` |
| 6 | "jobs starting from date Y" | `dataSource: "loads_and_quotes"`, `filters: [{field:"collection_date",operator:"gte",value:"Y"}]` |
| 7 | "jobs by driver Z" | `dataSource: "loads_and_quotes"`, `filters: [{field:"driver_name",operator:"eq",value:"Z"}]` |

---

## 6. Response Contract

The API returns JSON with these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `summary` | `string` | Yes | 1-2 sentence answer to the user's question |
| `title` | `string` | Yes | Short title for the conversation (max ~50 chars) |
| `tableInstruction` | `TableInstruction \| undefined` | No | Structured query for the client engine. Omitted for text-only answers. |

---

## 7. Error Handling

| Condition | Response |
|-----------|----------|
| Missing `ANTHROPIC_API_KEY` | `503` with `code: "CLAUDE_UNAVAILABLE"` |
| Rate limit exceeded | `429` (10 requests per 30 minutes) |
| Claude returns no parseable JSON | Text-only response (summary = raw Claude text) |
| Claude API error | `500` with `code: "GENERATION_FAILED"` |
| Missing/invalid `prompt` | `400` with error message |

---

## 8. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-20 | Initial specification. Documents prompt structure, rules, examples, and dynamic injection as implemented. |

---

## 9. Maintenance Guidelines

When modifying the system prompt:

1. **Update this spec first** — Describe the intended change, affected rules, and new examples
2. **Update `nl-interpretation.md`** — If the change adds/removes query patterns or changes field mappings
3. **Update `data-quality.md`** — If the change relates to data format handling
4. **Add acceptance tests** — Every new example in the prompt should have a matching test in `queryEngine.acceptance.test.ts`
5. **Bump version** — Increment patch for rule tweaks, minor for new patterns, major for structural changes
6. **Review like an API change** — Prompt changes can break all downstream query patterns
