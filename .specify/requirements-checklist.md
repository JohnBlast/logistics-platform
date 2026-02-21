# Platform Requirements Checklist

> **What this is:** Quality checklist to validate requirements completeness across the Logistics Platform. Use before `/speckit.implement` or when the AI agent gets stuck.
>
> **Generated:** `/speckit.checklist` — run periodically to reassess readiness.

---

## Feature: 001 – ETL Configurator

**Status:** Implemented | **Last spec review:** — | **Ready for changes?** [ ] Yes / [ ] No

### A. Core Documents

| Item | Status | Notes |
|------|--------|-------|
| Overview and problem statement | ✓ | 001-ETL-PRD.md §1 |
| Target users defined | ✓ | Operations managers, admin staff |
| User journeys documented | ✓ | Journeys 1–8 |
| Functional requirements ("System shall...") | ✓ | FR-1.x through FR-11.x |
| Data entities with exact field names | ✓ | data-model.md, platform-data-model |
| Key relationships | ✓ | Join order, dedup, access |
| Testable success criteria | ✓ | §8 |
| Edge cases with expected behavior | ✓ | EC-1 through EC-14 |
| Out of scope explicit | ✓ | MVP limits |
| spec.md exists | ✓ | |
| clarify run / clarifications recorded | ✓ | clarifications.md, C-1–C-14 |
| plan.md exists | ✓ | |
| tasks.md exists | ✓ | |

### B. LLM Features (ETL: Mapping, Enum, Joins, Filtering)

| Item | Status | Notes |
|------|--------|-------|
| nl-interpretation.md exists | ✓ | filter-scenarios, nl-interpretation |
| Semantic taxonomy | ✓ | Filter intent categories |
| Phrase → structured output (JSON) | ✓ | filter-scenarios |
| Field resolution rules | ✓ | nl-interpretation |
| Prohibited outputs | ✓ | nl-interpretation |
| Acceptance scenarios (Given/When/Then) | ✓ | spec.md, filter-scenarios |
| prompt-spec | N/A | ETL uses Claude for interpretation; no dedicated prompt-spec for filters (inline in claudeService) |
| API key / env documented | ✓ | ANTHROPIC_API_KEY |

### C. Data Pipeline

| Item | Status | Notes |
|------|--------|-------|
| data-quality.md | ⚠ | 002 has it; 001 has data-model + generator patterns. ETL transformation rules in plan. |
| Dirty data patterns | ✓ | dirtyDataGenerator.ts, FR-4.4 |
| Pipeline stage boundaries | ✓ | Mapping → Enum → Transform → Dedup → Joins → Filter → Validation |
| Field alias mappings | ✓ | data-quality.md (002), applyMappings |

### D. Multi-Component

| Item | Status | Notes |
|------|--------|-------|
| e2e-scenarios | ⚠ | 002 has; 001 has acceptance scenarios in spec, no dedicated e2e-scenarios |
| Sample data concrete | ✓ | generator, SAMPLE_FLAT |
| One scenario per pattern | ✓ | spec.md user stories |

### E. RAG Features

| Item | Status |
|------|--------|
| N/A | ETL has no RAG |

### F. Observability & Validation Logging

| Item | Status | Notes |
|------|--------|-------|
| Boundary logging at stages | ⚠ | Add to pipeline (join, filter, transform counts) |
| Decision logging (why rows dropped) | ⚠ | Filter rules, join misses |
| Structured format (prefix, searchable) | ⚠ | Recommend [join], [filter], [transform] |
| No PII in logs | — | To verify |

### G. Final Verification

| Item | Status |
|------|--------|
| Field names consistent across docs | ✓ |
| AGENTS.md references docs | ✓ |
| Document hierarchy updated | ✓ |

---

## Feature: 002 – Logistics Discovery

**Status:** Planned / Partially implemented | **Ready for implement?** [ ] Yes / [ ] No

### A. Core Documents

| Item | Status | Notes |
|------|--------|-------|
| Overview and problem statement | ✓ | spec.md, 002-prd |
| Target users | ✓ | Fleet Operator |
| User journeys | ✓ | spec.md |
| Functional requirements | ✓ | FRs in PRD, spec |
| Data entities | ✓ | loads_and_quotes, loads, quotes |
| Key relationships | ✓ | Tenant filtering, view derivation |
| Success criteria | ✓ | |
| Edge cases | ✓ | clarifications.md |
| Out of scope | ✓ | |
| spec.md exists | ✓ | |
| clarify / clarifications | ✓ | clarifications.md |
| plan.md exists | ✓ | |
| tasks.md exists | ✓ | |

### B. LLM Features

| Item | Status | Notes |
|------|--------|-------|
| nl-interpretation.md exists | ✓ | Intent taxonomy, field resolution |
| Semantic taxonomy (≥5 categories) | ✓ | Route, driver, vehicle, city, date, revenue, etc. |
| Phrase → TableInstruction JSON | ✓ | §3, e2e-scenarios |
| Field resolution rules | ✓ | §3.1 |
| Prohibited outputs | ✓ | |
| Acceptance scenarios | ✓ | e2e-scenarios |
| prompt-spec.md exists | ✓ | Version 1.0.0 |
| Prompt structure documented | ✓ | Sections 1–4 |
| Dynamic injection (dataColumns) | ✓ | §3 |
| Few-shot examples | ✓ | §4 |
| Response contract | ✓ | TableInstruction schema |
| Error handling | ✓ | Missing key, rate limit, etc. |
| Version assigned | ✓ | 1.0.0 |

### C. Data Pipeline (Discovery consumes ETL output)

| Item | Status | Notes |
|------|--------|-------|
| data-quality.md exists | ✓ | Dirty patterns, normalization |
| Dirty patterns documented | ✓ | §1.1–1.7 |
| Normalization by stage | ✓ | §2 |
| Field alias mappings | ✓ | §3 |
| Number format | ✓ | parseNum, comma-decimal |
| Date format | ✓ | ISO, DD/MM/YYYY |

### D. Multi-Component

| Item | Status | Notes |
|------|--------|-------|
| e2e-scenarios.md exists | ✓ | |
| Sample data concrete | ✓ | SAMPLE_FLAT, scenarios |
| One scenario per pattern | ✓ | E2E-01 through E2E-07+ |
| Expected intermediate states | ✓ | baseRows, view derivation |
| Edge case scenarios | ✓ | Dirty data, no matches |

### E. RAG Features

| Item | Status |
|------|--------|
| N/A | Discovery has no RAG |

### F. Observability & Validation Logging

| Item | Status | Notes |
|------|--------|-------|
| Boundary logging | ⚠ | Discovery query engine; recommend [Discovery] prefix |
| Decision logging | ⚠ | Filter application, aggregation |
| Structured format | ⚠ | |
| No PII | — | |

### G. Final Verification

| Item | Status |
|------|--------|
| Field names consistent | ✓ |
| data-quality aligns with generator | ✓ |
| E2E scenarios reference correct data | ✓ |
| AGENTS.md references Discovery docs | ✓ |

---

## Summary

| Section | 001 ETL | 002 Discovery |
|---------|---------|---------------|
| A. Core Documents | Complete | Complete |
| B. LLM Features | Partial (no dedicated prompt-spec) | Complete |
| C. Data Pipeline | Partial | Complete |
| D. Multi-Component | Partial | Complete |
| E. RAG | N/A | N/A |
| F. Observability | Needs work | Needs work |
| G. Final Verification | Complete | Complete |

**Recommendation:** Before new implementation work, add boundary and decision logging per handoff checklist §F. For 001, consider adding `e2e-scenarios.md` if regression coverage is desired. For 002, Discovery is ready for `/speckit.implement`; observability should be added during implementation.

---

## When Things Go Wrong

Use the handoff checklist "When Things Go Wrong" diagnostic table (see toolkit templates if available) or:

| Symptom | Likely missing | Action |
|---------|----------------|--------|
| LLM wrong field names | prompt-spec §4, nl-interpretation §3.1 | Add field mapping |
| Filters match zero rows | data-quality §3, e2e §4 | Add alias, verify test data |
| Empty results after pipeline | data-quality §2, e2e §5 | Check stage normalization |
| "Returns empty" with no clue | Observability §F | Add boundary logging, log counts |
