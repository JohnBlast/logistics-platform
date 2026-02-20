# Agent Context – Logistics Platform

Guidance for AI agents working on this codebase.

## Document Hierarchy

| Document | Role | When to Use |
|----------|------|-------------|
| **.specify/specs/001-etl-configurator/001-ETL-PRD.md** | Golden source for ETL Configurator | Specifying requirements, clarifying scope, validating implementation against full PRD |
| **.specify/specs/001-etl-configurator/nl-interpretation.md** | NL interpretation requirements (Spec-Kit aligned) | Implementing or extending NL features (filters, joins); defines semantic taxonomy, example phrasings, interpretation contract |
| **.specify/specs/001-etl-configurator/filter-scenarios.md** | Filter implementation reference | Implementing filter patterns; concrete rule-based and Claude examples |
| **.specify/specs/001-etl-configurator/simulate-add-pattern.md** | Simulate pipeline incremental-add design | Reusing add pattern for other products; scaling test data |
| **002-prd-logistics-discovery .md** | Golden source for Logistics Discovery | Specifying Discovery; ETL→Discovery integration; platform schema |
| **.specify/specs/001-etl-configurator/spec.md** | Derived spec (user stories, acceptance scenarios) | Planning, tasks, implementation |
| **.specify/platform-data-model.md** | Platform data model (canonical) | Single schema for ETL, Discovery, and all products |
| **.specify/specs/001-etl-configurator/data-model.md** | ETL target schema (conforms to platform) | API design, validation logic |
| **.specify/memory/constitution.md** | Platform principles | All phases |
| **PRD.md** | Platform index and condensed summaries | Quick reference; links to golden sources |

## Spec-Kit Commands

When running `/speckit.specify` or `/speckit.clarify` for **001 ETL Configurator**:
- **Always reference** `001-ETL-PRD.md` as the source of truth
- Include full PRD context when creating or refining requirements
- Ensure FR-*, GR-*, SC-*, EC-* sections are reflected in the spec
- For **natural language features** (filters, joins): use `nl-interpretation.md`—define semantic taxonomy, example phrasings, interpretation contract (phrase → structured output), and Given/When/Then acceptance scenarios per [Spec-Kit best practices](https://github.com/github/spec-kit)

## Feature Context

Set `SPECIFY_FEATURE=001-etl-configurator` when working on ETL in non-Git contexts.

## Avoiding Context Loss

- Do not condense or omit requirements from the PRD when producing the spec
- Cross-reference: spec.md user stories should trace back to PRD sections (journeys, FRs, guardrails)
- Edge cases (EC-*) and constraints (C-*) in the PRD must be respected in implementation
