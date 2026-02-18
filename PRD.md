# Product Requirements Document – Logistics Platform

**Spec-Kit Compatible** | [GitHub spec-kit](https://github.com/github/spec-kit)

---

## Golden Sources (Authoritative PRDs)

| # | Product | Golden Source PRD | Spec | Status |
|---|---------|-------------------|------|--------|
| **001** | ETL Configurator | [001-ETL-PRD.md](.specify/specs/001-etl-configurator/001-ETL-PRD.md) | [spec.md](.specify/specs/001-etl-configurator/spec.md) | Spec complete |
| **002** | Data Discovery | — | [placeholder](.specify/specs/002-data-discovery/README.md) | Planned |
| **003** | Job Market | — | [placeholder](.specify/specs/003-job-market/README.md) | Planned |

**When using spec-kit**: Reference the **Golden Source PRD** when running `/speckit.specify`, `/speckit.clarify`, or creating requirements. The spec is derived from the PRD; nothing should be lost in translation.

---

# 001 – ETL Configurator (Summary)

> **Full details**: [001-ETL-PRD.md](.specify/specs/001-etl-configurator/001-ETL-PRD.md) — use this as the source of truth for specifying and validating requirements.

## 1. Overview

**Product Context**: AI-assisted ETL configuration tool enabling non-technical fleet operators to upload raw logistics data (CSV/Excel) and map it to a standardized data model. Uses plain English for joins and filters; before/after previews; validation against unified schema.

**Problem Statement**: Disparate data formats across loads, quotes, drivers, vehicles; manual transformation error-prone; no standardized schema; existing tools assume technical expertise.

**Target Users**: Operations managers or admin staff; Excel-comfortable; no SQL/coding.

**Goals**: Data model awareness; ETL configuration; AI assistance; NL business rules; data ready for downstream; visibility, reactive validation, error suggestions; prototype generates dirty data.

**Out of Scope (MVP)**: Scheduled/automated ETL; multi-file merging; real-time/streaming; multi-tenancy/auth; cross-session AI learning; data model migration; advanced transformations; error notifications; data export; config versioning; collaborative editing; mobile; audit logs; external ETL integration; examples library; LEFT/RIGHT/OUTER joins.

---

## 2. Core User Journeys

### Journey 1: First-time ETL configuration (happy path)
**Actor:** Operations manager or admin staff  
**Goal:** Configure an ETL pipeline so logistics data is transformed and ready for downstream AI applications.

**Steps:** 1) Open platform, select ETL. 2) Land on Configuration Profiles. 3) Create profile (name, description, data model version, AI mode). 4) Enter ETL flow; step indicator shows progress. 5) Ingestion: view data model breakdown; Generate for Quote, Load, Driver+Vehicle. 6) Mapping: review AI suggestions; lock correct; suggest remaining; fix errors. 7) Static Joins: configure Quote→Load, Load→Driver+Vehicle (optional NL). 8) Filtering: define inclusion/exclusion in plain language. 9) Run Pipeline Validation; see summary. 10) If ≥1 row succeeds, Save; config becomes Active.

**Outcome:** ETL configuration Active; data ready for downstream.

### Journey 2: Run pipeline and view processed data
**Steps:** Ensure Active profile exists → Go to Show Overall Data → Generate → Run → View flat table.

### Journey 3: Review the data model before configuring
**Steps:** Go to Data Model Preview page → Review fields per entity.

### Journey 4: Reference data model during ETL
**Steps:** In Mapping/Joins/Filtering → Open data model pop-up → Check fields → Apply info.

### Journey 5: Duplicate an existing configuration
**Steps:** Find profile → Duplicate → Edit new Draft → Validate and save.

### Journey 6: Fix errors using system suggestions
**Steps:** See error → Read suggested fix → Apply or correct → Error clears.

### Journey 7: Prototype—ETL without uploading files
**Steps:** Generate for all three objects only → Complete flow without upload.

### Journey 8: Mixed upload and generate
**Steps:** Upload some files; Generate for others; complete flow.

---

## 3. Functional Requirements

### 3.1 General
- **FR-1.1** The system must provide a sidebar menu to switch between ETL, Data Discovery, and Job Market.
- **FR-1.2** The system must display a step-by-step UI showing progress; indicate errors, warnings, skipped, completed.
- **FR-1.3** The system must validate in real-time; instant feedback.
- **FR-1.4** The system must show before/after previews in Ingestion, Mapping, Joins, Filtering; compact layout.
- **FR-1.5** The system must chain steps; each uses previous output; Ingestion reads raw only.
- **FR-1.6** The system must offer AI Mode and Mocked AI (selectable at Ingestion).
- **FR-1.7** The system must provide at least one default ETL config as template.
- **FR-1.8** The system must store configs; dirty data regenerated, not persisted.
- **FR-1.9** The system must suggest actionable fixes for unmapped fields, invalid enums, join mismatches.

### 3.2 Data Model Preview
- **FR-2.1** Dedicated page for target/latest data model.
- **FR-2.2** Per field: required vs optional, description, format, examples.
- **FR-2.3** Pop-up during ETL steps.

### 3.3 Configuration Profiles
- **FR-3.1** Profiles step precedes ETL flow.
- **FR-3.2** List with name, status (active/draft/archive), description, data model version, last updated.
- **FR-3.3** States: Active, Draft, Archive.
- **FR-3.4** No edit of Active or Archived.
- **FR-3.5** Create, duplicate, delete.
- **FR-3.6** On create: name, description, data model version.
- **FR-3.7** Version selection (V1, V2, …); new use latest; existing may stay on older.
- **FR-3.8** UI to choose Claude or Mocked AI when creating.

### 3.4 Ingestion
- **FR-4.1** Accept three files: Load, Quote, Driver+Vehicle.
- **FR-4.2** Show data model broken down per object.
- **FR-4.3** Generate per object; no upload required for prototype; row counts: Quotes=100, Loads=50, Driver+Vehicle=50.
- **FR-4.4** Follow Dirty Data Generation Strategy.
- **FR-4.5** Upload some and generate others, or generate all.
- **FR-4.6** Require all three objects before advancing to Mapping.
- **FR-4.7** CSV or Excel only.
- **FR-4.8** Max 10 MB per file.

**Dirty Data Strategy – Always clean:** FR-4.4a Quote/Load IDs valid; FR-4.4b created_at, updated_at valid.  
**Light dirty:** FR-4.4c column name variations; FR-4.4d optional nulls; FR-4.4e enum variations; FR-4.4f extra columns; FR-4.4g date format variations.

### 3.5 Mapping
- **FR-5.1** 1:1 mapping; data model source of truth.
- **FR-5.2** UI split by Load, Quote, Driver+Vehicle; required fields, mapping controls, descriptions.
- **FR-5.3** Progress X/Y; collapse/expand.
- **FR-5.4** AI suggestions with confidence; manual/assisted (no NL for mapping).
- **FR-5.5** Lock fields; ask AI to suggest remaining.
- **FR-5.6** All required mapped before advance.
- **FR-5.7** Driver+Vehicle as single mapping surface.

### 3.6 Deduplication
- **FR-6.1** Per entity before joins.
- **FR-6.2** Backend-only; user does not see.
- **FR-6.3** Keep latest by updated_at.
- **FR-6.4** updated_at required for dedup.

### 3.7 Static Joins
- **FR-7.1** Order: Quote → Load → Driver+Vehicle.
- **FR-7.2** Keys: quote.load_id→load.load_id; load.allocated_vehicle_id→vehicle OR load.driver_id→driver (fallback).
- **FR-7.3** User defines joins; vehicle_id or driver_id when one missing.
- **FR-7.4** Join operations: name, definition, description; multiple allowed.
- **FR-7.5** Optional NL for joins; NL for Joins and Filtering only.
- **FR-7.6** INNER JOIN only.
- **FR-7.7** Drop rows when IDs missing or non-matching after joins.

### 3.8 Filtering
- **FR-8.1** After joins on flat table.
- **FR-8.2** Inclusion/exclusion in plain language.
- **FR-8.3** NL rules; AI interprets; NL for Filtering and Joins only.

### 3.9 Pipeline Validation & Summary
- **FR-9.1** Run pipeline test before save.
- **FR-9.2** Validate full config on dirty data.
- **FR-9.3** ≥1 row must succeed for pass.
- **FR-9.4** Show rows successful, dropped, fields with warnings.
- **FR-9.5** Save only when validation passes.
- **FR-9.6** On save: new Active; previous Archived.

### 3.10 Show Overall Data
- **FR-10.1** Separate page within ETL.
- **FR-10.2** Active profile required.
- **FR-10.3** Generate and run pipeline.
- **FR-10.4** Table view of processed flows.
- **FR-10.5** Flat wide table (post-join, post-filter).

### 3.11 Validation & Enum Handling
- **FR-11.1** Invalid enum → warning + null.
- **FR-11.2** Missing Quote/Load/Vehicle/Driver IDs after joins → drop row.

---

## 4. Guardrails

**Profiles:** GR-1.1 No edit Active/Archived; GR-1.2 Duplicate allowed; GR-1.3 Delete TBD; GR-1.4 One Active; GR-1.5 Name required; GR-1.6 Version required.

**Ingestion:** GR-2.1 Block advance without data; GR-2.2 Reject non-CSV/Excel; GR-2.3 Reject >10MB; GR-2.4 Reject parse errors; GR-2.5 Reject empty; GR-2.6 Regenerate replaces.

**Mapping:** GR-3.1 Block advance with unmapped required; GR-3.2 1:1 only; GR-3.3 Data model source of truth; GR-3.4 No duplicate target; GR-3.5 Unmapped optional allowed; GR-3.6 Lock persists.

**Joins:** GR-4.1 Join keys must exist; GR-4.2 INNER only; GR-4.3 Fixed order; GR-4.4 Load needs vehicle or driver; GR-4.5 Drop orphan rows; GR-4.6 No circular joins.

**Filtering:** GR-5.1 Parseable rules; GR-5.2 Warn filter-all; GR-5.3 Flat table only; GR-5.4 Field existence.

**Validation/Save:** GR-6.1 Save blocked on 0 rows; GR-6.2 Run before Save; GR-6.3 Use current config; GR-6.4 Use current data; GR-6.5 ≥1 success; GR-6.6 Warnings don't block.

**Data Integrity:** GR-7.1 Drop rows with missing IDs; GR-7.2 Invalid enum → warn+null; GR-7.3 updated_at for dedup; GR-7.4 Dedup before joins.

**Show Overall Data:** GR-8.1 Active required; GR-8.2 Use Active config; GR-8.3 Generate required.

**AI/NL:** GR-9.1 No NL for Mapping; GR-9.2 NL for Joins/Filters only; GR-9.3 AI failure handling; GR-9.4 Confidence display; GR-9.5 Apply optional.

**General:** GR-10.1 Delete confirm TBD; GR-10.2 Preserve draft; GR-10.3 1280px min; GR-10.4 Dirty data not persisted.

---

## 5. Interaction Model

**Navigation:** Sidebar (ETL, Data Discovery, Job Market); linear ETL steps; backward allowed; step indicator; Show Overall Data separate page.

**Validation:** Real-time; inline errors; actionable suggestions; scope: unmapped fields, invalid enums, join mismatches.

**Before/After:** Ingestion, Mapping, Joins, Filtering; compact; per-step scope; refresh on config change.

**Mapping:** Split by object; X/Y progress; collapse/expand; AI suggestions; lock & regenerate; manual override.

**NL (Joins/Filters):** Text input; submit; loading; success = config shown, editable; failure = error + retry.

**Ingestion:** Upload or Generate per object; proceed gate until all three have data.

**Profile States:** Draft editable; Active/Archived view-only; Duplicate allowed for all.

---

## 6. Data & Domain Concepts

**Domain:** Fleet, Load, Quote, Driver, Vehicle, ETL Pipeline, Data Model, Data Model Version.

**Entities:** Quote (19 fields), Load (20 fields), Driver (8 fields), Vehicle (6 fields). Load needs allocated_vehicle_id or driver_id for join. Vehicle has optional driver_id.

**Join Order:** Quote ──(load_id)──► Load ──(vehicle_id OR driver_id)──► Driver+Vehicle. Result: flat wide row.

**Source:** Quote file, Load file, Driver+Vehicle file (vehicle-centric, one row = vehicle + driver).

**Dedup:** Per entity; latest updated_at; keys: quote_id, load_id, driver_id, vehicle_id.

---

## 7. Success Criteria

- SC-1: Complete ETL without upload
- SC-2: ≥1 row in flat table
- SC-3: Output has columns from all four entities
- SC-4: Data model viewable before and during ETL
- SC-5: AI suggestions; lock & regenerate; error suggestions actionable
- SC-6: NL for joins and filters
- SC-7: Real-time validation; before/after preview
- SC-8: Save blocked on 0 rows; gates enforced
- SC-9: Excel user completes flow without code

---

## 8. Edge Cases & Constraints

### Edge Cases
**Ingestion:** Duplicate columns; encoding; empty file; multi-sheet Excel; inconsistent CSV; generate then upload (last wins); very small dataset.

**Mapping:** No matching column; 1:1 only; optional null; wrong AI suggestion; more required than columns; many columns.

**Joins:** All quotes orphan; all loads missing vehicle/driver; mixed keys; duplicate keys; vehicle no driver; driver in many vehicles.

**Filtering:** Filter drops all; ambiguous NL; field doesn't exist; conflicting rules; empty rule; filter on all-null field.

**Dedup:** Same updated_at tie; null updated_at; bad format.

**Validation:** Config change without re-run; data regen without re-run; 1 row many warnings; browser close (config persists, data lost).

**AI:** Timeout; nonsensical input; Mocked AI wrong; invalid NL output; apply creates new error.

**Show Overall Data:** No Active; zero rows; thousands of rows.

### Constraints (Out of MVP)
No scheduled ETL; multi-file merge; streaming; auth; AI learning; migration; advanced transforms; notifications; export; versioning; collaboration; mobile; audit; external integration; examples library; outer joins.

**Technical:** CSV/Excel; 10MB; 1:1 mapping; INNER only; 1280px min; NL Joins/Filters only; configs persist, dirty data does not.

---

## Spec-Kit Workflow

1. **Constitution:** `.specify/memory/constitution.md`
2. **Golden source (001):** `.specify/specs/001-etl-configurator/001-ETL-PRD.md`
3. **Specify:** Use PRD as context → `.specify/specs/001-etl-configurator/spec.md`
4. **Plan:** `/speckit.plan`
5. **Tasks:** `/speckit.tasks`
6. **Implement:** `/speckit.implement`
