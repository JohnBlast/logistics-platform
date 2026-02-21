# Agent Context – Logistics Platform

Guidance for AI agents working on this codebase.

## Document Hierarchy

| Document | Role | When to Use |
|----------|------|-------------|
| **.specify/specs/001-etl-configurator/001-ETL-PRD.md** | Golden source for ETL Configurator | Specifying requirements, clarifying scope, validating implementation against full PRD |
| **.specify/specs/001-etl-configurator/nl-interpretation.md** | NL interpretation requirements (Spec-Kit aligned) | Implementing or extending NL features (filters, joins); defines semantic taxonomy, example phrasings, interpretation contract |
| **.specify/specs/001-etl-configurator/filter-scenarios.md** | Filter implementation reference | Implementing filter patterns; concrete rule-based and Claude examples |
| **.specify/specs/001-etl-configurator/simulate-add-pattern.md** | Simulate pipeline incremental-add design | Reusing add pattern for other products; scaling test data |
| **.specify/specs/002-data-discovery/002-PRD-discovery.md** | Golden source for Logistics Discovery | Specifying Discovery; ETL→Discovery integration; Simulate Pipeline as data source; platform schema |
| **.specify/specs/002-data-discovery/nl-interpretation.md** | NL interpretation requirements for Discovery (Spec-Kit aligned) | Implementing or extending Discovery NL features; semantic taxonomy, phrase→TableInstruction mapping, acceptance scenarios, edge cases |
| **.specify/specs/002-data-discovery/data-quality.md** | Data quality contract for Discovery pipeline | Dirty data patterns, normalization rules per layer, field alias mappings, number/date format handling |
| **.specify/specs/002-data-discovery/prompt-spec.md** | System prompt specification (versioned contract) | Modifying Claude's system prompt; prompt structure, rules, examples, dynamic injection points |
| **.specify/specs/002-data-discovery/e2e-scenarios.md** | End-to-end test scenarios for Discovery | Full pipeline scenarios with sample data, expected TableInstruction shapes, expected output per query pattern |
| **.specify/specs/001-etl-configurator/spec.md** | Derived spec (user stories, acceptance scenarios) | Planning, tasks, implementation |
| **.specify/platform-data-model.md** | Platform data model (canonical) | Single schema for ETL, Discovery, and all products |
| **.specify/etl-discovery-integration.md** | ETL→Discovery integration contract | Data flow, shared contract; reference when implementing either product |
| **.specify/specs/001-etl-configurator/data-model.md** | ETL target schema (conforms to platform) | API design, validation logic |
| **.specify/memory/constitution.md** | Platform principles | All phases |
| **PRD.md** | Platform index and condensed summaries | Quick reference; links to golden sources |

## Spec-Kit Commands

When running `/speckit.specify` or `/speckit.clarify` for **001 ETL Configurator**:
- **Always reference** `001-ETL-PRD.md` as the source of truth
- Include full PRD context when creating or refining requirements
- Ensure FR-*, GR-*, SC-*, EC-* sections are reflected in the spec
- For **natural language features** (filters, joins): use `nl-interpretation.md`—define semantic taxonomy, example phrasings, interpretation contract (phrase → structured output), and Given/When/Then acceptance scenarios per [Spec-Kit best practices](https://github.com/github/spec-kit)

When running `/speckit.specify` or `/speckit.clarify` for **002 Logistics Discovery**:
- **Always reference** `.specify/specs/002-data-discovery/002-PRD-discovery.md` as the source of truth
- Include ETL→Discovery integration: Simulate Pipeline output feeds Discovery; no separate export in MVP
- Ensure journeys, FRs, and TableInstruction schema (§11) are reflected in the spec
- For **natural language features**: use `nl-interpretation.md`—defines semantic taxonomy, phrase→TableInstruction mapping, acceptance scenarios, and prohibited outputs
- For **data quality issues**: use `data-quality.md`—defines dirty data patterns, normalization rules per layer, field alias mappings, and number/date format handling
- For **prompt changes**: use `prompt-spec.md`—treat the system prompt as a versioned contract; update spec before changing prompt
- For **testing**: use `e2e-scenarios.md`—full pipeline scenarios with concrete data, expected TableInstruction shapes, and expected output
- Set `SPECIFY_FEATURE=002-data-discovery` when working on Discovery

## Feature Context

Set `SPECIFY_FEATURE=001-etl-configurator` when working on ETL in non-Git contexts.
Set `SPECIFY_FEATURE=002-data-discovery` when working on Logistics Discovery.

## Avoiding Context Loss

- Do not condense or omit requirements from the PRD when producing the spec
- Cross-reference: spec.md user stories should trace back to PRD sections (journeys, FRs, guardrails)
- Edge cases (EC-*) and constraints (C-*) in the PRD must be respected in implementation
