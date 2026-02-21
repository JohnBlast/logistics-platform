# 002 – Logistics Discovery

**Status**: Built  
**Branch**: `002-data-discovery`  
**Golden Source PRD**: [002-PRD-discovery.md](002-PRD-discovery.md)  
**Spec**: [spec.md](spec.md)

## Overview

A web-based LLM interface that allows logistics operators to query their ingested quoting and operational data using natural language. Uses the **LLM-to-Table Expression** pattern: natural language → TableInstruction JSON → client-side query engine → tables and reports.

## ETL → Discovery Integration

Discovery consumes data from the **Simulate Pipeline** (Show Overall Data) page:

1. User adds data (Add button) and runs the pipeline on Simulate Pipeline.
2. Pipeline output: `flatRows`, `quoteRows`, `loadRows`, `vehicleDriverRows` (per platform data model).
3. Discovery loads this output; derives `quotes`, `loads`, `loads_and_quotes` views.
4. No separate export step in MVP. Run Pipeline output = Discovery input.

**Contract:** See [002-PRD-discovery.md](002-PRD-discovery.md) §1a, §11; [platform-data-model.md](../../platform-data-model.md) for schema alignment.

**Clarifications:** [clarifications.md](clarifications.md) — resolved underspecified areas (tenant in prototype, loads derivation, TableFilter schema, etc.).

## Spec-Kit Workflow

When building this product with [Spec-Kit](https://github.com/github/spec-kit):

1. **Set feature context:** `SPECIFY_FEATURE=002-data-discovery`
2. **Constitution:** `.specify/memory/constitution.md` (shared platform principles)
3. **Specify:** ✓ [spec.md](spec.md) — user stories, requirements, TableInstruction reference
4. **Clarify:** ✓ [clarifications.md](clarifications.md) — resolved underspecified areas
5. **Plan:** ✓ [plan.md](plan.md) — Vite, React, same backend monorepo
6. **Tasks:** ✓ [tasks.md](tasks.md) — Task breakdown by phase
7. **Implement:** `/speckit.implement` to execute tasks

Ensure implementation integrates with existing ETL routes and pipeline API (e.g. `/api/pipeline/run` output) so Discovery receives the Simulate Pipeline data.
