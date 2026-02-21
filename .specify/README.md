# .specify – Platform Specs & Documentation

Spec-Kit compatible specifications and platform documentation.

## Structure

```
.specify/
├── PLATFORM.md              # Spec-Kit index, product navigation
├── platform-data-model.md    # Canonical schema (ETL, Discovery, all products)
├── etl-discovery-integration.md   # ETL→Discovery data flow contract
├── requirements-checklist.md      # Quality checklist (from /speckit.checklist)
├── memory/
│   └── constitution.md       # Platform principles
├── specs/
│   ├── 001-etl-configurator/   # ETL PRD, spec, plan, tasks, data model
│   ├── 002-data-discovery/     # Discovery PRD, spec, nl-interpretation, prompt-spec
│   └── 003-job-market/         # Placeholder
└── toolkit/                   # PM→AI handoff templates (gitignored)
```

## Key Documents

| Document | Purpose |
|----------|---------|
| [PLATFORM.md](PLATFORM.md) | Product index, Spec-Kit workflow |
| [platform-data-model.md](platform-data-model.md) | Single schema source of truth |
| [etl-discovery-integration.md](etl-discovery-integration.md) | How ETL output feeds Discovery |
| [memory/constitution.md](memory/constitution.md) | Platform principles |

## Product PRDs

- **001 ETL Configurator**: [specs/001-etl-configurator/001-ETL-PRD.md](specs/001-etl-configurator/001-ETL-PRD.md)
- **002 Logistics Discovery**: [specs/002-data-discovery/002-PRD-discovery.md](specs/002-data-discovery/002-PRD-discovery.md)
