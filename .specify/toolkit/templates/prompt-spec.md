# System Prompt Specification — Template

> **What this is:** A versioned specification for the LLM system prompt. Treats the prompt as an interface contract — changes to it are reviewed like API changes, because they can break all downstream behavior.
>
> **When to use:** Any feature that uses an LLM with a system prompt. Create this before implementation and update it whenever the prompt changes.
>
> **Why it matters:** In our Logistics Discovery project, the system prompt was iterated on 5+ times during debugging because it was never designed upfront. Claude kept using wrong field names, adding redundant filters, and missing query patterns — all preventable with a prompt spec.
>
> **Key insight:** For an LLM-mediated feature, the system prompt IS the implementation. It determines what the LLM produces, which determines what the user sees. Design it with the same rigor as an API contract.
>
> **Spec-Kit phase:** Create during `/speckit.plan`, before `/speckit.implement`.

---

## Instructions

- Replace all `[bracketed text]` with your content
- The prompt structure section should mirror your actual prompt's organization
- Rules should be concrete and testable, not vague guidelines
- Few-shot examples should cover every intent category from your NL interpretation contract
- Remove `<!-- EXPLANATION -->` comments before handoff

---

# System Prompt Specification — [Feature Name]

## 1. Overview

| Attribute | Value |
|-----------|-------|
| **LLM model** | [e.g., `claude-sonnet-4-20250514`] |
| **Max tokens** | [e.g., 4096] |
| **Endpoint** | [e.g., `POST /api/chat`] |
| **Prompt version** | [e.g., 1.0.0] |
| **Last updated** | [date] |

---

## 2. Prompt Structure

<!-- EXPLANATION: Break your prompt into logical sections. For each section, note whether it's static (same every request) or dynamic (injected per request). This helps the AI agent understand what changes and what doesn't. -->

```
┌──────────────────────────────────┐
│  Section 1: [Name]               │  [Static/Dynamic]
│  Section 2: [Name]               │  [Static/Dynamic]
│  Section 3: [Name]               │  [Static/Dynamic]
│  Section N: [Name]               │  [Static/Dynamic]
└──────────────────────────────────┘
```

### Section 1: [Name] ([Static/Dynamic])

<!-- EXPLANATION: For each section, write the actual prompt text (or a representative summary). If dynamic, describe the template and what gets injected. -->

**Purpose:** [What this section tells the LLM]

**Content:**
```
[Actual prompt text or template]
```

<!-- EXAMPLE:
### Section 1: Role & Task (Static)
**Purpose:** Sets the LLM's persona and output format.
**Content:**
```
You are a logistics analytics assistant. The user queries their fleet data using natural language.
Your task: produce EITHER:
1. A text-only answer (when no table is needed)
2. A summary PLUS a TableInstruction JSON for the client to execute
```

### Section 3: Data Column Context (Dynamic)
**Purpose:** Ensures LLM uses exact column names from actual data.
**Injection condition:** `dataColumns` array is non-empty.
**Template:**
```
CRITICAL - The user's actual data has these EXACT column names:
{dataColumns.join(', ')}
Field mapping guide:
- Revenue/price → "quoted_price"
- Route origin → "collection_city"
...
```
-->

---

## 3. Dynamic Injection Points

<!-- EXPLANATION: List every variable that gets injected into the prompt at request time. For each, document the source, format, and when it's available. -->

| Injection point | Source | Format | When injected | Purpose |
|----------------|--------|--------|---------------|---------|
| `[variable]` | [where it comes from] | [data type/shape] | [condition] | [why it's needed] |

<!-- EXAMPLE:
| `dataColumns` | `Object.keys(flatRows[0])` from frontend | `string[]` joined with commas | When pipeline data exists | Prevents LLM from guessing field names |
| `previousTableInstruction` | Frontend conversation state | JSON object | On follow-up queries | Allows LLM to modify existing instruction |
| `conversationHistory` | Frontend state | Array of {role, content} | Always (may be empty) | Multi-turn context |
-->

---

## 4. Rules (Must-Follow)

<!-- EXPLANATION: Explicit do/don't rules. Each rule prevents a specific failure mode. The AI agent embeds these in the system prompt. Make each rule testable — you should be able to verify whether the LLM followed it. -->

| ID | Rule | Failure it prevents | Testable? |
|----|------|---------------------|-----------|
| R-1 | [Do/Don't statement] | [What goes wrong without this rule] | [How to verify] |

<!-- EXAMPLE:
| R-1 | Use ONLY fields from the dataColumns list | LLM invents field names that don't exist in the data | Check if all fields in output exist in dataColumns |
| R-2 | For routes: groupBy ["collection_city","delivery_city"] | LLM uses non-existent "route" field | Check output has no "route" field reference |
| R-3 | Do NOT filter quote_status on loads_and_quotes | Double-filtering causes empty results | Check filters array has no quote_status entry |
| R-4 | Vehicle types use exact enum: small_van, medium_van, etc. | LLM uses "small van" (with space) causing no matches | Check vehicle values match enum |
| R-5 | Ambiguous queries → text-only response, no tableInstruction | Garbage table instructions from unclear queries | Check output has no tableInstruction for ambiguous input |
-->

---

## 5. Few-Shot Examples

<!-- EXPLANATION: One example per intent category from your NL interpretation contract. Each example shows input → output. The LLM uses these as patterns. More examples = more reliable output. -->

| # | Query pattern | Key output fields |
|---|--------------|-------------------|
| 1 | "[example query]" | `{key fields of expected output}` |

<!-- EXAMPLE:
| 1 | "top N profitable routes" | `groupBy: ["collection_city","delivery_city"], aggregations: [{field:"quoted_price",op:"sum",alias:"total_revenue"}], sort: desc, limit: N` |
| 2 | "how many jobs between X and Y" | `orFilters with both direction permutations, aggregations: [{op:"count",alias:"job_count"}]` |
| 3 | "loads with small van" | `filters: [{field:"vehicle_type",operator:"eq",value:"small_van"}]` |
| 4 | "most active drivers" | `groupBy: ["driver_name"], aggregations: [{op:"count",alias:"job_count"}], sort: desc` |
-->

---

## 6. Response Contract

<!-- EXPLANATION: Define the exact shape of what the API returns. Include both the success case and text-only case. -->

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `[field]` | `[type]` | [Yes/No] | [what it contains] |

---

## 7. Retrieved Context Injection (RAG)

<!-- EXPLANATION: If your feature uses RAG, the retrieved context is another dynamic section of the prompt — often the LARGEST section. It needs the same rigor as any other injection point: defined format, token budget, and rules for how the LLM should use it. -->

> **Applies when:** Your LLM receives retrieved context from a vector store before generating a response. Skip if no RAG component.
>
> **When to use:** Any chatbot-over-documents, Q&A system, or knowledge-enhanced assistant. The way you format and inject retrieved chunks directly affects answer quality.

### 7.1 Injection Template

<!-- EXPLANATION: Define the exact format of how retrieved chunks appear in the prompt. The LLM uses this structure to find and cite relevant information. -->

**Location in prompt:** [e.g., After system prompt rules, before user query]

**Template:**
```
[Preamble instruction for the LLM about how to use retrieved context]

[1] Source: {chunk.source_title} (Updated: {chunk.last_updated})
{chunk.text}

[2] Source: {chunk.source_title} (Updated: {chunk.last_updated})
{chunk.text}

...up to top-k results...

User question: {user_query}
```

<!-- EXAMPLE:
**Location:** After rules section, before user message.
**Template:**
```
CONTEXT: The following excerpts were retrieved from the user's knowledge base. 
Answer ONLY using this context. If the context doesn't contain enough information, say "I don't have information about that in your documents."
Cite sources using [Source N] notation.

[1] Source: "Password Reset Guide" (Updated: 2025-12-01, Category: Security)
To reset your password, navigate to Settings > Security > Change Password. You will receive a verification email...

[2] Source: "Account Lockout Policy" (Updated: 2025-11-28, Category: Security)
After 5 failed login attempts, the account is locked for 30 minutes. Contact support to unlock immediately...

User question: How do I reset my password?
```
-->

### 7.2 Token Budget

<!-- EXPLANATION: Retrieved context competes with everything else in the prompt for the model's context window. Define limits to prevent overflow. -->

| Component | Token budget | Priority |
|-----------|-------------|----------|
| System prompt (static) | [e.g., ~500 tokens] | Fixed — always included |
| Rules & examples | [e.g., ~800 tokens] | Fixed — always included |
| Retrieved context | [e.g., max 2000 tokens] | Variable — truncate if over budget |
| Conversation history | [e.g., last 3 turns, ~1000 tokens] | Variable — drop oldest turns first |
| User query | [e.g., ~200 tokens] | Fixed — always included |
| **Total budget** | [e.g., 4500 of 8192 max] | Leave room for response generation |

**Overflow strategy:** [e.g., "If retrieved chunks exceed 2000 tokens, keep top-3 by relevance score and drop the rest. Never truncate mid-chunk."]

### 7.3 Citation Rules

<!-- EXPLANATION: How the LLM should reference retrieved sources in its response. -->

| Rule | Description |
|------|-------------|
| [rule] | [detail] |

<!-- EXAMPLE:
| Inline citation | Every factual claim must include [Source N] reference |
| Source list | End of response includes a "Sources" section with full titles and dates |
| No-source disclaimer | If answering from general knowledge (not retrieved context), state: "This is based on general knowledge, not your documents." |
| Conflicting sources | If sources disagree, present both views with citations and let user decide |
-->

---

## 8. Error Handling

| Condition | Response |
|-----------|----------|
| [error condition] | [HTTP status + response body] |

---

## 9. Version History

<!-- EXPLANATION: Track every change to the prompt like an API changelog. This creates accountability and makes regressions traceable. -->

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | [date] | Initial specification |

---

## 10. Maintenance Guidelines

<!-- EXPLANATION: Process for changing the prompt. This prevents ad-hoc modifications that break things. -->

When modifying the system prompt:

1. **Update this spec first** — Describe the intended change
2. **Update nl-interpretation.md** — If adding/removing query patterns
3. **Update data-quality.md** — If changing data format handling
4. **Add acceptance tests** — Every new example needs a test
5. **Bump version** — Patch for tweaks, minor for new patterns, major for structural changes
6. **Review like an API change** — Get sign-off before deploying
