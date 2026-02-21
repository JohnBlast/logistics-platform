# Product Requirements Document — Template

> **What this is:** A PRD template enhanced with sections for LLM-mediated features, data pipelines, and AI agent handoff. Standard PRD sections are preserved; new sections are marked with **(LLM)**, **(Data)**, or **(Pipeline)** to indicate when they apply.
>
> **When to use:** Every feature. Start here. Fill in the standard sections always; add the marked sections when your feature involves LLMs, data transformation, or multi-component pipelines.
>
> **How to use with Spec-Kit:** This document feeds into `/speckit.specify`. The AI agent reads this to understand what to build. The more specific you are — especially in the LLM and data sections — the fewer debugging iterations you'll need.

---

## Instructions

- Replace all `[bracketed text]` with your content
- Remove sections marked **(LLM)** if your feature doesn't involve an LLM
- Remove sections marked **(Data)** if your feature doesn't have a data pipeline
- Remove sections marked **(Pipeline)** if your feature is a single component
- Keep the `<!-- EXPLANATION -->` comments while drafting; remove them before handoff

---

# [Feature Name] — Product Requirements Document

## 1. Overview

### Product Context

<!-- EXPLANATION: 1-2 paragraphs. What is this product/feature? What system does it live in? -->

[Describe the product and where this feature fits.]

### Problem Statement

<!-- EXPLANATION: What pain does this solve? Be specific about the user's current experience. -->

[Describe the problem from the user's perspective.]

### Primary Goal (MVP)

<!-- EXPLANATION: Bullet list of what the user can do when this ships. Each bullet = a testable capability. -->

Enable [user type] to:
- [Capability 1]
- [Capability 2]
- [Capability 3]

### Core Capability

<!-- EXPLANATION: If the feature has a novel technical pattern (like LLM-to-table, NL-to-SQL, etc.), name it here and explain the architecture in 2-3 sentences. This helps the AI agent understand the design intent. -->

[Describe the core technical pattern, e.g.: "The product uses an LLM-to-Table Expression pattern: the LLM translates natural language questions into a structured JSON instruction. A client-side query engine then executes this instruction against the dataset."]

### Out of Scope (MVP)

- [Thing 1]
- [Thing 2]

---

## 2. Target Users

### [User Type Name]

<!-- EXPLANATION: One section per user type. Include what they CAN and CANNOT do. The AI agent uses this for access control logic. -->

**Capabilities:**
- [What this user can do]

**Restrictions:**
- [What this user cannot do]

---

## 3. User Journeys

<!-- EXPLANATION: Each journey = a complete workflow from start to finish. Number them. Include the exact flow with numbered steps. The AI agent converts these into UI flows and API endpoints. -->

### Journey 1: [Name]

**Intent:** [What the user is trying to accomplish]

**Flow:**
1. [Step 1]
2. [Step 2]
3. System: [What the system does]
4. [Step N]

**Outcome:** [What the user sees/achieves]

<!-- EXAMPLE from Logistics Discovery:
### Journey 1: Create a New Conversation and Retrieve Insights
**Intent:** User wants to understand operational data using plain English.
**Flow:**
1. User creates a new conversation
2. System displays empty chat prompt
3. User submits a natural language query
4. System generates conversation title, displays loading state
5. System processes query within ingested tenant dataset
6. System generates written response + structured table (if requested)
7. Output tab and Validate tab become available
**Outcome:** User sees summary and structured tabular data derived from their own dataset.
-->

---

## 4. Functional Requirements

<!-- EXPLANATION: Group by category. Each requirement should be testable. Use "System shall..." language. The AI agent uses these as acceptance criteria. -->

### [Category 1, e.g., Data Scope]
- System shall [requirement]
- System shall [requirement]

### [Category 2, e.g., Interaction Model]
- System shall [requirement]

---

## 5. Data & Domain Concepts

<!-- EXPLANATION: Define every entity the system works with. Include field names — the AI agent needs these exact names for implementation. -->

### [Entity Name, e.g., Quote]

[Description of entity and its role.]

**Fields:** `field_1`, `field_2`, `field_3`, ...

<!-- EXAMPLE:
### Quote
Represents a pricing record within the marketplace.
**Fields:** `quote_id`, `load_id`, `quoted_price`, `status`, `date_created`, `associated_fleet_id`, `fleet_quoter_name`, `requested_vehicle_type`, `created_at`, `updated_at`.
-->

---

## 6. Key Relationships

<!-- EXPLANATION: How entities relate to each other. Include access control implications. The AI agent uses this for join logic and permission filtering. -->

- [Entity A] has many [Entity B]
- [Entity B] belongs to [Entity C] via [field_name]
- [Access rule: Entity A can only see Entity B where condition X]

---

## 7. Success Criteria

<!-- EXPLANATION: What must be true for this feature to be "done". Include data isolation, output integrity, and interaction rules. These become the AI agent's acceptance tests. -->

### [Criterion Category]
- [Testable criterion]

---

## 8. Edge Cases & Constraints

<!-- EXPLANATION: Things that could go wrong. Include data edge cases, state edge cases, and access edge cases. Each one should describe what happens and what the system should do. -->

- [Edge case]: [Expected behavior]
- [Constraint]: [How system enforces it]

---

## 9. Supported Capabilities (MVP)

<!-- EXPLANATION: If your feature has a query engine, filter system, or other structured capability, list every supported operation. This prevents the AI agent from over-engineering or under-implementing. -->

### [Capability Type, e.g., Aggregations]

| Operation | Description | Example |
|-----------|-------------|---------|
| [op_name] | [what it does] | [concrete example] |

---

## 10. API Contract

<!-- EXPLANATION: Define request/response shapes. Include example JSON. The AI agent implements this exactly. -->

**Request:**
```json
{
  "field": "value"
}
```

**Response:**
```json
{
  "field": "value"
}
```

---

## 11. Interpretation Contract (LLM)

<!-- EXPLANATION: THIS IS THE MOST IMPORTANT SECTION FOR LLM FEATURES. It defines how user intent maps to structured output. Without this, the AI agent will guess — and guess wrong. -->

> **Applies when:** Your feature uses an LLM to interpret natural language into structured actions.
>
> **Why it matters:** In our Logistics Discovery project, the absence of this section caused 8+ debugging iterations. The PRD defined the schema (what a TableInstruction looks like) but never defined the mapping (how "top 5 profitable routes" becomes a specific JSON).

### 11.1 Semantic Taxonomy

<!-- EXPLANATION: Categorize all types of user intent your feature should handle. Each category = a different code path. -->

| Category | Description | Example phrasings |
|----------|-------------|-------------------|
| [intent_type] | [what the user wants] | "[phrase 1]", "[phrase 2]" |

<!-- EXAMPLE:
| Route profitability | Group by origin + destination, aggregate revenue | "top 5 profitable routes", "which routes make the most money" |
| Driver activity | Group by driver, count jobs | "most active drivers", "which drivers have the most loads" |
| Vehicle filter | Filter by vehicle type | "show all loads with small vans", "loads using a luton" |
-->

### 11.2 Phrase-to-Output Mapping

<!-- EXPLANATION: For each intent category, show the EXACT structured output the LLM should produce. Use real field names. This is the contract. -->

| Phrase pattern | Structured output |
|----------------|-------------------|
| "[pattern]" | `{exact JSON}` |

<!-- EXAMPLE:
| "top N profitable routes" | `{dataSource: "loads_and_quotes", groupBy: ["collection_city","delivery_city"], aggregations: [{field:"quoted_price",op:"sum",alias:"total_revenue"}], sort: [{field:"total_revenue",dir:"desc"}], limit: N}` |
-->

### 11.3 Field Resolution Rules

<!-- EXPLANATION: Map user-facing concepts to actual field names. The LLM needs this to avoid hallucinating field names. -->

| User says | Field name | Aliases |
|-----------|-----------|---------|
| [concept] | `field_name` | `Alias 1`, `Alias 2` |

### 11.4 Prohibited Outputs

<!-- EXPLANATION: Things the LLM must NOT do. These are the mistakes it will make if you don't explicitly forbid them. -->

| Rule | Reason |
|------|--------|
| Do NOT [action] | [Why it breaks things] |

<!-- EXAMPLE:
| Do NOT add `quote_status = accepted` filter when using `loads_and_quotes` dataSource | The view already pre-filters for accepted quotes |
| Do NOT use a field called `route` | No such field exists; routes = groupBy on location fields |
-->

### 11.5 Acceptance Scenarios

<!-- EXPLANATION: Given/When/Then with EXACT expected output. The AI agent uses these as test cases. -->

| ID | Given | When | Then |
|----|-------|------|------|
| NL-01 | [preconditions] | User asks "[query]" | LLM produces `{exact JSON}`. Result: [expected shape]. |

---

## 12. Data Flow Contract (Pipeline)

<!-- EXPLANATION: For features with data pipelines, define the exact data shape at each boundary. Without this, the AI agent discovers boundaries through debugging. -->

> **Applies when:** Your feature transforms data through multiple stages (ETL, joins, views, query engines).

### 12.1 Pipeline Stages

```
[Stage 1] → [Stage 2] → [Stage 3] → [Stage N]
```

### 12.2 Data Shape at Each Boundary

| Boundary | Column names | Value formats | Key transformation |
|----------|-------------|--------------|-------------------|
| After [Stage 1] | [list of columns] | [format notes] | [what changed] |

---

## 13. Data Quality Rules (Data)

<!-- EXPLANATION: What dirty data looks like and how each layer handles it. Prevents the "Number('781,68') === NaN" class of bugs. -->

> **Applies when:** Your feature processes data that may have inconsistent formats, typos, or missing values.

### 13.1 Input Variations

| Field type | Variations system must handle | Resolution strategy |
|-----------|------------------------------|-------------------|
| [type] | [examples of dirty values] | [how system normalizes] |

<!-- EXAMPLE:
| Status enums | "Acepted", "ACCEPTED", "accepted ", "acceptd" | Fuzzy matching: Levenshtein distance <= 30% of string length |
| Numbers | "781,68" (comma-decimal), "1234.56 GBP" (unit suffix) | parseNum(): detect format, normalize to float |
| Cities | "Birmigham", "london", "Leeds " | Location alias lookup table |
-->

---

## 14. System Prompt Contract (LLM)

<!-- EXPLANATION: The system prompt IS the implementation contract for LLM features. Define its structure here; maintain the full spec in a separate prompt-spec.md. -->

> **Applies when:** Your feature uses an LLM with a system prompt.

### 14.1 Prompt Structure

| Section | Static/Dynamic | Purpose |
|---------|---------------|---------|
| [section] | [static/dynamic] | [what it does] |

### 14.2 Dynamic Injection Points

| Point | Source | When |
|-------|--------|------|
| [variable] | [where the data comes from] | [condition for injection] |

---

## 15. Retrieval-Augmented Generation Contract (RAG)

<!-- EXPLANATION: If your LLM feature retrieves context from a knowledge base before generating a response, you need to specify the retrieval pipeline. RAG adds three new boundaries: what goes INTO the index, what comes OUT during retrieval, and how retrieved context gets INJECTED into the prompt. Each undocumented boundary is a place where the system silently degrades. -->

> **Applies when:** Your feature uses a vector database, document store, or any retrieval system to provide context to the LLM before generation. Common patterns: chatbots over company docs, Q&A over knowledge bases, support assistants.
>
> **Why it matters:** RAG failures are invisible — the LLM confidently generates answers from irrelevant context, and the user can't tell the difference. Unlike a query engine that returns empty results (visible failure), RAG failures produce plausible-looking wrong answers (silent failure).

### 15.1 Indexing Contract

<!-- EXPLANATION: Define what goes into the vector index. This is the "supply side" — if the right data isn't indexed, it can never be retrieved. -->

**Data sources:**

| Source | Content type | Update frequency | Example |
|--------|-------------|-----------------|---------|
| [source name] | [docs/rows/pages] | [real-time/daily/on-demand] | [what a typical item looks like] |

<!-- EXAMPLE:
| Company knowledge base | Markdown articles | On publish/update | "How to file an insurance claim — Step 1: Gather documents..." |
| Product catalog | JSON product records | Nightly sync | { "sku": "X100", "name": "Widget", "description": "...", "price": 29.99 } |
| Support tickets (resolved) | Ticket text + resolution | Daily batch | "Issue: Can't reset password. Resolution: Use SSO link at..." |
-->

**Chunking strategy:**

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Chunk size | [e.g., 500 tokens] | [Why this size — too small loses context, too large adds noise] |
| Chunk overlap | [e.g., 50 tokens] | [Prevents splitting key info across chunk boundaries] |
| Chunking method | [e.g., by paragraph / by section / by semantic boundary] | [Why this method] |

<!-- EXAMPLE:
| Chunk size | 500 tokens | Balances context completeness with retrieval precision for our article length (~2000 tokens avg) |
| Chunk overlap | 50 tokens | Ensures sentences at boundaries aren't lost |
| Chunking method | By markdown heading (##) | Articles have clear section structure; each section is a self-contained topic |
-->

**Metadata attached to each chunk:**

| Metadata field | Source | Purpose |
|---------------|--------|---------|
| [field] | [where it comes from] | [how it's used in retrieval] |

<!-- EXAMPLE:
| tenant_id | Document ownership | Mandatory filter: users only retrieve their tenant's docs |
| category | Document tag | Optional filter: scope retrieval to "billing", "technical", etc. |
| last_updated | Document timestamp | Freshness ranking: prefer recent content |
| source_url | Original document URL | Citation: show user where the answer came from |
-->

### 15.2 Retrieval Contract

<!-- EXPLANATION: Define what comes out of the retrieval step. This controls the quality of context the LLM sees. -->

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Top-k results | [e.g., 5] | [Why this number] |
| Similarity threshold | [e.g., 0.75] | [Below this, chunks are considered irrelevant] |
| Mandatory filters | [e.g., tenant_id = current user's tenant] | [Data isolation — non-negotiable] |
| Optional filters | [e.g., category, date range] | [User-controlled scoping] |
| Re-ranking | [Yes/No — method if yes] | [Whether retrieved chunks are re-scored] |

<!-- EXAMPLE:
| Top-k results | 5 | Testing showed 3 missed key context; 10 added too much noise and exceeded token budget |
| Similarity threshold | 0.72 | Below this, chunks are topically unrelated; determined by evaluating 50 test queries |
| Mandatory filters | tenant_id = user.tenant_id | Multi-tenant data isolation. Never retrieve another tenant's documents. |
| Optional filters | category (if user specifies) | "Ask about billing" scopes retrieval to billing docs only |
| Re-ranking | Yes — cross-encoder rerank | Embedding similarity is coarse; reranking improves precision by 15% in our tests |
-->

**Fallback behavior (when retrieval returns nothing above threshold):**

| Scenario | Expected behavior |
|----------|------------------|
| Zero chunks above threshold | [e.g., LLM responds: "I don't have information about that in your documents."] |
| Chunks retrieved but low confidence | [e.g., LLM responds with answer but adds: "Note: I'm not fully confident in this answer."] |
| Index is empty / unavailable | [e.g., Show error: "Knowledge base is being updated. Please try again shortly."] |

### 15.3 Context Injection

<!-- EXPLANATION: Define how retrieved chunks are inserted into the LLM prompt. This is a dynamic injection point — same concept as dataColumns in Discovery, but for retrieved text. -->

| Parameter | Value |
|-----------|-------|
| Injection location | [e.g., After system prompt, before user query] |
| Format | [e.g., Numbered list with source metadata] |
| Token budget | [e.g., Max 2000 tokens for retrieved context] |
| Citation format | [e.g., Each chunk prefixed with [Source: {title}, Updated: {date}]] |

<!-- EXAMPLE:
**Injection template:**
```
The following context was retrieved from the user's knowledge base. Use ONLY this context to answer the question. If the context doesn't contain enough information, say so.

[1] Source: "How to file a claim" (Updated: 2025-12-01)
Filing a claim requires three documents: proof of loss, photos of damage, and...

[2] Source: "Claim processing times" (Updated: 2025-11-15)
Standard claims are processed within 5-7 business days. Complex claims may take...

User question: {user_query}
```
-->

### 15.4 Answer Quality Rules

<!-- EXPLANATION: Rules for how the LLM should use (and not use) retrieved context. These prevent hallucination and ensure traceability. -->

| ID | Rule | Reason |
|----|------|--------|
| RAG-R-1 | [rule] | [why] |

<!-- EXAMPLE:
| RAG-R-1 | Only answer using information from retrieved context | Prevents hallucination from LLM's training data |
| RAG-R-2 | Cite source document for every factual claim | User must be able to verify answers |
| RAG-R-3 | If context is insufficient, say "I don't have enough information" | Prefer honesty over plausible-sounding wrong answers |
| RAG-R-4 | Never combine information from different tenants' documents | Data isolation — even if chunks are accidentally co-retrieved |
| RAG-R-5 | Flag when retrieved context is older than [N days] | Stale answers can be misleading |
-->

---

## 16. End-to-End Scenarios (Pipeline)

<!-- EXPLANATION: Full pipeline scenarios with concrete data. Each scenario: input → expected intermediate states → expected output. Referenced in detail in e2e-scenarios.md. -->

> **Applies when:** Your feature has multiple components in a chain.

| ID | Scenario | Input | Expected Output |
|----|----------|-------|-----------------|
| E2E-01 | [name] | [input description] | [output shape + constraints] |

---

## 17. Assumptions

- [Assumption 1]
- [Assumption 2]
