# PM → AI Developer Handoff Checklist: Job Market Simulation

**Date:** 2026-02-23
**Target:** `/speckit.implement`

---

## A. Core Documents (Required)

### A0. Constitution

- [x] `constitution.md` exists (shared platform constitution at `.specify/memory/constitution.md`)
- [x] Principles cover: users, data handling, development philosophy, delivery approach
- [x] Governance section defines decision priorities
- [x] Referenced in AGENTS.md

### A1. PRD Completeness

- [x] Overview and problem statement written
- [x] Target users defined with capabilities AND restrictions (Fleet Operator, Load Poster)
- [x] All user journeys documented with numbered steps (5 journeys)
- [x] Functional requirements use "System shall..." language
- [x] Data entities defined with exact field names (extends platform-data-model.md)
- [x] Key relationships documented (especially access control)
- [x] Success criteria are testable
- [x] Edge cases listed with expected behavior (8 edge cases)
- [x] Out of scope explicitly listed

### A2. Spec-Kit Artifacts

- [x] `/speckit.specify` has been run and spec.md exists
- [x] `/speckit.clarify` has been run
- [x] All clarification answers are recorded (C-1 through C-24)
- [x] `/speckit.plan` has been run and plan.md exists
- [x] `/speckit.tasks` has been run and tasks.md exists

### A3. Figma Designs

- N/A — No Figma designs for this feature.

---

## B. LLM Features

- N/A — No LLM component in MVP. Planned for future iteration (LLM-powered Load Poster profiles).

---

## C. Data Pipeline Features

- N/A — Data is simulated/generated in-memory, not ingested from external sources through a pipeline.

---

## D. Multi-Component Features

### D1. End-to-End Scenarios

- [x] `e2e-scenarios.md` exists
- [x] Sample test data is concrete (actual JSON rows with specific values)
- [x] At least one scenario per supported action pattern (6 scenarios: quote, acceptance single, acceptance competing, job gen, map, fleet gen)
- [x] Each scenario defines expected intermediate states at every boundary
- [x] Expected output includes: columns, row count constraints, value types
- [x] Edge case scenarios cover: no vehicles, ADR mismatch, duplicates, empty board, vehicle mismatch (5 edge cases)
- [x] Manual calculation walkthrough for recommender and acceptance scoring

---

## E. RAG Features

- N/A — No RAG component.

---

## F. Recommender Features

### F1. Scoring & Ranking Contract

- [x] Candidate pool defined (price range recommendation, not item ranking)
- [x] Scoring signals defined with weights — 4 acceptance signals (price 0.40, ETA 0.30, fleet_rating 0.18, vehicle_match 0.12). ADR is a hard gate, not a scoring signal.
- [x] Score output format defined (price range: min/mid/max in £)
- [x] Scoring mode defined (real-time, rule-based formula)
- [x] ADR enforcement defined as hard gate (blocks submission, not scored)
- [x] Ranking rules defined (N/A — recommender suggests price, not ranked items)
- [x] Fallback strategies defined (new fleet → default rating 3.0, sole bidder → threshold 0.50)
- [x] At least 6 acceptance scenarios (REC-01 through REC-06 in PRD §16.5)

### F2. Feedback Loop

- N/A for MVP — Quote acceptance is rule-based, not learned. No feedback loop modifies the scoring formula. Future iteration may add feedback.

### F3. Evaluation & Experimentation

- [x] Evaluation scenarios defined (EVAL-01: price accuracy, EVAL-02: scoring consistency, EVAL-03: competition factor)
- [x] Pass/fail criteria defined for each evaluation
- [x] Manual calculation walkthroughs included
- [x] Recommender edge case scenarios defined (5 cases in e2e-scenarios.md)
- N/A: A/B testing — rule-based system doesn't require A/B tests in MVP

### F4. Recommender-Specific Data Quality

- N/A — No interaction signal ingestion. Scoring is formula-based on job attributes.

---

## G. Observability & Validation Logging

### G1. Boundary Logging

- [ ] Every component/stage boundary logs input count and output count
- [ ] Key match/miss rates are logged (e.g., "vehicle city lookup: 3/3 resolved")
- [ ] When output count drops to zero, a warning-level log is emitted

### G2. Decision Logging

- [ ] Quote acceptance scoring decisions logged with full score breakdown
- [ ] Recommender price calculation logged with all input signals and output range
- [ ] Job generation logged with count and city assignments

### G3. Log Standards

- [ ] Logs use consistent prefix: `[job-market]`, `[recommender]`, `[acceptance]`, `[fleet]`
- [ ] Logs structured enough to diagnose issues without reading source
- [ ] No PII in logs

---

## H. Final Verification

### H1. Cross-Document Consistency

- [x] Field names in PRD match field names in platform-data-model.md
- [x] E2E scenarios reference the correct sample data
- [x] All documents reference the same entity/field naming convention (snake_case)
- [x] Scoring signals in PRD §16 match signals in e2e-scenarios EVAL scenarios
- [x] Evaluation metric targets in e2e-scenarios §6 match acceptance criteria in PRD §16.5

### H2. AI Agent Context

- [x] AGENTS.md references all new documents
- [x] Document hierarchy table is updated
- [x] Spec-Kit commands section mentions when to use each document

---

## Checklist Summary

| Section | Status | Notes |
|---------|--------|-------|
| A. Core Documents | Complete | PRD, spec.md, plan.md, tasks.md all created; clarifications C-1 to C-24 recorded |
| B. LLM Features | N/A | Planned for future iteration |
| C. Data Pipeline | N/A | Simulated data, no pipeline |
| D. Multi-Component | Complete | 6 E2E scenarios + 5 edge cases |
| E. RAG Features | N/A | |
| F. Recommender Features | Complete | Rule-based scoring, no feedback loop |
| G. Observability & Logging | Pending | Phase 8 in tasks.md (T045–T047) |
| H. Final Verification | Complete | AGENTS.md updated, cross-document consistency verified |

**Ready for `/speckit.implement`?** Yes — all spec artifacts complete. G (Observability) to be completed during Phase 8 of implementation.

**Completed steps:**
1. ~~Run `/speckit.specify` to produce spec.md~~ ✓
2. ~~Run `/speckit.clarify` to resolve any ambiguities~~ ✓ (C-1 to C-24)
3. ~~Run `/speckit.plan` to produce plan.md~~ ✓
4. ~~Run `/speckit.tasks` to produce tasks.md~~ ✓ (53 tasks across 10 phases)
5. Complete section G during implementation (Phase 8, T045–T047)
6. ~~Update AGENTS.md~~ ✓
