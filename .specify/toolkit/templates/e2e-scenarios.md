# End-to-End Test Scenarios — Template

> **What this is:** Full pipeline test scenarios that trace data from input through every transformation stage to final output. Not unit tests — these verify that the entire chain works together.
>
> **When to use:** Any feature with multiple components in a chain (data pipeline → query engine → UI, or user input → LLM → action → result). Create one scenario per supported query/action pattern.
>
> **Why it matters:** Unit tests for our query engine all passed, but the end-to-end flow still failed because dirty data from the generator caused NaN in aggregations, and the LLM used wrong field names. E2E scenarios would have caught both issues before implementation.
>
> **Key insight:** Each scenario must define the expected state at EVERY boundary, not just input and output. The boundaries are where bugs hide.
>
> **Spec-Kit phase:** Create during `/speckit.tasks`, before `/speckit.implement`.

---

## Instructions

- Replace all `[bracketed text]` with your content
- Each scenario should be independently testable
- Include CONCRETE sample data — not "some rows with prices" but actual JSON rows
- Define expected intermediate states at each boundary, not just final output
- Remove `<!-- EXPLANATION -->` comments before handoff

---

# End-to-End Test Scenarios — [Feature Name]

## 1. Sample Data Reference

<!-- EXPLANATION: Define the canonical test dataset that all scenarios use. This should be small enough to reason about manually but rich enough to test all patterns. Include field names, types, and enough rows to cover edge cases. -->

**Dataset characteristics:**
- [N] rows of [entity type]
- Includes [specific patterns needed for testing]
- Has [edge case data: dirty values, nulls, boundary dates, etc.]

```json
[
  { "field_1": "value", "field_2": 123, ... },
  { "field_1": "value", "field_2": 456, ... }
]
```

<!-- EXAMPLE (Logistics Discovery):
**Dataset:** 5 flat rows representing loads with accepted/rejected quotes.
```json
[
  {"load_id":"l1","associated_fleet_id":"f1","quote_status":"accepted","quoted_price":1200,"collection_city":"London","delivery_city":"Birmingham","driver_name":"Alice Smith","vehicle_type":"small_van","collection_date":"2025-01-15"},
  {"load_id":"l2","associated_fleet_id":"f1","quote_status":"accepted","quoted_price":800,"collection_city":"London","delivery_city":"Birmingham","driver_name":"Bob Jones","vehicle_type":"medium_van","collection_date":"2025-01-16"},
  {"load_id":"l3","associated_fleet_id":"f1","quote_status":"accepted","quoted_price":2000,"collection_city":"London","delivery_city":"Birmingham","driver_name":"Alice Smith","vehicle_type":"small_van","collection_date":"2025-01-14"},
  {"load_id":"l4","associated_fleet_id":"f1","quote_status":"accepted","quoted_price":600,"collection_city":"Manchester","delivery_city":"London","driver_name":"Alice Smith","vehicle_type":"large_van","collection_date":"2025-01-17"},
  {"load_id":"l5","associated_fleet_id":"f1","quote_status":"rejected","quoted_price":500,"collection_city":"Birmingham","delivery_city":"London","driver_name":"Charlie Brown","vehicle_type":"small_van","collection_date":"2025-01-18"}
]
```
**Note:** l5 is `rejected` and should be excluded by the `loads_and_quotes` view. 4 accepted rows are the working set.
-->

---

## 2. Scenario Format

Each scenario specifies:

| Element | Description |
|---------|-------------|
| **Preconditions** | What data must exist and in what state |
| **User action** | The exact input (query text, button click, API call) |
| **Expected intermediate states** | Data shape at each pipeline boundary |
| **Expected final output** | Columns, row count, value constraints |
| **Edge case variant** | Same scenario but with dirty data |

---

## 3. Scenarios

### E2E-01: [Scenario Name]

<!-- EXPLANATION: Each scenario = one complete flow through the system. -->

| Element | Value |
|---------|-------|
| **Preconditions** | [What data exists, what state the system is in] |
| **User action** | [Exact query/action] |
| **Expected [Structure Name]** | |

```json
{
  "the exact structured intermediate": "that should be produced"
}
```

| Element | Value |
|---------|-------|
| **Intermediate: [Stage Name]** | [Expected state — row count, key values] |
| **Expected output columns** | `[col1, col2, col3]` |
| **Expected output rows** | [Count constraint: exactly N, >= N, 1-5, etc.] |
| **Expected output values** | [Value constraints: positive numbers, sorted desc, etc.] |

**With sample data:** [Walk through the calculation manually so the AI agent can verify.]

<!-- EXAMPLE:
### E2E-01: Top 5 Profitable Routes

| Element | Value |
|---------|-------|
| **Preconditions** | Pipeline data with multiple routes having `quoted_price > 0` |
| **User action** | "What's my top 5 profitable routes?" |
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
| **Intermediate: baseRows** | 4 accepted rows (l1, l2, l3, l4) |
| **Expected output columns** | `collection_city`, `delivery_city`, `total_revenue` |
| **Expected output rows** | 2 rows (London→Birmingham, Manchester→London) |
| **Expected output values** | `total_revenue` > 0 (not NaN); sorted descending |

**With sample data:** London→Birmingham = 1200 + 800 + 2000 = 4000. Manchester→London = 600. Top route: London→Birmingham with 4000.
-->

---

### E2E-02: [Scenario Name]

[Repeat the pattern for each scenario]

---

## 4. Edge Case Scenarios

<!-- EXPLANATION: These are E2E scenarios specifically for dirty data, format issues, and boundary conditions. They test the normalization chain. -->

### E2E-EC-01: [Edge Case Name]

| Element | Value |
|---------|-------|
| **Preconditions** | [What's dirty about the data] |
| **User action** | [Same query as a main scenario] |
| **Expected behaviour** | [How the system handles the dirt] |
| **Expected output** | [What the user sees — should be the same as clean data] |

<!-- EXAMPLE:
### E2E-EC-01: Comma-Decimal Revenue
| **Preconditions** | `quoted_price` values have comma-decimal format: `"781,68"`, `"1200,50"` |
| **User action** | "Top 5 profitable routes" |
| **Expected behaviour** | `parseNum("781,68")` returns 781.68. Aggregation sums correctly. |
| **Expected output** | `total_revenue` values are positive numbers, not NaN. Rounded to 2 decimals. |

### E2E-EC-02: Location Typos
| **Preconditions** | City names have typos: `"Birmigham"`, `"london"` |
| **User action** | "How many jobs between London and Birmingham?" |
| **Expected behaviour** | Location alias matching resolves variants. |
| **Expected output** | `job_count >= 1` (dirty rows included, not silently dropped) |
-->

---

## 5. Retrieval Scenarios (RAG)

<!-- EXPLANATION: If your feature uses RAG, you need scenarios that test the full retrieval → generation chain. These verify that the right chunks are retrieved AND that the LLM produces correct answers from them. Regular E2E scenarios test query → output. RAG E2E scenarios test query → retrieval → context injection → output. -->

> **Applies when:** Your feature retrieves context from a vector store before LLM generation. Skip if no RAG component.
>
> **When to use:** After you've defined the indexing and retrieval contracts. Each scenario tests: "Given these documents are indexed, when the user asks X, the system retrieves Y and answers Z."

### RAG-E2E-01: [Scenario Name]

| Element | Value |
|---------|-------|
| **Indexed documents** | [What's in the vector store — titles, key content, metadata] |
| **User query** | [Exact query text] |
| **Expected retrieved chunks** | [Which chunks should be in top-k, by title/ID] |
| **Expected NOT retrieved** | [Chunks that should NOT appear — e.g., other tenant's docs] |
| **Expected LLM answer** | [Key phrases/facts that must appear in the answer] |
| **Expected citations** | [Which sources should be cited] |

<!-- EXAMPLE:
### RAG-E2E-01: Direct FAQ Match
| **Indexed documents** | "Password Reset Guide" (tenant: acme, category: security), "Billing FAQ" (tenant: acme, category: billing), "Password Reset Guide" (tenant: globex, category: security) |
| **User query** | "How do I reset my password?" (user is tenant: acme) |
| **Expected retrieved chunks** | "Password Reset Guide" (tenant: acme) — must be in top-3 |
| **Expected NOT retrieved** | "Password Reset Guide" (tenant: globex) — different tenant |
| **Expected LLM answer** | Must contain: "Settings > Security > Change Password" and "verification email" |
| **Expected citations** | [Source 1: "Password Reset Guide"] |

### RAG-E2E-02: No Relevant Context
| **Indexed documents** | Same as above |
| **User query** | "What's the weather in London?" |
| **Expected retrieved chunks** | Nothing above similarity threshold |
| **Expected LLM answer** | "I don't have information about that in your documents." |
| **Expected citations** | None |

### RAG-E2E-03: Stale Content Warning
| **Indexed documents** | "Pricing Table" (tenant: acme, last_updated: 2024-01-01 — over 1 year old) |
| **User query** | "What are the current prices?" |
| **Expected retrieved chunks** | "Pricing Table" (above threshold, but flagged as stale) |
| **Expected LLM answer** | Pricing info + warning: "This information was last updated on 2024-01-01 and may be outdated." |

### RAG-E2E-04: Cross-Tenant Isolation
| **Indexed documents** | "Trade Secrets" (tenant: globex), "Public FAQ" (tenant: acme) |
| **User query** | "Tell me about trade secrets" (user is tenant: acme) |
| **Expected retrieved chunks** | ONLY "Public FAQ" if relevant; NEVER "Trade Secrets" (wrong tenant) |
| **Expected LLM answer** | Either answer from Public FAQ or "I don't have information about that" |
-->

---

## 6. Boundary State Expectations

<!-- EXPLANATION: Summarize what should be true at each pipeline boundary across ALL scenarios. This is a quick-reference for the AI agent to validate correctness at any stage. -->

| Boundary | Key assertion |
|----------|--------------|
| After [Stage 1] | [What must be true] |
| After [Stage 2] | [What must be true] |
| After [Stage N] | [What must be true] |

<!-- EXAMPLE:
| After ETL Mapping | Column names are canonical (`load_id`, not `Load Number`) |
| After Enum Mapping | `quote_status ∈ {draft, sent, accepted, rejected, expired}` (no dirty variants) |
| After Join | `quote_status` exists independently of `load_status` |
| After deriveViews | Only `quote_status === "accepted"` rows remain |
| After Query Engine | Location aliases applied; `parseNum` handles comma-decimals; no NaN |
-->
