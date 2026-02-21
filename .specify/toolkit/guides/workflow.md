# Workflow Guide — Step-by-Step Process

> When to create each document, in what order, and how they connect to Spec-Kit phases.

---

## Overview

This guide walks through the complete product development workflow, from initial idea to implementation. Each step maps to a Spec-Kit command and references the appropriate template.

---

## Phase 1: Define (Before `/speckit.specify`)

**Goal:** Capture what the product does and why it exists.

### Step 1.1: Write the PRD

**Template:** `templates/prd.md`

**What to write:**
- Sections 1–10 (standard PRD sections): Overview, users, journeys, requirements, data model, relationships, success criteria, edge cases, capabilities, API contract
- If your feature has an LLM: also write Sections 11–14 (interpretation contract, data flow, data quality, prompt structure)
- If your feature has a data pipeline: also write Sections 12–13 (data flow, data quality)

**Decision point:**

```
Does your feature involve an LLM?
├── YES → Write Sections 11-14 in the PRD
│         Does it also use RAG (retrieval from a knowledge base)?
│         ├── YES → Also write Section 15 (RAG Contract) in the PRD
│         │         Then proceed to Step 1.2 (NL Interpretation Contract)
│         └── NO  → Proceed to Step 1.2 (NL Interpretation Contract)
└── NO  → Skip Sections 11-15
          Does it have a data pipeline?
          ├── YES → Write Sections 12-13 in the PRD
          │         Then proceed to Step 1.3 (Data Quality Contract)
          └── NO  → Proceed to Phase 2
```

**Time estimate:** 2-4 hours for a medium feature

### Step 1.2: Write the NL Interpretation Contract (LLM features only)

**Template:** `templates/nl-interpretation.md`

**What to write:**
1. Start by listing 20+ example user prompts your feature should handle
2. Group them into intent categories (the semantic taxonomy)
3. For each category, write the exact structured output
4. Define field resolution rules (user concept → field name)
5. List prohibited outputs (things the LLM must not do)
6. Write Given/When/Then acceptance scenarios for each category

**Quality check:** If you can't write the exact JSON output for a given prompt, the spec is too vague. Be more specific.

**Time estimate:** 1-2 hours

### Step 1.3: Write the Data Quality Contract (pipeline features only)

**Template:** `templates/data-quality.md`

**What to write:**
1. Get a sample of your actual data (or run the generator)
2. Catalogue every dirty pattern you see (case, typos, format)
3. For each pipeline stage, document what gets normalized and what doesn't
4. Map field aliases (canonical name → all known variants)
5. Define number and date parsing rules

**Quality check:** Can you trace a single dirty value through every pipeline stage and predict what it looks like at the end? If not, add more detail.

**RAG extension:** If your feature uses RAG, also write Section 6 of the data quality template (Indexing & Retrieval Data Quality): chunk quality rules, embedding drift strategy, and retrieval quality metrics.

**Time estimate:** 1-2 hours (add 1 hour for RAG indexing quality section)

---

## Phase 2: Specify (`/speckit.specify` + `/speckit.clarify`)

**Goal:** Convert the PRD into a structured specification with user stories and acceptance criteria.

### Step 2.1: Run `/speckit.specify`

Feed your PRD (and companion documents) to the AI agent:

```
/speckit.specify [paste PRD content or reference the file]
```

The AI agent produces `spec.md` with user stories and acceptance criteria.

### Step 2.2: Run `/speckit.clarify`

This is where you catch gaps. Focus questions on:

- **For LLM features:** "How exactly should the LLM handle [ambiguous query]?" "What field names should the LLM use for [concept]?" "What happens when the LLM produces an invalid instruction?"
- **For data pipelines:** "What format are numbers in after [stage]?" "How is tenant selected when there are multiple fleet IDs?" "What happens to dirty status values like 'Acepted'?"
- **For all features:** "What's the expected behavior when [edge case]?" "How does [component A] communicate with [component B]?"

**Quality check:** If `/speckit.clarify` doesn't surface any new information, either your PRD is very thorough or you're not asking deep enough questions. Try asking about data formats, field naming, and error states specifically.

### Step 2.3: Write the Prompt Spec (LLM features only)

**Template:** `templates/prompt-spec.md`

**What to write:** Now that the spec is refined, design the system prompt:
1. Define the prompt structure (static vs dynamic sections)
2. List dynamic injection points with their sources
3. Write explicit rules (derived from prohibited outputs in the NL interpretation contract)
4. Create few-shot examples (one per intent category)
5. Define the response contract

**RAG extension:** If your feature uses RAG, also write Section 7 of the prompt spec (Retrieved Context Injection): injection template, token budget, overflow strategy, and citation rules. Also write Section 6 of the NL interpretation contract (Retrieval-Aware Interpretation): how retrieval results influence intent classification.

**Time estimate:** 1 hour (add 1 hour for RAG context injection and retrieval-aware interpretation)

---

## Phase 3: Plan (`/speckit.plan`)

**Goal:** Create a technical implementation plan.

### Step 3.1: Run `/speckit.plan`

Provide your tech stack and architecture choices. Reference ALL companion documents:

```
/speckit.plan Use [tech stack]. Reference these documents for implementation:
- NL interpretation contract: .specify/specs/[feature]/nl-interpretation.md
- Data quality contract: .specify/specs/[feature]/data-quality.md
- Prompt spec: .specify/specs/[feature]/prompt-spec.md
```

### Step 3.2: Write E2E Scenarios

**Template:** `templates/e2e-scenarios.md`

**What to write:** Now that the plan exists, create concrete test scenarios:
1. Define sample test data (actual JSON rows)
2. One scenario per supported query/action pattern
3. Expected intermediate state at each pipeline boundary
4. Expected final output with column names and value constraints
5. Edge case scenarios for dirty data

**RAG extension:** If your feature uses RAG, add retrieval scenarios (Section 5 of the E2E template): "Given these docs are indexed, when user asks X, system retrieves Y and answers Z." Include a cross-tenant isolation scenario and a stale content scenario.

**Time estimate:** 1-2 hours (add 1 hour for RAG retrieval scenarios)

---

## Phase 4: Tasks (`/speckit.tasks`)

**Goal:** Break the plan into actionable implementation tasks.

### Step 4.1: Run `/speckit.tasks`

The AI agent creates `tasks.md` from the plan.

### Step 4.2: Run `/speckit.analyze` (Optional but recommended)

Cross-check consistency between spec, plan, and tasks.

### Step 4.3: Complete the Handoff Checklist

**Template:** `templates/handoff-checklist.md`

Go through every checkbox. Any unchecked item is a risk.

---

## Phase 5: Implement (`/speckit.implement`)

**Goal:** Build the feature.

### Step 5.1: Run `/speckit.implement`

The AI agent executes tasks from `tasks.md`.

**Observability check:** After the AI agent completes implementation, verify it added boundary and decision logging per the handoff checklist (Section F. Observability & Validation Logging). Every component should log input/output counts at its boundaries and log *why* rows are dropped or transformed. If this is missing, ask the agent to add it before moving to testing — it will save significant debugging time later. This applies to all features, not just pipelines.

### Step 5.2: Test Against E2E Scenarios

After implementation, manually verify each E2E scenario. If any fail, check the handoff checklist diagnostic table for which document needs updating.

### Step 5.3: Run `/speckit.checklist` (Optional)

Generate a quality checklist to validate requirements completeness.

---

## Summary Timeline

| Phase | Duration | Key Output |
|-------|----------|-----------|
| 1. Define | 4-8 hours | PRD + companion docs |
| 2. Specify | 1-2 hours | spec.md, clarifications, prompt spec |
| 3. Plan | 1-2 hours | plan.md, E2E scenarios |
| 4. Tasks | 30 min | tasks.md, handoff checklist |
| 5. Implement | Varies | Working feature |

**Total PM prep time before implementation:** 3-5 hours for a standard feature, 6-12 hours for a complex LLM feature, 10-16 hours for LLM + RAG.

**Investment return:** In our Logistics Discovery project, skipping 4 hours of upfront specification cost 20+ hours of debugging iterations. RAG features have even more boundaries — the cost of under-specification is higher.
