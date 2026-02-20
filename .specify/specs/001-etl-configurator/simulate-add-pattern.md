# Simulate Pipeline: Incremental Add Pattern

**Status**: Implemented  
**Product**: 001 ETL Configurator (reusable for other products)  
**Last updated**: 2025-02-20

---

## Overview

The simulate pipeline uses an **incremental add** pattern instead of generating a fixed dataset in one shot. Each button press adds a new batch of data rows, allowing users to scale their test dataset by pressing "Add" multiple times (e.g. 3 presses → 300 quotes).

---

## Design

### Behavior

| Action | Effect |
|--------|--------|
| **Add** | Appends a batch: +100 quotes, +50 loads, +50 drivers+vehicles |
| **Clear** | Resets session data; user can start fresh |
| **Run Pipeline** | Runs the accumulated data through the ETL |

### Batch Sizes (per Add)

| Object | Count | Source |
|--------|-------|--------|
| Quotes | 100 | `dirtyDataGenerator.ts` `QUOTE_COUNT` |
| Loads | 50 | `dirtyDataGenerator.ts` `LOAD_COUNT` |
| Driver+Vehicle | 50 | `dirtyDataGenerator.ts` `DRIVER_VEHICLE_COUNT` |

### Data Flow

1. **Add** calls `POST /api/ingest/generate` for `load`, then `quote` (with new loadIds), then `driver_vehicle` (with new loadRows)
2. Frontend **merges** the new rows with existing `sessionData`:
   - `rows = [...existing.rows, ...new.rows]`
3. Relationships are preserved: each batch is self-contained (quotes reference the loads from that batch; drivers link to those loads)

### Implementation Locations

| Location | Responsibility |
|----------|----------------|
| `backend/src/generators/dirtyDataGenerator.ts` | Exports `QUOTE_COUNT`, `LOAD_COUNT`, `DRIVER_VEHICLE_COUNT`; generates one batch per call |
| `backend/src/api/ingest.ts` | `POST /api/ingest/generate` – no change; returns one batch |
| `frontend/src/pages/ShowOverallData.tsx` | Add button, merge logic, Clear button |
| `frontend/src/components/Ingestion.tsx` | Add sample data / Add more – same merge pattern |

---

## Reuse for Other Products

To adopt this pattern in another product:

1. **Backend**: Use a generator that produces a fixed batch per call. Expose batch sizes (e.g. `QUOTE_COUNT`) if configurable.
2. **API**: Keep `generate` returning a single batch; do not add server-side accumulation.
3. **Frontend**:
   - Maintain `sessionData` (or equivalent) with merge-on-add
   - `handleAdd`: call generate → merge `[...existing, ...new]`
   - Provide **Clear** to reset
   - Display row counts after each add (e.g. "300 quotes · 150 loads · 150 drivers")

4. **Relationships**: When entities reference each other (e.g. quotes → loads), each add batch should be self-contained so joins remain valid.

---

## Rationale

- **Scalability**: Users can grow datasets without hard limits
- **Simplicity**: No backend state; frontend merge is straightforward
- **Consistency**: Same `generate` API for both initial and incremental adds
