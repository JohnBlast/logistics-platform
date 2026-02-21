# Natural Language Interpretation Contract — Template

> **What this is:** A specification that defines how natural language input maps to structured output — the "interpretation contract" for any feature where an LLM (or rule-based system) converts user text into system actions.
>
> **When to use:** Any feature where a user types natural language and the system must produce a structured result (filters, queries, commands, classifications, etc.).
>
> **Why it matters:** This was the single biggest gap in our Logistics Discovery project. The PRD defined *what* a TableInstruction looks like but never defined *how* user intent maps to one. Without this document, the AI agent guesses at the mapping — and gets it wrong.
>
> **Real-world impact:** Adding this document for the ETL Configurator's filter feature resulted in 9 precise acceptance scenarios and zero ambiguity during implementation. Skipping it for Discovery's query feature resulted in 8+ debugging iterations.
>
> **Spec-Kit phase:** Create during `/speckit.specify` or `/speckit.clarify`, before `/speckit.plan`.

---

## Instructions

- Replace all `[bracketed text]` with your content
- Each section has an explanation and a real example from the Logistics Platform
- The acceptance scenarios are the most important part — make them concrete with exact JSON
- Remove `<!-- EXPLANATION -->` comments before handoff

---

# Natural Language Interpretation Requirements — [Feature Name]

## 1. General Interpretation Pattern

<!-- EXPLANATION: Define the contract shape — what goes in, what comes out, what happens on failure. This is the "contract signature" that the AI agent implements against. -->

| Aspect | Contract |
|--------|----------|
| **Input** | [What the user provides — e.g., "User-entered free text (plain English)"] |
| **Mediator** | [What interprets it — e.g., "Claude API with system prompt" or "Rule-based parser"] |
| **Output** | [What the system produces — e.g., "TableInstruction JSON" or "FilterRule object"] |
| **Fallback** | [What happens when the mediator is unavailable — e.g., "Rule-based fallback" or "Error message"] |
| **Failure** | [What happens on unparseable input — e.g., "Show error; user must rephrase"] |
| **Scope** | [What this covers — e.g., "Analytics queries over pipeline flat table"] |

<!-- EXAMPLE (Logistics Discovery):
| **Input** | User-entered free text (plain English) |
| **Mediator** | Claude API with system prompt + data column context |
| **Output** | TableInstruction JSON that the client query engine executes |
| **Fallback** | Text-only response when no table is applicable |
| **Failure** | Show error message; user must rephrase. Never show raw LLM output as a table. |
| **Scope** | Analytics queries over loads, quotes, and combined views |
-->

<!-- EXAMPLE (ETL Filter Feature):
| **Input** | User-entered free text (plain English) |
| **Output** | Structured filter rule: { field, op, value?, type: 'inclusion' | 'exclusion' } |
| **Fallback** | Rule-based interpretation when AI unavailable |
| **Failure** | Show error; do not apply filter. User must rephrase. |
| **Scope** | Row filtering only; not joins or mapping |
-->

---

## 2. Semantic Taxonomy — Intent Categories

<!-- EXPLANATION: Categorize every type of thing the user might ask for. Each category will map to a different output structure. This is the AI agent's "routing table" — it determines which code path to take. -->
<!-- TIP: Start by listing 20+ example user prompts, then group them into categories. -->

| Category | Description | Example phrasings |
|----------|-------------|-------------------|
| [category_name] | [what the user wants] | "[phrase 1]", "[phrase 2]", "[phrase 3]" |

<!-- EXAMPLE (Logistics Discovery):
| Route profitability | Group by origin + destination, aggregate revenue | "top 5 profitable routes", "which routes make the most money", "best routes by revenue" |
| Driver activity | Group by driver, count jobs | "most active drivers", "which drivers have the most loads", "busiest drivers" |
| Vehicle filter | Filter by vehicle type | "show all loads with small vans", "loads using a luton", "only articulated" |
| City filter | Filter by collection or delivery city | "jobs from London", "loads going to Manchester", "deliveries in Birmingham" |
| Date filter | Filter by date range or threshold | "jobs starting from 2025-01-15", "loads in January", "this month's jobs" |
| Bidirectional route count | Count jobs between two cities (both directions) | "how many jobs between London and Birmingham" |
-->

<!-- EXAMPLE (ETL Filter Feature):
| Location exclusion | Exclude rows where place appears in location fields | "remove London loads", "exclude Manchester" |
| Location inclusion | Include only rows with place in collection/delivery | "only London loads", "keep Manchester" |
| Status exclusion | Exclude by status | "exclude cancelled loads", "remove rejected" |
| Numeric comparison | Compare numeric field | "capacity over 1000", "price between 100 and 500" |
| Field presence | Include/exclude by field existence | "include loads that have email", "remove loads without capacity" |
-->

---

## 3. Interpretation Contract — Phrase-to-Output Mapping

<!-- EXPLANATION: This is the core of the document. For each intent category, define the EXACT structured output. Use real field names, real operators, real JSON. The AI agent implements this mapping directly. -->

### 3.1 Field Resolution Rules

<!-- EXPLANATION: Users say "revenue" but the field is called "quoted_price". Users say "route" but there is no route field. Map concepts to actual fields. -->

| User concept | Canonical field | Aliases (fallbacks) |
|-------------|----------------|---------------------|
| [concept] | `field_name` | `Alias 1`, `Alias 2` |

### 3.2 Mapping Table

<!-- EXPLANATION: Each row = one phrase pattern → one structured output. Be as concrete as possible. JSON should be copy-pasteable. -->

| Phrase pattern | Structured output |
|----------------|-------------------|
| "[pattern with variables]" | `{ exact JSON with field names, operators, values }` |

<!-- EXAMPLE (Logistics Discovery):
| "top N profitable routes" | `{dataSource: "loads_and_quotes", groupBy: ["collection_city","delivery_city"], aggregations: [{field:"quoted_price", op:"sum", alias:"total_revenue"}], sort: [{field:"total_revenue", dir:"desc"}], limit: N}` |
| "how many jobs between X and Y" | `{dataSource: "loads_and_quotes", orFilters: [[{field:"collection_city",operator:"eq",value:"X"},{field:"delivery_city",operator:"eq",value:"Y"}],[reverse]], aggregations: [{op:"count", alias:"job_count"}]}` |
| "loads with small van" | `{dataSource: "loads_and_quotes", filters: [{field:"vehicle_type", operator:"eq", value:"small_van"}]}` |
-->

<!-- EXAMPLE (ETL Filters):
| "remove [place] loads" | 4 rules: each location field `contains` place, type exclusion |
| "exclude [status] loads" | 1 rule: status `=` value, type exclusion |
| "between [lo] and [hi] on [field]" | 2 rules: field `>=` lo, field `<=` hi, type inclusion |
-->

### 3.3 Enum Mappings

<!-- EXPLANATION: When users say a value in natural language, what's the exact system value? Prevents "small van" vs "small_van" bugs. -->

| User says | System value |
|-----------|-------------|
| "[natural phrase]" | `exact_enum_value` |

---

## 4. Prohibited Outputs

<!-- EXPLANATION: Things the LLM/system must NOT do. These are the mistakes that will happen if you don't explicitly prevent them. List every "gotcha" you can think of. -->

| ID | Prohibition | Reason |
|----|-------------|--------|
| P-1 | Do NOT [action] | [Why it breaks things] |

<!-- EXAMPLE:
| P-1 | Do NOT add `quote_status = accepted` when dataSource is `loads_and_quotes` | The view already pre-filters accepted quotes; adding the filter again causes double-filtering or empty results |
| P-2 | Do NOT use a field called `route` | No such field exists; routes are expressed via groupBy on collection + delivery fields |
| P-3 | Do NOT invent field names not in the data | Use only fields from the actual data column list |
-->

---

## 5. Acceptance Scenarios (Given/When/Then)

<!-- EXPLANATION: These are the MOST IMPORTANT part of this document. Each scenario is a concrete test case. Include the EXACT input, the EXACT expected structured output, and the EXACT expected result. The AI agent will implement these as actual tests. -->

### 5.1 [Category Name]

| ID | Given | When | Then |
|----|-------|------|------|
| NL-[XX]-01 | [Preconditions — what data exists] | User asks "[exact query text]" | System produces `{exact JSON}`. Result has [expected columns] with [expected constraints]. |

<!-- EXAMPLE (Logistics Discovery):
### 5.1 Route Profitability
| NL-D-01 | Flat table with accepted quotes having `quoted_price`, `collection_city`, `delivery_city` | User asks "What's my top 5 profitable routes?" | LLM produces `{dataSource:"loads_and_quotes", groupBy:["collection_city","delivery_city"], aggregations:[{field:"quoted_price",op:"sum",alias:"total_revenue"}], sort:[{field:"total_revenue",dir:"desc"}], limit:5}`. Result: >= 1 row with columns `collection_city`, `delivery_city`, `total_revenue`. |

### 5.2 Bidirectional Route Count
| NL-D-04 | Flat table with London→Birmingham and Birmingham→London routes | User asks "How many jobs between London and Birmingham?" | LLM uses orFilters with both direction permutations. Result: single row with `job_count >= 1`. |
-->

<!-- EXAMPLE (ETL Filters):
### 5.1 Location Exclusion
| NL-F-01 | Flat table with London in collection_city | User enters "remove London loads" | System produces 4 exclusion rules (one per location field, contains London). Rows with London in ANY location field are excluded. |
-->

---

## 6. Retrieval-Aware Interpretation (RAG)

<!-- EXPLANATION: If your feature uses RAG, the interpretation layer must account for the retrieval step. The LLM's behavior changes depending on what context was retrieved — the same user query can produce different outputs depending on what the vector search returns. This section defines how retrieval interacts with interpretation. -->

> **Applies when:** Your NL feature retrieves context from a knowledge base before the LLM generates its structured output. Skip this section if the LLM works only from its system prompt and the user's data.
>
> **When to use:** A customer support bot that retrieves relevant help articles before answering. A document Q&A system that searches a knowledge base. An analytics assistant that retrieves schema documentation before generating queries.

### 6.1 Retrieval-to-Intent Mapping

<!-- EXPLANATION: Sometimes the retrieved context changes which intent category applies. Define how retrieval results influence interpretation. -->

| Retrieved context type | Effect on interpretation |
|-----------------------|------------------------|
| [type of context retrieved] | [how it changes the LLM's output] |

<!-- EXAMPLE (Support bot):
| FAQ article about billing | LLM generates a direct answer citing the FAQ, not a ticket creation action |
| No relevant articles found | LLM generates a ticket creation action with the user's query as description |
| Multiple conflicting articles | LLM generates an answer from the most recent article + disclaimer |
-->

<!-- EXAMPLE (Analytics assistant with RAG over schema docs):
| Schema doc matching user's field names | LLM uses exact field names from retrieved schema |
| No schema doc retrieved | LLM falls back to field names from dataColumns injection |
| Schema doc for a different table | LLM responds text-only: "That field belongs to a different dataset" |
-->

### 6.2 Retrieval Quality Acceptance Scenarios

<!-- EXPLANATION: Test that the right chunks are retrieved for representative queries. These are "retrieval unit tests" — they verify the indexing and search quality before the LLM even sees the context. -->

| ID | User query | Expected retrieved chunks | Rationale |
|----|-----------|--------------------------|-----------|
| RAG-R-01 | "[query]" | [chunk ID/title that should be in top-k] | [why this chunk is the right one] |

<!-- EXAMPLE:
| RAG-R-01 | "How do I reset my password?" | "Account Security" article, section "Password Reset" | Direct keyword + semantic match |
| RAG-R-02 | "I can't log in" | "Account Security" article + "Troubleshooting Login" article | Semantic match even though "password" isn't mentioned |
| RAG-R-03 | "What's the weather?" | Nothing above threshold | Out of scope; no relevant docs exist |
-->

### 6.3 Prohibited Retrieval Patterns

<!-- EXPLANATION: Things that must never happen in the retrieval step. These are your data isolation and quality guardrails. -->

| ID | Prohibition | Reason |
|----|-------------|--------|
| RAG-P-1 | [thing that must not happen] | [why it's dangerous] |

<!-- EXAMPLE:
| RAG-P-1 | Never retrieve chunks from a different tenant's documents | Data isolation violation — even if embedding similarity is high |
| RAG-P-2 | Never use retrieved context older than 90 days for compliance topics | Regulatory information changes; stale answers create legal risk |
| RAG-P-3 | Never mix retrieved context with LLM's training knowledge for factual claims | Prevents hallucination that "sounds right" because it blends real and imagined info |
-->

---

## 7. Edge Cases

<!-- EXPLANATION: Things that could go wrong. Each edge case should have an expected behavior — don't leave it ambiguous. -->

| ID | Edge case | Expected behaviour |
|----|-----------|--------------------|
| EC-01 | [Situation] | [What the system does] |

<!-- EXAMPLE:
| EC-01 | User asks about a field that doesn't exist ("profit margin") | Text-only response: "This field is not available in your data." No structured output. |
| EC-02 | Query matches zero rows ("jobs from Tokyo") | Return empty result. UI shows "No rows match your criteria." |
| EC-03 | Numbers have comma-decimal format ("781,68") | parseNum handles conversion: 781,68 → 781.68. Aggregation produces correct sums, not NaN. |
| EC-04 | City name has typo in data ("Birmigham") | Location alias matching resolves "Birmingham" → "Birmigham". |
| EC-05 | Empty input | Reject with error. No action taken. |
| EC-06 | LLM returns malformed JSON | Fall back to text-only response. |
| EC-07 | (RAG) Retrieved context is from wrong tenant | Must never happen — mandatory tenant filter. If it does, discard chunk and log alert. |
| EC-08 | (RAG) Retrieved context is stale (> N days old) | Include answer but add freshness warning: "This information was last updated on [date]." |
| EC-09 | (RAG) Zero chunks retrieved above similarity threshold | LLM responds: "I don't have information about that in your documents." No fabricated answer. |
| EC-10 | (RAG) User query is adversarial / prompt injection attempt | Retrieval returns irrelevant chunks. LLM refuses: "I can only answer questions about your data." |
-->

---

## 8. Traceability to PRD

<!-- EXPLANATION: Link back to PRD sections so requirements are traceable. -->

| PRD reference | This doc |
|---------------|----------|
| §[N] [section name] | §[N] [section in this doc] |
