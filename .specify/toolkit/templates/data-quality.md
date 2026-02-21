# Data Quality Contract — Template

> **What this is:** A specification of every dirty data pattern the system must handle, and the normalization rules at each pipeline stage. Think of it as a "data cleaning spec" that prevents the AI agent from discovering format issues through runtime debugging.
>
> **When to use:** Any feature that processes data from external sources, user input, or generators — especially when data flows through multiple transformation stages.
>
> **Why it matters:** In our Logistics Discovery project, `Number('781,68')` returning `NaN` caused aggregations to silently fail. Dirty status values like `"Acepted"` were mapped to `null`, making 90% of quotes invisible. City typos like `"Birmigham"` caused zero-match filters. All of these were discoverable before implementation — if the spec had documented the data quality contract.
>
> **Spec-Kit phase:** Create during `/speckit.clarify`, before `/speckit.plan`.

---

## Instructions

- Replace all `[bracketed text]` with your content
- Document REAL examples of dirty data from your actual data sources
- If you don't know the dirty patterns yet, run the data generator or import a sample and catalogue what you see
- Remove `<!-- EXPLANATION -->` comments before handoff

---

# Data Quality Contract — [Feature Name]

## 1. Dirty Data Patterns

<!-- EXPLANATION: Catalogue every type of data inconsistency your system will encounter. Group by field type. Include REAL examples — don't generalize. The AI agent needs to see "781,68" and "Birmigham", not just "may have format issues". -->

### 1.1 [Field Type, e.g., Status/Enum Values]

<!-- EXPLANATION: For each canonical value, list every dirty variant the system might encounter. -->

| Canonical value | Dirty variants (real examples) |
|-----------------|-------------------------------|
| `[value]` | `[Variant 1]`, `[Variant 2]`, `[Variant 3]` |

<!-- EXAMPLE:
| `accepted` | `Accepted`, `ACCEPTED`, `accepted `, `Acepted`, `acceptd`, `ACEPTED`, ` accepted` |
| `rejected` | `Rejected`, `REJECTED`, `Rejectd`, `reject`, `REJCTED`, ` rejected ` |
| `cancelled` | `Cancelled`, `CANCELED`, `Cancled`, `canceld`, `CANCELLED`, `Canceled` |
-->

### 1.2 [Field Type, e.g., Location/City Names]

| Clean value | Dirty variants | Frequency |
|-------------|---------------|-----------|
| `[value]` | `[variants]` | [~N%] |

<!-- EXAMPLE:
| `Birmingham` | `Birmigham`, `birmigham`, `BIRMINGHAM`, `Birmigham ` | ~30% of values |
| `London` | `london`, `LONDON`, `London ` | ~30% |
-->

### 1.3 [Field Type, e.g., Numeric Values]

<!-- EXPLANATION: Numbers are the sneakiest. European vs US formats, unit suffixes, null representations — document them ALL. -->

| Pattern | Example | Frequency |
|---------|---------|-----------|
| [format description] | `[example]` → [parsed value] | [~N%] |

<!-- EXAMPLE:
| Standard decimal | `1234.56` → 1234.56 | ~25% |
| Comma-decimal (European) | `781,68` → 781.68 | ~25% |
| Trailing space | `1234.56 ` → 1234.56 | ~12% |
| Unit suffix | `1234.56 GBP`, `350km` → needs stripping | ~12% |
| Null | `null` → NaN | ~10% |
-->

### 1.4 [Field Type, e.g., Date Formats]

| Format | Example | Frequency |
|--------|---------|-----------|
| [format] | `[example]` | [~N%] |

<!-- EXAMPLE:
| ISO 8601 | `2025-01-15T14:30:00.000Z` | ~25% |
| DD/MM/YYYY | `15/01/2025` | ~15% |
| MM-DD-YYYY (US) | `01-15-2025` | ~10% |
| DD.MM.YYYY | `15.01.2025` | ~10% |
| Malformed | `15//01/2025`, `15/01/2025 ` | ~10% |
-->

---

## 2. Normalization Rules by Pipeline Stage

<!-- EXPLANATION: For each stage in your pipeline, document WHAT gets normalized, HOW, and what remains dirty. This prevents the AI agent from assuming "data is clean after stage X" when it isn't. -->

### Stage 1: [Stage Name, e.g., ETL Mapping]

**What it does:** [Brief description]

**Normalizes:**
- [What gets cleaned at this stage]

**Does NOT normalize:**
- [What remains dirty after this stage]

| Input | Output | Rule |
|-------|--------|------|
| `[dirty value]` | `[clean value]` | [transformation rule] |

<!-- EXAMPLE:
### Stage 1: ETL Mapping
**What it does:** Transforms raw column names to canonical schema names.
**Normalizes:** Column names (e.g., `"Quoted Amount"` → `"quoted_price"`)
**Does NOT normalize:** Values (numbers, dates, statuses remain dirty)

| Raw column | Canonical field |
|-----------|----------------|
| `Quote Ref` | `quote_id` |
| `Load Reference` | `load_id` |
| `Quoted Amount` | `quoted_price` |
| `Collection City` | `collection_city` |
-->

<!-- EXAMPLE:
### Stage 2: Enum Mapping
**What it does:** Normalizes enum fields (status, vehicle_type) using fuzzy matching.
**Normalizes:** Status values, vehicle types
**Does NOT normalize:** Numbers, dates, names, locations

**Resolution order:**
1. Exact match from profile mappings
2. Case-normalized match (trim + lowercase)
3. Fuzzy match: Levenshtein distance with threshold = max(2, floor(length × 0.3))
-->

---

## 3. Field Alias Mappings

<!-- EXPLANATION: When the same concept has different names at different pipeline stages, document every alias. The AI agent's query engine needs these for robust field resolution. -->

### 3.1 [Component Name] Aliases

| Canonical field | Aliases (tried in order) |
|----------------|------------------------|
| `field_name` | `Alias 1`, `Alias 2`, `alias_3` |

<!-- EXAMPLE:
| `quoted_price` | `Quoted Amount`, `Quoted price`, `price` |
| `collection_city` | `Collection City`, `collection city` |
| `driver_name` | `Driver Name`, `driver name`, `name` |
| `vehicle_type` | `Type`, `Vehicle Type`, `vehicle type` |
-->

### 3.2 [Value-Level Aliases, e.g., Location Aliases]

| Canonical value | Known dirty variants |
|----------------|---------------------|
| `[value]` | `[variant 1]`, `[variant 2]` |

---

## 4. Number Format Handling

<!-- EXPLANATION: Define the parsing rules for numbers. This prevents "NaN propagation" bugs. -->

**Parsing function specification:**

```
Input              → Output          → Rule
typeof number      → pass through    → No conversion needed
null / undefined   → NaN             → Explicit null handling
"781,68"           → 781.68          → Comma-decimal: /^\d[\d\s]*,\d+$/
"1,234.56"         → 1234.56         → Comma-thousands: /^\d{1,3}(,\d{3})+(\.\d+)?$/
"1234.56"          → 1234.56         → Standard
"1234.56 "         → 1234.56         → Trim whitespace
"350km"            → NaN (or 350)    → Unit suffix — strip or reject
```

**Rounding rules:** [e.g., "Aggregated sums rounded to 2 decimal places"]

---

## 5. Date Format Handling

<!-- EXPLANATION: Define how dates are compared and grouped. -->

**Canonical format after ETL:** [e.g., `YYYY-MM-DD` or ISO 8601]

**Comparison method:** [e.g., "Lexicographic comparison after slicing to 10 characters"]

**Grouping truncation:**

| Granularity | Output format | Example |
|-------------|--------------|---------|
| Day | `YYYY-MM-DD` | `2025-01-15` |
| Week | `YYYY-Wnn` | `2025-W03` |
| Month | `YYYY-MM` | `2025-01` |
| Year | `YYYY` | `2025` |

---

## 6. Indexing & Retrieval Data Quality (RAG)

<!-- EXPLANATION: If your feature uses RAG, the quality of your vector index directly determines the quality of LLM responses. Garbage in the index = garbage context retrieved = garbage answers. This section defines quality rules for the indexing and retrieval pipeline. -->

> **Applies when:** Your feature indexes documents, rows, or any content into a vector store for retrieval. Skip if your feature has no RAG component.
>
> **When to use:** Before building the indexing pipeline. The AI agent needs to know what clean, well-structured indexed content looks like — and what to reject or flag.

### 6.1 Indexing Quality Rules

<!-- EXPLANATION: What makes a "good" chunk vs a "bad" chunk? Define quality criteria for indexed content. -->

| Rule | Description | Action on violation |
|------|-------------|--------------------|
| [rule name] | [what it checks] | [reject / flag / normalize] |

<!-- EXAMPLE:
| Minimum chunk length | Chunks must be >= 50 tokens | Reject: too short to contain useful context |
| Maximum chunk length | Chunks must be <= 1000 tokens | Split: re-chunk with overlap to stay within budget |
| No empty metadata | tenant_id and category must be non-null | Reject: can't enforce data isolation without tenant_id |
| No duplicate chunks | Same content from same source shouldn't appear twice | Deduplicate by content hash |
| Encoding consistency | All text must be UTF-8 | Normalize: convert encoding before indexing |
| Freshness marker | Every chunk must have a last_updated timestamp | Flag: index but mark as "unknown freshness" |
-->

### 6.2 Embedding Drift & Staleness

<!-- EXPLANATION: Embeddings can become misaligned when the model changes, or when indexed content becomes outdated. Define how to detect and handle these issues. -->

| Concern | Detection method | Remediation |
|---------|-----------------|-------------|
| [concern] | [how you detect it] | [what you do about it] |

<!-- EXAMPLE:
| Embedding model change | Version mismatch between index metadata and current model | Re-index all chunks with new model. Never mix embeddings from different models. |
| Stale content | Document updated but index chunk still has old version | Re-index on document update. Compare chunk hash with source hash. |
| Low retrieval quality | Periodic evaluation: run 20 test queries, check if correct chunks are in top-5 | If precision drops below 80%, investigate chunking strategy or embedding model. |
| Orphaned chunks | Source document deleted but chunks remain in index | Nightly cleanup: remove chunks whose source_url returns 404. |
-->

### 6.3 Retrieval Quality Metrics

<!-- EXPLANATION: Define how you measure whether retrieval is working. Without metrics, retrieval quality degrades silently. -->

| Metric | Definition | Target | Measurement method |
|--------|-----------|--------|-------------------|
| [metric] | [what it measures] | [threshold] | [how to measure] |

<!-- EXAMPLE:
| Precision@5 | Of the top 5 retrieved chunks, how many are relevant? | >= 80% | Manual evaluation on 50 test queries |
| Recall@5 | Of all relevant chunks, how many appear in top 5? | >= 70% | Compare against manually tagged "gold standard" results |
| Latency P95 | 95th percentile retrieval time | < 500ms | Instrumentation on retrieval endpoint |
| Empty retrieval rate | % of queries where zero chunks exceed threshold | < 15% | Log analysis on retrieval endpoint |
| Cross-tenant leak rate | % of queries where a chunk from another tenant is retrieved | 0% (zero tolerance) | Automated audit: run queries with known tenant, check all retrieved chunk tenant_ids |
-->
