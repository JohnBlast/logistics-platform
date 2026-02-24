# 003 – Job Market

**Status**: Implemented
**Branch**: `003-job-market`
**Golden Source PRD**: [003-PRD-job-market.md](003-PRD-job-market.md)

## Overview

A 2-sided marketplace simulation where **Load Posters** generate shipping jobs and **Fleet Operators** bid on work. Fleet Operators manage vehicles and drivers, view a UK map with job locations, and submit quotes aided by a rule-based recommender. Load Posters accept or reject quotes based on scoring metrics.

This product is **unattached** from 001 ETL Configurator and 002 Data Discovery — the only connection is sidebar navigation. It extends the shared platform data model with Job Market–specific fields.

## Implemented Features (summary)

- **Job board & map**: Table and map views (map default); UK map with load pins, vehicle markers, collection/delivery lines; hover tooltips (no click popups); route lines on load-pin hover.
- **Load switcher**: When multiple jobs share the same collection city, a “1 of N at [city]” bar with Previous/Next lets users switch between them (map and table views).
- **Fleet profile**: Editable in Fleet Setup only; company name and rating (0–5) with save.
- **Quote flow**: Submit quote with price/vehicle/driver; recommender range (mid price prominent); optional AI mode for quoting (Algorithmic vs AI toggle); AI-powered Auto-fill (Claude) that selects vehicle, driver, and price with explanation; acceptance/rejection with score breakdown and feedback; quote history with delete confirmation; at least one simulated competing quote per job.
- **Auto-recommend**: "Auto-fill" button recommends best vehicle, driver, and price; in AI mode this calls Claude, locks fields only while generating, shows reasoning, and counts subsequent edits as manual.
- **Competing quotes**: 1-3 simulated quotes per job; ADR-required loads always get ADR-certified competitors.
- **Rich formatting**: ADR badges, quote count pill badges (colour-coded), bold budget formatting, smooth hover transitions, informative empty states.
- **Display names**: UI labels aligned with platform data model (`frontend/src/lib/jobmarket/displayNames.ts`).

## Key Concepts

- **Simulation**: Jobs, vehicles, and drivers are artificially generated — no real data ingestion
- **Map**: Leaflet + OpenStreetMap, UK only, town/city level locations, straight-line distance (Haversine)
- **Quote Recommender**: Rule-based scoring suggests bid prices to Fleet Operators
- **Quote Acceptance**: Scoring metrics determine whether Load Poster accepts a quote

## Source-of-Truth Hierarchy

| Document | Role | Use When |
|----------|------|----------|
| **003-PRD-job-market.md** | Golden source – full product requirements | Running `/speckit.specify`, `/speckit.clarify`, or creating requirements |
| **spec.md** | Derived spec – user stories, acceptance scenarios | Planning and implementation |
| **plan.md** | Technical implementation plan | Tasks, implementation |
| **tasks.md** | Task breakdown | Implementation execution |
| **e2e-scenarios.md** | Simulation + recommender evaluation scenarios | Testing and validation |
| **handoff-checklist.md** | Pre-implementation verification | Before `/speckit.implement` |

## Spec-Kit Workflow

See [../../speckit-toolkit.md](../../speckit-toolkit.md) for when to use each command.

1. **Set feature context:** `SPECIFY_FEATURE=003-job-market`
2. **Constitution:** `.specify/memory/constitution.md` (shared platform principles)
3. **Specify:** [spec.md](spec.md) — user stories, requirements
4. **Clarify:** Resolve underspecified areas
5. **Plan:** [plan.md](plan.md) — technical plan
6. **Tasks:** [tasks.md](tasks.md) — task breakdown
7. **Implement:** `/speckit-implement` to execute tasks

## Data Model

Extends the shared [platform-data-model.md](../../platform-data-model.md) with:
- **Driver**: `has_adr_certification`
- **Vehicle**: `current_city`
- **Quote**: `eta_to_collection`, `offered_vehicle_type`, `adr_certified`
- **Fleet Profile** (new entity): `company_name`, `total_jobs_completed`, `rating`, `driver_count`, `vehicle_count`
