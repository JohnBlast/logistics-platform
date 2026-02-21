# AI-Assisted Product Development Toolkit

> A reusable set of templates, guides, and checklists for product managers working with AI coding agents. Born from real lessons building LLM-mediated features where under-specification led to 8+ debugging iterations.

## Who This Is For

Product managers who:
- Are experimenting with AI coding agents (Cursor, Claude Code, Copilot, etc.)
- Want predictable outcomes from AI-assisted implementation
- Need to bridge the gap between product intent and what AI agents actually build
- Are building features that involve LLMs (chatbots, NL interfaces, AI-powered analytics)

## The Core Problem This Solves

Traditional PRDs tell the AI agent *what* to build but not *how the boundaries work*. When your feature has:
- An LLM interpreting user intent
- Dirty or variable data flowing through multiple transformation stages
- Multiple components with undocumented contracts between them

...the AI agent will guess at each boundary, and each guess is a potential bug that requires another round of debugging.

**This toolkit ensures you specify the boundaries before implementation begins.**

---

## Document Map

### When to Use Each Document

```
Project Start
    │
    ▼
┌─────────────────────────┐
│  1. PRD                 │  Always. Every project.
│     (prd.md)            │  Define WHAT and WHY.
└────────┬────────────────┘
         │
         ▼
    ┌────────────┐     ┌──────────────────────────────┐
    │ Has LLM /  │ YES │  2. NL Interpretation Contract│
    │ NL feature?├────►│     (nl-interpretation.md)    │
    │            │     │  3. Prompt Spec               │
    └────┬───────┘     │     (prompt-spec.md)          │
         │ NO          └───────────┬──────────────────┘
         │                         │
         │                    ┌────▼───────┐     ┌────────────────────┐
         │                    │ Uses RAG / │ YES │  + RAG sections in │
         │                    │ retrieval? ├────►│    all templates    │
         │                    └────┬───────┘     └────────────────────┘
         │                         │ NO
         ▼                         ▼
    ┌────────────┐     ┌──────────────────────────────┐
    │ Has data   │ YES │  4. Data Quality Contract     │
    │ pipeline / ├────►│     (data-quality.md)         │
    │ transforms?│     └──────────────────────────────┘
    └────┬───────┘
         │
         ▼
    ┌────────────┐     ┌──────────────────────────────┐
    │ Multiple   │ YES │  5. E2E Scenarios             │
    │ components ├────►│     (e2e-scenarios.md)        │
    │ in chain?  │     └──────────────────────────────┘
    └────┬───────┘
         │
         ▼
┌─────────────────────────┐
│  6. Handoff Checklist   │  Always. Before /speckit.implement.
│     (handoff-checklist) │  Verify completeness.
└─────────────────────────┘
```

### Document Summary

| # | Document | Purpose | When to Create | Spec-Kit Phase |
|---|----------|---------|----------------|----------------|
| 1 | **PRD** (`templates/prd.md`) | Define product requirements, user journeys, and (for LLM features) interpretation contracts | Before `/speckit.specify` | Specify |
| 2 | **NL Interpretation Contract** (`templates/nl-interpretation.md`) | Map natural language → structured output; define what the LLM must/must not produce | Before `/speckit.plan` | Specify / Clarify |
| 3 | **Data Quality Contract** (`templates/data-quality.md`) | Document dirty data patterns, normalization rules, and field aliases at each pipeline stage | Before `/speckit.plan` | Clarify |
| 4 | **System Prompt Spec** (`templates/prompt-spec.md`) | Version-control the LLM system prompt as an interface contract | Before `/speckit.implement` | Plan |
| 5 | **E2E Scenarios** (`templates/e2e-scenarios.md`) | Full pipeline test scenarios with concrete data, expected shapes, and boundary assertions | Before `/speckit.implement` | Tasks |
| 6 | **Handoff Checklist** (`templates/handoff-checklist.md`) | Verify all documents are complete before handing off to the AI agent | Before `/speckit.implement` | Pre-implement |

### Guides

| Guide | Purpose |
|-------|---------|
| **Workflow Guide** (`guides/workflow.md`) | Step-by-step process with decision points for when to create each document |
| **LLM Feature Guide** (`guides/llm-features.md`) | Deep dive on specifying LLM-mediated features — the lessons that cost us 8+ iterations |

---

## Quick Start

### For a standard feature (no LLM, no data pipeline)

1. Write the PRD using `templates/prd.md`
2. Run `/speckit.specify` and `/speckit.clarify`
3. Complete the handoff checklist
4. Run `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`

### For an LLM-mediated feature

1. Write the PRD using `templates/prd.md` (including the LLM-specific sections)
2. Write the NL Interpretation Contract using `templates/nl-interpretation.md`
3. Write the Prompt Spec using `templates/prompt-spec.md`
4. Write the Data Quality Contract using `templates/data-quality.md`
5. Write E2E Scenarios using `templates/e2e-scenarios.md`
6. Run `/speckit.specify` and `/speckit.clarify` — referencing all documents
7. Complete the handoff checklist
8. Run `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`

### For an LLM + RAG feature (chatbot over documents, knowledge Q&A)

1. Write the PRD using `templates/prd.md` (including LLM sections AND Section 15: RAG Contract)
2. Write the NL Interpretation Contract using `templates/nl-interpretation.md` (including §6: Retrieval-Aware Interpretation)
3. Write the Prompt Spec using `templates/prompt-spec.md` (including §7: Retrieved Context Injection)
4. Write the Data Quality Contract using `templates/data-quality.md` (including §6: Indexing & Retrieval Quality)
5. Write E2E Scenarios using `templates/e2e-scenarios.md` (including §5: Retrieval Scenarios)
6. Run `/speckit.specify` and `/speckit.clarify` — referencing all documents
7. Complete the handoff checklist (including Section E: RAG Features)
8. Run `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`

### For a data pipeline feature (no LLM)

1. Write the PRD using `templates/prd.md`
2. Write the Data Quality Contract using `templates/data-quality.md`
3. Write E2E Scenarios using `templates/e2e-scenarios.md`
4. Complete the handoff checklist
5. Proceed with Spec-Kit workflow

---

## Folder Structure

```
.specify/toolkit/
├── README.md                          ← You are here
├── templates/
│   ├── prd.md                         ← Enhanced PRD template
│   ├── nl-interpretation.md           ← NL interpretation contract
│   ├── data-quality.md                ← Data quality contract
│   ├── prompt-spec.md                 ← System prompt specification
│   ├── e2e-scenarios.md               ← End-to-end test scenarios
│   └── handoff-checklist.md           ← PM→AI handoff checklist
└── guides/
    ├── workflow.md                     ← Step-by-step workflow
    └── llm-features.md                ← LLM feature specification guide
```

---

## Key Principle

> **For any feature where an LLM interprets user intent, the system prompt is the interface contract. Design it before implementation — not as a debugging afterthought.**

This principle applies whether you're building:
- A chatbot that queries data
- An NL-to-SQL translator
- An AI assistant that generates code
- A classification system that routes user requests
- A RAG-powered Q&A system over company documents
- A knowledge-enhanced support assistant
- Any feature where "natural language in → structured action out"

> **For RAG features, add:** The indexing pipeline, retrieval parameters, and context injection format are three additional interface contracts. Each undocumented boundary is a place where the system silently degrades — the LLM will confidently generate answers from irrelevant context, and the user can't tell the difference.
