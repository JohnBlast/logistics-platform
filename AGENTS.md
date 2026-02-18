# Agent Context – Logistics Platform

Guidance for AI agents working on this codebase.

## Document Hierarchy

| Document | Role | When to Use |
|----------|------|-------------|
| **.specify/specs/001-etl-configurator/001-ETL-PRD.md** | Golden source for ETL Configurator | Specifying requirements, clarifying scope, validating implementation against full PRD |
| **.specify/specs/001-etl-configurator/spec.md** | Derived spec (user stories, acceptance scenarios) | Planning, tasks, implementation |
| **.specify/specs/001-etl-configurator/data-model.md** | Target schema summary | API design, validation logic |
| **.specify/memory/constitution.md** | Platform principles | All phases |
| **PRD.md** | Platform index and condensed summaries | Quick reference; links to golden sources |

## Spec-Kit Commands

When running `/speckit.specify` or `/speckit.clarify` for **001 ETL Configurator**:
- **Always reference** `001-ETL-PRD.md` as the source of truth
- Include full PRD context when creating or refining requirements
- Ensure FR-*, GR-*, SC-*, EC-* sections are reflected in the spec

## Feature Context

Set `SPECIFY_FEATURE=001-etl-configurator` when working on ETL in non-Git contexts.

## Avoiding Context Loss

- Do not condense or omit requirements from the PRD when producing the spec
- Cross-reference: spec.md user stories should trace back to PRD sections (journeys, FRs, guardrails)
- Edge cases (EC-*) and constraints (C-*) in the PRD must be respected in implementation
