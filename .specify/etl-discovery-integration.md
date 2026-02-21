# ETL → Discovery Integration Contract

**Purpose:** Define how the ETL Configurator (001) and Logistics Discovery (002) work together. No code—documentation only.

---

## Data Flow

```
User (Simulate Pipeline)          ETL Backend                    Discovery
       │                              │                              │
       │  Add data (Quote, Load, DV)  │                              │
       │  Run Pipeline                │                              │
       │ ──────────────────────────►   │                              │
       │                              │  Process with Active profile │
       │                              │  Returns:                    │
       │                              │  - flatRows                  │
       │                              │  - quoteRows                 │
       │                              │  - loadRows                 │
       │                              │  - vehicleDriverRows         │
       │                              │ ──────────────────────────► │
       │                              │                              │  Derive views:
       │                              │                              │  - quotes
       │  Navigate to Discovery       │                              │  - loads
       │ ──────────────────────────────────────────────────────────► │  - loads_and_quotes
       │                              │                              │  Query NL
```

## Contract

| Producer | Consumer | Data |
|----------|----------|------|
| ETL Simulate Pipeline (Run) | Logistics Discovery | `flatRows`, `quoteRows`, `loadRows`, `vehicleDriverRows` |

**Schema:** All conform to `.specify/platform-data-model.md`. Field names: `snake_case`.

**MVP implementation options:**
1. Shared API: Discovery calls same pipeline endpoint or a dedicated "get discovery data" endpoint that returns the last run output.
2. Session/state: Frontend shares pipeline result in React state or context when navigating ETL → Discovery.
3. Backend store: Pipeline run persists output; Discovery fetches it. (Requires persistence layer.)

**Tenant filter:** Discovery applies `associated_fleet_id` for Fleet Operator access. ETL output includes this field on Quote rows.

**Row limits (C-14):** Max 2000 rows in pipeline output (flatRows) and Simulate Add accumulation. Keeps payloads within Render free tier limits.

---

## PRD References

- **ETL:** `001-ETL-PRD.md` FR-10.6, Journey 2
- **Discovery:** `specs/002-data-discovery/002-PRD-discovery.md` §1a, Journey 8, Data Ingestion
- **Platform:** `.specify/platform-data-model.md` (Product Integration section)
