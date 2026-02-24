# Logistics Platform – Product Specification Index

A portfolio platform for logistics marketplace applications. This repository uses [Spec-Driven Development](https://github.com/github/spec-kit) for structured requirements and implementation.

## Platform Structure

| # | Product | Branch | Status | Description |
|---|---------|--------|--------|-------------|
| **001** | [ETL Configurator](#001-etl-configurator) | `001-etl-configurator` | Spec complete | AI-assisted ETL configuration for fleet operators to transform raw logistics data (CSV/Excel) into a standardized schema |
| **002** | Data Discovery | `002-data-discovery` | Built | Natural language querying of pipeline data; chat interface with Claude |
| **003** | Job Market | `003-job-market` | Specifying | 2-sided marketplace simulation: Load Posters generate jobs, Fleet Operators bid with quotes; rule-based recommender + acceptance scoring; UK map (Leaflet + OSM) |

## Navigation

- **[Constitution](memory/constitution.md)** – Platform-level principles and development guidelines
- **001 ETL Configurator** – [PRD](specs/001-etl-configurator/001-ETL-PRD.md) | [Spec](specs/001-etl-configurator/spec.md) | [Plan](specs/001-etl-configurator/plan.md) | [Tasks](specs/001-etl-configurator/tasks.md) | [Data Model](specs/001-etl-configurator/data-model.md) | [Readme](specs/001-etl-configurator/README.md)
- **002 Data Discovery** – [Placeholder](specs/002-data-discovery/README.md)
- **003 Job Market** – [PRD](specs/003-job-market/003-PRD-job-market.md) | [Spec](specs/003-job-market/spec.md) | [Plan](specs/003-job-market/plan.md) | [Tasks](specs/003-job-market/tasks.md) | [E2E Scenarios](specs/003-job-market/e2e-scenarios.md) | [Handoff Checklist](specs/003-job-market/handoff-checklist.md) | [Readme](specs/003-job-market/README.md)
- **Platform PRD Index** – [PRD.md](../PRD.md)

## Spec-Kit Workflow

**Full guidance:** [speckit-toolkit.md](speckit-toolkit.md) — when to use each command, initiation vs post-implementation.

### Commands (in order for new products)

1. `/speckit-constitution` – Establish or update platform principles
2. `/speckit-specify` – Define requirements and user stories (**reference the feature PRD as context**)
3. `/speckit-clarify` – Resolve underspecified areas (before planning)
4. `/speckit-plan` – Create technical implementation plan
5. `/speckit-tasks` – Generate task breakdown
6. `/speckit-implement` – Execute implementation

**Optional:** `/speckit-analyze` (platform analysis), `/speckit-checklist` (readiness validation)

## Environment

Set `SPECIFY_FEATURE` to the feature directory name when working on a specific feature in non-Git contexts (e.g. `001-etl-configurator`).

## Deployment

001 ETL Configurator is deployed to Render:
- **Frontend** (Static Site): [logistics-platform-demo.onrender.com](https://logistics-platform-demo.onrender.com)
- **Backend** (Web Service): [logistics-platform-ttx9.onrender.com](https://logistics-platform-ttx9.onrender.com)

Full deployment setup: [README.md](../README.md#deployment-render)
