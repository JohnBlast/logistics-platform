# End-to-End Test Scenarios — Discovery Pipeline

> Full pipeline scenarios: Generate data → Run ETL → Ask query → Verify TableInstruction → Verify output. Each scenario defines input data characteristics, query text, expected intermediate states, and expected output shape.

## 1. Scenario Format

Each scenario specifies:

| Element | Description |
|---------|-------------|
| **Preconditions** | Data characteristics required (row counts, specific routes/statuses/dates) |
| **User query** | The natural language prompt |
| **Expected TableInstruction** | The JSON the LLM should produce |
| **Expected intermediate state** | `baseRows` count range after view derivation |
| **Expected output** | Column names, row count constraint, value types |

---

## 2. Sample Data Reference

All scenarios assume the pipeline has been run with the default generator settings:
- **50 loads**, **100 quotes**, **50 driver+vehicles**
- ~70% of quotes use dominant fleet
- ~45% of joinable quotes biased to `accepted` status
- First 10% of loads: London→Birmingham; next 10%: Birmingham→London
- ~35% of driver+vehicles use `small_van`
- Status values are dirty (typos, mixed case) — enum mapper resolves them

After ETL + join, the flat table has approximately 50 rows. After `deriveLoadsAndQuotes` (tenant + accepted filter), expect **10–30 rows** depending on seed.

For unit tests, the following sample data is used (also in `queryEngine.acceptance.test.ts`):

```json
[
  {"load_id":"l1","quote_id":"q1","associated_fleet_id":"f1","quote_status":"accepted","quoted_price":1200,"collection_town":"Reading","collection_city":"London","delivery_town":"Slough","delivery_city":"Birmingham","collection_date":"2025-01-15","driver_name":"Alice Smith","vehicle_type":"small_van"},
  {"load_id":"l2","quote_id":"q2","associated_fleet_id":"f1","quote_status":"accepted","quoted_price":800,"collection_town":"Luton","collection_city":"London","delivery_town":"Northampton","delivery_city":"Birmingham","collection_date":"2025-01-16","driver_name":"Bob Jones","vehicle_type":"medium_van"},
  {"load_id":"l3","quote_id":"q3","associated_fleet_id":"f1","quote_status":"accepted","quoted_price":2000,"collection_town":"Reading","collection_city":"London","delivery_town":"Slough","delivery_city":"Birmingham","collection_date":"2025-01-14","driver_name":"Alice Smith","vehicle_type":"small_van"},
  {"load_id":"l4","quote_id":"q4","associated_fleet_id":"f1","quote_status":"accepted","quoted_price":600,"collection_town":"Derby","collection_city":"Manchester","delivery_town":"Oxford","delivery_city":"London","collection_date":"2025-01-17","driver_name":"Alice Smith","vehicle_type":"large_van"},
  {"load_id":"l5","quote_id":"q5","associated_fleet_id":"f1","quote_status":"rejected","quoted_price":500,"collection_town":"Cambridge","collection_city":"Birmingham","delivery_town":"Ipswich","delivery_city":"London","collection_date":"2025-01-18","driver_name":"Charlie Brown","vehicle_type":"small_van"}
]
```

---

## 3. Scenarios

### E2E-01: Top 5 Profitable Routes

| Element | Value |
|---------|-------|
| **Preconditions** | Pipeline data with multiple routes having `quoted_price > 0` and `quote_status = accepted` |
| **User query** | "What's my top 5 profitable routes?" |
| **Expected TableInstruction** | |

```json
{
  "dataSource": "loads_and_quotes",
  "groupBy": ["collection_city", "delivery_city"],
  "aggregations": [{"field": "quoted_price", "op": "sum", "alias": "total_revenue"}],
  "sort": [{"field": "total_revenue", "dir": "desc"}],
  "limit": 5
}
```

| Element | Value |
|---------|-------|
| **Intermediate: baseRows** | >= 3 accepted rows (unit test data has 4) |
| **Expected output columns** | `collection_city`, `delivery_city`, `total_revenue` |
| **Expected output rows** | 1–5 rows, sorted desc by `total_revenue` |
| **Expected output values** | `total_revenue` is a positive number (not NaN), even when source has comma-decimals |

**With sample data**: Top route is London→Birmingham with `total_revenue = 4000` (1200 + 800 + 2000).

---

### E2E-02: Most Active Drivers

| Element | Value |
|---------|-------|
| **Preconditions** | Pipeline data with `driver_name` populated |
| **User query** | "Which drivers are the most active?" |
| **Expected TableInstruction** | |

```json
{
  "dataSource": "loads_and_quotes",
  "groupBy": ["driver_name"],
  "aggregations": [{"op": "count", "alias": "job_count"}],
  "sort": [{"field": "job_count", "dir": "desc"}],
  "limit": 5
}
```

| Element | Value |
|---------|-------|
| **Expected output columns** | `driver_name`, `job_count` |
| **Expected output rows** | >= 1, sorted desc by `job_count` |
| **Expected output values** | `job_count` is a positive integer |

**With sample data**: Alice Smith has 3 jobs (l1, l3, l4), Bob Jones has 1 (l2).

---

### E2E-03: Jobs Between London and Birmingham

| Element | Value |
|---------|-------|
| **Preconditions** | Pipeline data with London→Birmingham and/or Birmingham→London routes with accepted quotes |
| **User query** | "How many jobs are running between London and Birmingham?" |
| **Expected TableInstruction** | |

```json
{
  "dataSource": "loads_and_quotes",
  "orFilters": [
    [
      {"field": "collection_city", "operator": "eq", "value": "London"},
      {"field": "delivery_city", "operator": "eq", "value": "Birmingham"}
    ],
    [
      {"field": "collection_city", "operator": "eq", "value": "Birmingham"},
      {"field": "delivery_city", "operator": "eq", "value": "London"}
    ]
  ],
  "aggregations": [{"op": "count", "alias": "job_count"}]
}
```

| Element | Value |
|---------|-------|
| **Intermediate: after orFilters** | >= 1 row matching either direction (location aliases handle typos) |
| **Expected output columns** | `job_count` |
| **Expected output rows** | Exactly 1 row (aggregation without groupBy) |
| **Expected output values** | `job_count >= 1` |

**With sample data**: 3 rows match (l1, l2, l3 are London→Birmingham). `job_count = 3`.

---

### E2E-04: Loads With Small Vans

| Element | Value |
|---------|-------|
| **Preconditions** | Pipeline data with `vehicle_type` including `small_van` |
| **User query** | "Show me all loads with small vans" |
| **Expected TableInstruction** | |

```json
{
  "dataSource": "loads_and_quotes",
  "filters": [{"field": "vehicle_type", "operator": "eq", "value": "small_van"}]
}
```

| Element | Value |
|---------|-------|
| **Expected output columns** | All flat table columns (no explicit columns = all visible) |
| **Expected output rows** | >= 1, all with `vehicle_type === "small_van"` |

**With sample data**: 2 rows (l1, l3 — l5 is rejected so excluded by `loads_and_quotes`).

---

### E2E-05: Jobs From a Specific City

| Element | Value |
|---------|-------|
| **Preconditions** | Pipeline data with `collection_city` including the queried city |
| **User query** | "Can I see all jobs from London?" |
| **Expected TableInstruction** | |

```json
{
  "dataSource": "loads_and_quotes",
  "filters": [{"field": "collection_city", "operator": "eq", "value": "London"}]
}
```

| Element | Value |
|---------|-------|
| **Expected output columns** | All flat table columns |
| **Expected output rows** | >= 1, all with `collection_city` matching "London" (including aliases) |

**With sample data**: 3 rows (l1, l2, l3).

---

### E2E-06: Jobs Starting From a Date

| Element | Value |
|---------|-------|
| **Preconditions** | Pipeline data with `collection_date` in YYYY-MM-DD format |
| **User query** | "Find me all jobs starting from 2025-01-15" |
| **Expected TableInstruction** | |

```json
{
  "dataSource": "loads_and_quotes",
  "filters": [{"field": "collection_date", "operator": "gte", "value": "2025-01-15"}]
}
```

| Element | Value |
|---------|-------|
| **Expected output columns** | All flat table columns |
| **Expected output rows** | >= 1, all with `collection_date >= "2025-01-15"` |

**With sample data**: 3 rows (l1 on 01-15, l2 on 01-16, l4 on 01-17).

---

### E2E-07: Jobs by a Specific Driver

| Element | Value |
|---------|-------|
| **Preconditions** | Pipeline data with `driver_name` populated |
| **User query** | "Show me all jobs by Alice Smith" |
| **Expected TableInstruction** | |

```json
{
  "dataSource": "loads_and_quotes",
  "filters": [{"field": "driver_name", "operator": "eq", "value": "Alice Smith"}]
}
```

| Element | Value |
|---------|-------|
| **Expected output columns** | All flat table columns |
| **Expected output rows** | >= 1, all with `driver_name === "Alice Smith"` |

**With sample data**: 3 rows (l1, l3, l4).

---

### E2E-08: Raw Column Name Handling

| Element | Value |
|---------|-------|
| **Preconditions** | Flat table has raw column names (`Collection Town`, `Quoted Amount`, `Load Number`) instead of canonical names. `dataColumns` passed to Claude contains raw names. |
| **User query** | "Top 5 profitable routes" |
| **Expected TableInstruction** | Same as E2E-01 but Claude may use raw column names if they appear in `dataColumns` |
| **Expected behaviour** | Query engine's `getRowValue` resolves aliases. Aggregation produces correct sums. |
| **Expected output** | >= 1 row with `totalRevenue > 0` (not NaN) |

---

### E2E-09: Comma-Decimal Revenue Aggregation

| Element | Value |
|---------|-------|
| **Preconditions** | Flat table has `quoted_price` values in comma-decimal format (e.g., `"781,68"`, `"1200,50"`) |
| **User query** | "Top 5 profitable routes" |
| **Expected behaviour** | `parseNum("781,68")` returns `781.68`. Aggregation sums are correct, not NaN. |
| **Expected output** | `total_revenue` values are positive numbers, rounded to 2 decimal places |

---

### E2E-10: Location Alias Matching

| Element | Value |
|---------|-------|
| **Preconditions** | Flat table has dirty city names (`Birmigham`, `london`, `Glasow`) |
| **User query** | "How many jobs between London and Birmingham?" |
| **Expected behaviour** | `matchesValue` in query engine uses `LOCATION_ALIASES` to match `"Birmigham"` to `"Birmingham"` and `"london"` to `"London"` |
| **Expected output** | `job_count >= 1` (dirty data rows are included, not silently dropped) |

---

## 4. Boundary State Expectations

Each scenario's data passes through these boundaries. Expected state at each:

```
Generator → [raw rows with dirty values]
    ↓
ETL Mapping → [canonical field names, values still dirty]
    ↓
Enum Mapping → [status/vehicle_type normalized, numbers/dates still dirty]
    ↓
Join → [flat table: quote + load + driver+vehicle columns; quote_status preserved]
    ↓
deriveViews → [filtered: tenant match, quote_status=accepted, distinct by load_id]
    ↓
Query Engine → [field aliases resolved, numbers parsed, locations matched, aggregated]
    ↓
OutputTable → [all result columns rendered]
```

| Boundary | Key assertion |
|----------|--------------|
| After ETL Mapping | Column names are canonical (`load_id`, not `Load Number`) |
| After Enum Mapping | `quote_status ∈ {draft, sent, accepted, rejected, expired}` (no dirty variants) |
| After Join | `quote_status` field exists independently of `load_status` |
| After deriveViews | Only rows where `quote_status === "accepted"` (case-insensitive) remain |
| After Query Engine filters | Location aliases applied; dirty city names match clean filter values |
| After Query Engine aggregation | Numeric sums/averages use `parseNum` (comma-decimals handled); no NaN |
