# PM → AI Developer Handoff Checklist

> **What this is:** A verification checklist to complete before running `/speckit.implement`. Ensures all documents are complete and the AI agent has everything it needs to build the feature without guessing.
>
> **When to use:** After all specs are written, before implementation begins. Also use as a review tool when the AI agent gets stuck — check which document is missing or incomplete.
>
> **Why it matters:** Every checkbox left unchecked is a potential debugging loop. In our Logistics Discovery project, unchecked items in the "LLM Features" and "Data Quality" sections directly caused 8+ iterations of fixing.
>
> **Spec-Kit phase:** Complete before `/speckit.implement`.

---

## Instructions

- Work through the checklist top to bottom
- Check each item only when it's genuinely complete
- If a section doesn't apply (e.g., no LLM), mark the whole section as N/A
- Share this checklist with the AI agent so it knows what's been verified

---

# Handoff Checklist: [Feature Name]

**Date:** [date]
**PM:** [name]
**Target:** `/speckit.implement`

---

## A. Core Documents (Required for ALL features)

### A1. PRD Completeness

- [ ] Overview and problem statement written
- [ ] Target users defined with capabilities AND restrictions
- [ ] All user journeys documented with numbered steps
- [ ] Functional requirements use "System shall..." language
- [ ] Data entities defined with exact field names
- [ ] Key relationships documented (especially access control)
- [ ] Success criteria are testable (not vague)
- [ ] Edge cases listed with expected behavior (not just "handle gracefully")
- [ ] Out of scope explicitly listed

### A2. Spec-Kit Artifacts

- [ ] `/speckit.specify` has been run and spec.md exists
- [ ] `/speckit.clarify` has been run (or explicitly skipped with documented reason)
- [ ] All clarification answers are recorded
- [ ] `/speckit.plan` has been run and plan.md exists
- [ ] `/speckit.tasks` has been run and tasks.md exists

---

## B. LLM Features (Required when feature involves an LLM)

> Skip this section if your feature has no LLM component.

### B1. NL Interpretation Contract

- [ ] `nl-interpretation.md` exists
- [ ] Semantic taxonomy covers all intent categories (≥ 5 categories for a typical feature)
- [ ] Phrase → structured output mapping has concrete JSON (not prose descriptions)
- [ ] Field resolution rules map user concepts to exact field names
- [ ] Prohibited outputs listed (≥ 3 rules for a typical LLM feature)
- [ ] Acceptance scenarios have Given/When/Then with exact expected JSON
- [ ] Edge cases listed with expected behavior
- [ ] Every intent category has at least one acceptance scenario

### B2. System Prompt Specification

- [ ] `prompt-spec.md` exists
- [ ] Prompt structure documented (sections, static vs dynamic)
- [ ] Dynamic injection points defined with source and condition
- [ ] Rules section has concrete do/don't statements (not "be careful")
- [ ] Few-shot examples cover every intent category
- [ ] Response contract defines exact JSON shape
- [ ] Error handling covers: missing API key, rate limit, malformed response, timeout
- [ ] Version number assigned

### B3. LLM Integration Verification

- [ ] API key / environment variable documented
- [ ] Rate limiting configured and documented
- [ ] Fallback behavior defined (what happens when LLM is down)
- [ ] Maximum token limit appropriate for expected output size

---

## C. Data Pipeline Features (Required when feature processes data)

> Skip this section if your feature has no data transformation pipeline.

### C1. Data Quality Contract

- [ ] `data-quality.md` exists
- [ ] Dirty data patterns documented with REAL examples (not generic descriptions)
- [ ] Every field type has known dirty variants listed
- [ ] Normalization rules documented for EACH pipeline stage
- [ ] What IS and IS NOT normalized at each stage is explicit
- [ ] Field alias mappings are complete (canonical → all known aliases)
- [ ] Number format handling specified (comma-decimal, thousands, unit suffixes)
- [ ] Date format handling specified (ISO, DD/MM/YYYY, etc.)

### C2. Pipeline Boundary Contracts

- [ ] Each pipeline stage is named and ordered
- [ ] Data shape (column names) documented at each boundary
- [ ] Value formats documented at each boundary
- [ ] Key transformations at each stage are explicit

---

## D. Multi-Component Features (Required when ≥ 3 components in chain)

> Skip this section for simple features with 1-2 components.

### D1. End-to-End Scenarios

- [ ] `e2e-scenarios.md` exists
- [ ] Sample test data is concrete (actual JSON rows, not descriptions)
- [ ] At least one scenario per supported query/action pattern
- [ ] Each scenario defines expected intermediate states at every boundary
- [ ] Expected output includes: columns, row count constraints, value types
- [ ] Edge case scenarios cover dirty data (comma-decimals, typos, nulls)
- [ ] Manual calculation walkthrough for at least one aggregation scenario

---

## E. RAG Features (Required when feature uses retrieval-augmented generation)

> Skip this section if your feature has no RAG / vector search component.

### E1. Indexing Contract

- [ ] Data sources for indexing are listed with content type and update frequency
- [ ] Chunking strategy defined (size, overlap, method) with rationale
- [ ] Metadata fields defined for each chunk (tenant_id, category, timestamp, source_url)
- [ ] Indexing quality rules defined (min/max length, no empty metadata, dedup)
- [ ] Re-indexing strategy defined (on update, on model change, scheduled)

### E2. Retrieval Contract

- [ ] Top-k value defined with rationale
- [ ] Similarity threshold defined with rationale
- [ ] Mandatory filters defined (especially tenant_id for multi-tenant)
- [ ] Fallback behavior defined for: zero results, low confidence, index unavailable
- [ ] Cross-tenant isolation verified (chunks from tenant A never returned for tenant B)

### E3. Context Injection

- [ ] Injection template defined (location in prompt, format, citation markers)
- [ ] Token budget defined for retrieved context
- [ ] Overflow strategy defined (what to drop when over budget)
- [ ] Citation format defined (inline references, source list)

### E4. Answer Quality Rules

- [ ] Rule: only answer from retrieved context (no hallucination from training data)
- [ ] Rule: cite sources for every factual claim
- [ ] Rule: admit when context is insufficient
- [ ] Rule: never combine cross-tenant information
- [ ] Freshness warning rule defined (flag stale content)

### E5. RAG-Specific Scenarios

- [ ] At least one "direct match" scenario (query matches indexed content)
- [ ] At least one "no relevant context" scenario (system refuses gracefully)
- [ ] At least one "cross-tenant isolation" scenario (wrong tenant's docs never returned)
- [ ] At least one "stale content" scenario (old docs flagged with warning)
- [ ] Retrieval quality metrics defined (Precision@k, Recall@k, latency, cross-tenant leak rate)

---

## F. Observability & Validation Logging (Required for ALL features)

> Every "returns empty" or "returns wrong data" bug we debugged could have been diagnosed in minutes with structured logging at component boundaries. Without it, you re-debug from scratch every time.

### F1. Boundary Logging

- [ ] Every component/stage boundary logs input count and output count (e.g. "join: 50 loads in → 42 matched rows out")
- [ ] Key match/miss rates are logged at integration points (e.g. "vehicle_id lookup: 42/50 matched, 8 missed")
- [ ] When output count drops to zero, a warning-level log is emitted explaining which step caused it

### F2. Decision Logging

- [ ] When rows are dropped or filtered, the reason is logged (which key didn't match, which rule excluded them)
- [ ] When values are transformed or normalized, a sample is logged on first occurrence (e.g. "cleanDate: '15/01/2025' → '2025-01-15'")
- [ ] LLM interpretation results are logged with the structured output (not the full prompt, just the parsed result)

### F3. Log Standards

- [ ] Logs use a consistent prefix per component (e.g. `[join]`, `[filter]`, `[transform]`, `[Discovery]`) so they are searchable/filterable
- [ ] Logs are structured enough to diagnose "returns empty" without reading source code — counts and decision reasons are sufficient
- [ ] No PII or full row contents in logs — only counts, field names, key identifiers, and decision reasons
- [ ] Critical-path logs are present in both development and production (not stripped by build)

---

## G. Final Verification

### G1. Cross-Document Consistency

- [ ] Field names in PRD match field names in NL interpretation contract
- [ ] Field names in NL interpretation contract match field names in prompt spec examples
- [ ] Dirty data patterns in data-quality.md cover all patterns from the actual data source
- [ ] E2E scenarios reference the correct sample data
- [ ] All documents reference the same entity/field naming convention
- [ ] (RAG) Metadata fields in indexing contract match filter fields in retrieval contract
- [ ] (RAG) Citation format in prompt spec matches citation rules in answer quality

### G2. AI Agent Context

- [ ] AGENTS.md (or equivalent) references all new documents
- [ ] Document hierarchy table is updated
- [ ] Spec-Kit commands section mentions when to use each document

---

## Checklist Summary

| Section | Status | Notes |
|---------|--------|-------|
| A. Core Documents | [ ] Complete / [ ] N/A | |
| B. LLM Features | [ ] Complete / [ ] N/A | |
| C. Data Pipeline | [ ] Complete / [ ] N/A | |
| D. Multi-Component | [ ] Complete / [ ] N/A | |
| E. RAG Features | [ ] Complete / [ ] N/A | |
| F. Observability & Logging | [ ] Complete | |
| G. Final Verification | [ ] Complete | |

**Ready for `/speckit.implement`?** [ ] Yes / [ ] No — [reason]

---

## When Things Go Wrong

If the AI agent gets stuck during implementation, use this diagnostic:

| Symptom | Likely missing document | Action |
|---------|------------------------|--------|
| LLM uses wrong field names | Prompt spec (§4 Rules), NL interpretation (§3.1 Field Resolution) | Add field mapping to prompt spec |
| LLM adds redundant filters | NL interpretation (§4 Prohibited Outputs) | Add explicit prohibition |
| Aggregations return NaN | Data quality (§4 Number Format Handling) | Document number formats, add parseNum spec |
| Filters match zero rows | Data quality (§3 Field Aliases), E2E scenarios (§4 Edge Cases) | Add alias mapping, verify test data |
| Empty results after pipeline | Data quality (§2 Normalization Rules), E2E scenarios (§5 Boundary States) | Check what each stage normalizes |
| "Returns empty" or "returns wrong" with no clue why | Handoff checklist (F. Observability) | Add boundary logging at each stage; log counts and decision reasons |
| Wrong tenant selected | PRD (§6 Key Relationships), Data quality (§2 Stage 5) | Document tenant selection algorithm |
| (RAG) LLM answers from training data, ignoring docs | Prompt spec (§7 Context Injection), NL interpretation (§6.3 Prohibited Patterns) | Add rule: "Only answer from retrieved context" |
| (RAG) Wrong documents retrieved | Data quality (§6 Indexing Quality), E2E scenarios (§5 Retrieval Scenarios) | Check chunking strategy, metadata filters, similarity threshold |
| (RAG) Cross-tenant data leak | Handoff checklist (§E2 Retrieval Contract) | Add mandatory tenant_id filter to retrieval; verify with isolation test |
| (RAG) Answers are outdated | Data quality (§6.2 Embedding Drift), Prompt spec (§7.3 Citation Rules) | Add freshness warning rule; re-index stale content |
| (RAG) Token limit exceeded | Prompt spec (§7.2 Token Budget) | Reduce top-k or chunk size; define overflow strategy |
