# Feature Specification: 001 – ETL Configurator

**Feature Branch**: `001-etl-configurator`
**Created**: 2025-02-17
**Status**: Implemented
**Product**: Logistics Platform – First Product
**Source of Truth**: [001-ETL-PRD.md](001-ETL-PRD.md) — full product requirements; reference when specifying, clarifying, or validating.

---

## Overview

### Product Context

An AI-assisted ETL configuration tool that enables non-technical fleet operators to upload their raw logistics data (CSV/Excel) and map it to a standardized data model. The tool guides users through data ingestion, intelligent column mapping, multi-source data joining, and filtering—all using plain English where complex configuration is needed. Each step provides before/after data previews and validation against a unified logistics schema to power downstream AI applications.

### Problem Statement

Fleet operators in the logistics marketplace operate with disparate data formats across loads, quotes, drivers, and vehicles. Each fleet company maintains their own spreadsheets and systems, making it nearly impossible to aggregate data for AI-powered applications like route optimization, demand forecasting, or pricing intelligence.

### Target Users

Operations managers or admin staff at fleet companies who are comfortable with Excel but have no coding or database experience. They need to configure data pipelines to participate in the platform's AI marketplace applications.

### Goals (MVP)

- Users are aware of the required data model they need to map to
- Users can configure their ETL to align to the platform's data model
- Users can leverage AI to help configure the ETL
- Users can create business rules via natural language
- Users' data are transformed and ready for downstream application
- ETL configuration gives visibility on steps, reactive validation, error suggestions, and before/after transforms
- Prototype generates dirty data so no upload is required

---

## Clarifications

*Resolved underspecified areas (from PRD comparison and spec-kit clarify workflow).*

| # | Area | PRD Ref | Question | Resolution |
|---|------|---------|----------|------------|
| C-1 | Delete last profile | GR-1.3, EC-7.1 | May we delete the last profile or default template? | **Block delete** of the last remaining profile. Allow delete of default template only if another profile exists. Duplicate and Create always allowed. |
| C-2 | Delete confirmation | GR-10.1 | Require confirmation before Delete profile? | **Yes.** Show confirmation modal (e.g., "Delete profile X? This cannot be undone.") with Cancel/Delete. Duplicate and Create need not confirm. |
| C-3 | Rows missing updated_at | GR-7.3, EC-5.2 | How to handle rows with null or invalid updated_at for dedup? | **Exclude** from deduplication; do not drop. Warn in validation summary. If no valid updated_at for an entity, keep first row by ingestion order. |
| C-4 | Same updated_at tie-break | EC-5.1 | When two rows have same ID and same updated_at, which to keep? | **Keep first** by row order (as ingested). |
| C-5 | Excel multiple sheets | EC-1.4 | How to handle Excel files with multiple sheets? | **Use first sheet only** in MVP. No sheet selector. |
| C-6 | Profile name duplicate | EC-7.3 | Allow duplicate profile names? | **Allow.** No unique constraint on name. No warning. |
| C-7 | Before/after preview layout | FR-1.4, Interaction Model | Side-by-side, tabbed, or collapsible? | **Collapsible panels** with limited rows (5–10). Compact; avoid long scrolling. |
| C-8 | Validation summary layout | FR-9.4 | Table or summary view? | **Summary view** with counts (rows successful, dropped, fields with warnings). Optional expandable table for details. |
| C-9 | On save – user location | Interaction Model | Return to profile list or stay on current view? | **Stay on current view** (Validation step). Show success toast/banner. User can navigate away manually. |
| C-10 | Data model pop-up scope | Interaction Model | Filter by step or show full model? | **Show full model** in MVP. Step-specific filtering deferred. |
| C-11 | Filter rule order | EC-4.4 | Conflicting rules (include X, exclude X) – which wins? | **Apply in defined order:** inclusion rules first, then exclusion. Last rule in each category wins for overlapping conditions. |
| C-12 | Journey 8 – Mixed upload/generate | PRD Journey 8 | Explicit user story for "upload some, generate others"? | **Add** as User Story 7 (P2): Mixed Upload and Generate. |
| C-13 | Journey 3 – Review data model before ETL | PRD Journey 3 | Dedicated story for Data Model Preview page (before starting)? | **Add** as User Story 8 (P2): Review Data Model Before Configuring. |

---

## User Scenarios & Testing

### User Story 1 – First-Time ETL Configuration (P1)

A user configures an ETL pipeline end-to-end so logistics data is transformed and ready for downstream AI applications.

**Why this priority**: Primary value of the product.

**Independent Test**: Create profile → generate data → map → enum mapping (optional) → join → filter → validate → save. No file upload. Config becomes Active.

**Acceptance Scenarios**:

1. **Given** a new Draft profile, **When** user generates data for Quote, Load, Driver+Vehicle, **Then** before/after preview appears and "Next" enables
2. **Given** data in Ingestion, **When** user completes mapping for all required fields, **Then** AI suggestions with confidence scores appear; user can lock and "Suggest remaining"
3. **Given** mapped data, **When** user reaches Enum Mapping step, **Then** user can map source enum values to target schema values per field; AI can suggest; step is skippable
4. **Given** data after enum mapping (or skip), **When** user configures joins (Quote→Load, Load→Driver+Vehicle), **Then** join operations accept vehicle_id or driver_id fallback
5. **Given** joined data, **When** user adds filter rules in natural language, **Then** AI interprets and applies; before/after shows row count change
6. **Given** full config, **When** user runs validation and ≥1 row succeeds, **Then** Save enables; new config becomes Active, previous Active becomes Archived; summary shows rows included, rows dropped, Included/Excluded tabs for detail

---

### User Story 2 – Run Pipeline and View Processed Data (P1)

A user generates fresh data and runs it through the pipeline to see the resulting dataset.

**Independent Test**: Navigate to Show Overall Data → generate → run → see flat table.

**Acceptance Scenarios**:

1. **Given** at least one Active profile, **When** user goes to Show Overall Data page, **Then** page loads; user can generate and run
2. **Given** generated data and run complete, **When** pipeline executes, **Then** flat wide table displays joined Quote, Load, Driver, Vehicle columns

---

### User Story 3 – Fix Errors Using System Suggestions (P1)

A user resolves configuration errors with actionable guidance from the system.

**Acceptance Scenarios**:

1. **Given** unmapped required field, **When** error appears, **Then** system suggests fix (e.g., "Suggest mapping source column 'Quote ID' → quote_id") with Apply button
2. **Given** invalid enum value, **When** error appears, **Then** system suggests valid enum; user applies or corrects
3. **Given** join key mismatch, **When** error appears, **Then** system suggests correction; validation re-runs on apply

---

### User Story 4 – Prototype Without Uploading Files (P1)

A user completes full ETL using only generated dirty data.

**Acceptance Scenarios**:

1. **Given** Draft profile, **When** user clicks Generate for Quote, Load, Driver+Vehicle, **Then** all three have data; user proceeds without any upload
2. **Given** generated data, **When** user completes mapping, enum mapping (optional), joins, filters, **Then** validation passes with ≥1 row; user can Save

---

### User Story 5 – Reference Data Model During ETL (P2)

A user looks up field definitions while configuring mapping, joins, or filters.

**Acceptance Scenarios**:

1. **Given** user is in Mapping, Enum Mapping, Joins, or Filtering, **When** user opens data model pop-up, **Then** sees required/optional, description, format, examples per field
2. **Given** pop-up open, **When** user dismisses, **Then** returns to step; config unchanged

---

### User Story 6 – Duplicate Existing Configuration (P2)

A user creates a new ETL configuration based on an existing one.

**Acceptance Scenarios**:

1. **Given** Active, Draft, or Archived profile, **When** user clicks Duplicate, **Then** new Draft created with copied config
2. **Given** duplicated Draft, **When** user edits and saves, **Then** source profile unchanged; new becomes Active if validation passes

---

### User Story 7 – Mixed Upload and Generate (P2)

A user uses uploaded files for some objects and generated data for others (e.g., real Quote + Load files, generated Driver+Vehicle).

**Acceptance Scenarios**:

1. **Given** Draft profile, **When** user uploads Quote file and Load file, **Then** both show data; user can click Generate for Driver+Vehicle
2. **Given** mixed data (upload + generate), **When** user proceeds through Mapping, Joins, Filtering, **Then** pipeline runs on combined data; validation passes if ≥1 row succeeds
3. **Given** any combination of upload vs generate per object, **When** all three have data, **Then** "Next" to Mapping enables; no requirement to upload all or generate all

---

### User Story 8 – Review Data Model Before Configuring (P2)

A user understands the target data model and mapping requirements before starting ETL.

**Acceptance Scenarios**:

1. **Given** user on ETL area, **When** user navigates to Data Model Preview page, **Then** sees all entities (Quote, Load, Driver, Vehicle) with fields, required/optional, description, format, examples
2. **Given** Data Model Preview open, **When** user has not started a profile, **Then** can navigate to Configuration Profiles or Ingestion to begin
3. **Given** user reviews data model, **When** user starts ETL, **Then** knows what columns they need and how they should be structured

---

### Edge Cases

**Joins**

- All Quote load_ids have no match in Loads → 0 rows; Save blocked (GR-4.5)
- All Load rows missing vehicle_id and driver_id → 0 rows; Save blocked (GR-4.4)
- Duplicate join keys (two quotes per load) → INNER JOIN produces multiple rows; accept (EC-3.4)
- Vehicle has no driver_id; Load joins on vehicle_id only → Row joins; Driver fields null; accept (EC-3.6)

**Filtering**

- Filter rule drops all rows → Warning; Save blocked (GR-5.2, GR-6.1)
- Conflicting rules (include X, exclude X) → Apply inclusion first, then exclusion; last wins (C-11)
- Filter references non-existent field → Reject rule; show error (GR-5.4)

**Ingestion**

- File with duplicate columns, encoding issues, or >10MB → Reject with clear message (GR-2.2, GR-2.3, GR-2.4)
- Excel with multiple sheets → Use first sheet only (C-5)
- Generate then upload for same object → Last action wins; full replace (GR-2.6)
- Empty file (headers only) → Reject or warn; treat as no data (GR-2.5)

**Mapping**

- No source column matching required field → Block advance; user must map manually or use AI (EC-2.1)
- Source has hundreds of columns → Mapping dropdown needs search/filter; pagination or virtualisation (EC-2.6)

**Validation & Save**

- Validation run, user changes config → Save disabled until re-run (GR-6.3)
- Validation run, user regenerates data → Save disabled; must re-run (GR-6.4)
- User closes browser mid-Draft → Config persists; dirty data lost; must regenerate (GR-10.2)
- User deletes last profile → Block (C-1)

**AI & Dedup**

- AI times out → Error; allow retry; do not apply partial output (GR-9.3)
- Rows missing updated_at → Exclude from dedup; warn in summary (C-3)
- Same ID, same updated_at → Keep first by row order (C-4)

---

## Requirements

### Functional Requirements

**General**

- FR-1.1: System MUST provide sidebar to switch between ETL, Data Discovery, Job Market
- FR-1.2: System MUST display step indicator with progress, errors, warnings, completed
- FR-1.3: System MUST validate in real-time; instant feedback
- FR-1.4: System MUST show before/after preview in Ingestion, Mapping, Joins, Filtering (compact layout)
- FR-1.5: System MUST chain steps; each uses previous output; Ingestion reads raw only
- FR-1.6: System MUST offer Claude and Mocked AI (selectable at profile creation; applies to Mapping, Enum Mapping, Joins, Filtering)
- FR-1.7: System MUST provide at least one default ETL config as template
- FR-1.8: System MUST store configs; dirty data regenerated, not persisted
- FR-1.9: System MUST suggest actionable fixes for unmapped fields, invalid enums, join mismatches

**Data Model Preview**

- FR-2.1: System MUST provide dedicated data model page
- FR-2.2: System MUST display per field: required/optional, description, format, examples
- FR-2.3: System MUST allow data model pop-up during ETL steps

**Configuration Profiles**

- FR-3.1 through FR-3.8: Profiles list, states (active/draft/archive), create/duplicate/delete, name/version/AI mode required

**Ingestion**

- FR-4.1 through FR-4.8: Three files (Load, Quote, Driver+Vehicle); Generate per object; Dirty Data Strategy (FR-4.4a–g); CSV/Excel only; 10MB max

**Mapping**

- FR-5.1 through FR-5.7: 1:1 mapping; UI by object; progress; AI suggestions; lock & regenerate; required fields before advance

**Deduplication**

- FR-6.1 through FR-6.4: Per entity before joins; backend-only; latest updated_at; updated_at required

**Static Joins**

- FR-7.1 through FR-7.7: Order Quote→Load→Driver+Vehicle; join keys with fallback; INNER only; drop rows with missing IDs

**Filtering**

- FR-8.1 through FR-8.3: After joins on flat table; natural language inclusion/exclusion

**Validation & Save**

- FR-5a.1 through FR-5a.6: Enum Mapping step; map source→target enum values; AI suggest; skippable
- FR-9.1 through FR-9.6: Run test before save; ≥1 row required; summary UI (rows included, dropped; Included/Excluded tabs); Save only when pass; Active/Archived on save

**Show Overall Data**

- FR-10.1 through FR-10.5: Separate page; Active required; generate & run; flat table view

**Validation & Enum Handling**

- FR-11.1: Invalid enum → warning + null
- FR-11.2: Missing IDs after joins → drop row

### Guardrails

- **GR-1.x**: No edit Active/Archived; one Active; name/version required. Block delete of last profile (C-1).
- **GR-2.x**: Block advance without data; reject bad format/size/parse; regenerate replaces.
- **GR-3.x**: Block advance with unmapped required; 1:1; no duplicate target; lock persists.
- **GR-4.x**: Join keys exist; INNER only; fixed order; drop orphan rows; no circular joins.
- **GR-5.x**: Parseable filter rules; warn filter-all; scope flat table only; field existence.
- **GR-6.x**: Save blocked on 0 rows; run before Save; use current config/data; warnings don't block.
- **GR-7.x**: Drop missing IDs; invalid enum → warn + null; dedup before joins; updated_at handling (C-3).
- **GR-8.x**: Active required for Show Overall Data; use Active config only; generate required.
- **GR-9.x**: No NL for Mapping; NL for Joins/Filters only; AI failure handling; apply optional.
- **GR-10.x**: Delete confirmation (C-2); preserve draft; 1280px min; dirty data not persisted.

### Key Entities

- **Quote, Load, Driver, Vehicle** – Target schema entities (see data-model.md)
- **Configuration Profile** – Saved ETL config: mappings, joins, filters
- **Field Mapping** – source_column → target_field (1:1)
- **Join Operation** – left/right, keys, fallbacks
- **Filter Rule** – inclusion/exclusion (natural language)
- **Flat Table** – Output: Quote+Load+Driver+Vehicle per row

---

## Success Criteria

- SC-1: User completes full ETL without upload (generate only)
- SC-2: ≥1 row in flat table after pipeline
- SC-3: Output has columns from all four entities
- SC-4: Data model viewable before and during ETL
- SC-5: AI mapping suggestions with confidence; lock & regenerate
- SC-6: Error suggestions actionable (one-click apply)
- SC-7: NL for joins and filters; AI interprets
- SC-8: Real-time validation; before/after preview
- SC-9: Save blocked on 0 rows; gates enforced
- SC-10: Excel user completes flow without code

---

## Out of Scope (MVP)

- Scheduled/automated ETL; multi-file merging; real-time/streaming
- Multi-tenancy/auth; cross-session AI learning; data model migration
- Advanced transformations; error notifications; data export
- Config versioning/rollback; collaborative editing; mobile
- Audit logs; external ETL integration; examples library
- LEFT/RIGHT/OUTER joins

---

## Constraints

- **File**: CSV/Excel only; 10MB max
- **Mapping**: 1:1 only; no concatenation, splitting, or derived fields
- **Joins**: INNER only; fixed order Quote → Load → Driver+Vehicle
- **Generated data**: Quotes = 100, Loads = 50, Driver+Vehicle = 50 (FR-4.3)
- **Viewport**: 1280px min; desktop-only
- **User**: Single user; no auth
- **Persistence**: Configs persist; dirty data does not

---

## Supporting Documents

- [001-ETL-PRD.md](001-ETL-PRD.md) – Golden source; full product requirements
- [Data Model](data-model.md) – Target schema, entities, relationships
