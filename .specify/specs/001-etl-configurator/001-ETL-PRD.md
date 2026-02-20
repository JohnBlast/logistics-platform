# ETL Configurator for Logistics Platform — Product Requirements Document

## Overview

### Product Context

An AI-assisted ETL configuration tool that enables non-technical fleet operators to upload their raw logistics data (CSV/Excel) and map it to a standardized data model. The tool guides users through data ingestion, intelligent column mapping, multi-source data joining, and filtering—all using plain English instructions where complex configuration is needed. Each step provides before/after data previews and validation against a unified logistics data schema to power downstream AI applications.

### Problem Statement

Fleet operators in the logistics marketplace operate with disparate data formats across loads, quotes, drivers, and vehicles. Each fleet company maintains their own spreadsheets and systems, making it nearly impossible to aggregate data for AI-powered applications like route optimization, demand forecasting, or pricing intelligence.

**Current Pain Points:**

- Fleet operators lack technical skills (SQL, ETL tools) to transform their data
- Manual data cleaning and mapping is error-prone and time-consuming
- No standardized schema means each integration is bespoke and expensive
- Existing ETL tools assume technical expertise with join keys, data types, and transformations
- Data model updates require complete reconfiguration

### Goals (MVP)

**Primary Goal**

- Users are aware of the required data model they need to map to.
- Users are able to configure their ETL to align to the platform's data model.
- Users are able to leverage AI to help them configure the ETL.
- Users are able to create their business rules via natural language.
- Users' data are transformed and ready for downstream application.
- The ETL Configuration constantly gives the user visibility on upcoming ETL steps, reactive to the user's configuration, shows errors and presents solutions, and shows how the data is transformed before and after each step.
- For the portfolio's prototype, the platform automatically generates dirty data so that there's no need for the user to upload any data.

### Out of Scope (MVP)

- **Scheduled/Automated ETL Runs** — Users manually trigger ETL; no cron jobs or event-driven pipelines
- **Multi-File Merging** — One file per data category (no combining January + February Loads)
- **Real-Time/Streaming Data** — Batch uploads only
- **Multi-Tenancy & User Authentication** — Single-user prototype; no login or access control
- **Cross-Session AI Learning** — AI does not learn from user corrections across different sessions
- **Data Model Migration Tools** — When v2.1 releases, users manually create new configs (no auto-migration)
- **Advanced Transformations** — Complex business logic (e.g., "Calculate profit margin from quoted_price and cost_base") requires custom code
- **Error Notifications/Alerting** — No email/Slack notifications for failed ETL runs
- **Data Export** — Transformed data stays in system; no CSV/Excel export (feeds downstream apps only)
- **Rollback/Versioning of Configs** — Cannot revert to previous config version
- **Collaborative Editing** — One user per config; no real-time collaboration
- **Mobile App** — Desktop-only (minimum 1280px width)
- **Audit Logs** — No detailed change history or compliance logging
- **Integration with External ETL Tools** — Standalone tool; no Airflow/dbt/Fivetran integration
- **Plain English Examples Library** — No pre-built library of common filter/transform examples users can click to insert
- **LEFT/RIGHT/OUTER Joins** — Only INNER JOIN supported in MVP

---

## 1. Target Users

Operations managers or admin staff at fleet companies who are comfortable with Excel but have no coding or database experience. They need to configure data pipelines to participate in the platform's AI marketplace applications.

---

## 2. Core User Journeys

### Journey 1: First-time ETL configuration (happy path)

**Actor:** Operations manager or admin staff (non-technical, familiar with Excel)

**Goal:** Configure an ETL pipeline so logistics data is transformed and ready for downstream AI applications.

**Steps:**

1. Open the platform and select **ETL** from the sidebar.
2. Land on **Configuration Profiles**; see the default template and list of existing profiles.
3. Click **Create** to start a new profile; enter name, description, select data model version (V1, V2, …), and choose AI mode (Claude or Mocked AI).
4. Enter the ETL flow; the step indicator shows progress (Configuration Profiles → Ingestion → Mapping → Enum Mapping → Joins → Filtering → Validation).
5. On **Ingestion**, view the target data model broken down per object (Load, Quote, Driver+Vehicle).
6. Click **Generate** for each data object (Quote, Load, Driver+Vehicle); see before/after preview.
7. Proceed to **Mapping** once all three objects have data.
8. Review AI mapping suggestions with confidence scores; lock correct mappings, ask AI to suggest remaining; correct any errors using suggested fixes.
9. Proceed to **Enum Mapping**; map source enum values (e.g. status, vehicle_type) to target schema values per field; AI can suggest mappings; step is skippable.
10. Proceed to **Static Joins**; configure join operations (Quote→Load, Load→Driver+Vehicle), optionally using natural language.
11. Proceed to **Filtering**; define inclusion/exclusion rules in plain language; see before/after preview.
12. Run **Pipeline Validation**; see summary (rows successful, dropped, fields with warnings).
13. If at least one row succeeds, click **Save**; the config becomes Active, the previous Active becomes Archived.

**Outcome:** ETL configuration is Active; data is transformed and ready for downstream use.

---

### Journey 2: Run pipeline and view processed data

**Actor:** Operations manager or admin staff

**Goal:** Generate fresh data and run it through the pipeline to see the resulting dataset.

**Steps:**

1. Open the platform and select **ETL** from the sidebar.
2. Ensure at least one **Active** ETL profile exists.
3. Go to **Show Overall Data & Simulate Pipeline** (separate page within ETL).
4. Click **Generate** to create dirty data for all three objects.
5. Run the data through the pipeline.
6. View the processed data in a table view as one flat wide table (post-join, post-filter).

**Outcome:** User sees the population of processed data flows and can verify the pipeline output.

---

### Journey 3: Review the data model before configuring

**Actor:** Operations manager or admin staff

**Goal:** Understand the target data model and mapping requirements before starting ETL.

**Steps:**

1. Open the platform and select **ETL** from the sidebar.
2. Go to the **Data Model Preview** page.
3. Review fields per entity (Quote, Load, Driver, Vehicle): required vs optional, description, format, examples.
4. Optionally return to Configuration Profiles or Ingestion to start ETL.

**Outcome:** User knows what data they need and how it should be structured.

---

### Journey 4: Reference data model during ETL

**Actor:** Operations manager or admin staff

**Goal:** Look up field definitions while configuring mapping, joins, or filters.

**Steps:**

1. Be in an ETL step (Mapping, Joins, or Filtering).
2. Open the data model **pop-up** from the in-step reference.
3. Check required fields, descriptions, formats, and examples.
4. Apply this information to mapping, joins, or filters.
5. Close the pop-up and continue configuring.

**Outcome:** User makes correct configuration decisions using the data model as reference.

---

### Journey 5: Duplicate an existing configuration

**Actor:** Operations manager or admin staff

**Goal:** Create a new ETL configuration based on an existing one (e.g., new data model version or test variant).

**Steps:**

1. Open the platform and select **ETL** from the sidebar.
2. On **Configuration Profiles**, find the profile to copy (Active, Draft, or Archived).
3. Click **Duplicate**.
4. Enter a new name and description; optionally change data model version or AI mode.
5. Edit the new profile (it is Draft); adjust mapping, joins, or filters as needed.
6. Run validation and save when at least one row succeeds.

**Outcome:** New profile is created with a copy of the original configuration; user can modify without affecting the source profile.

---

### Journey 6: Fix errors using system suggestions

**Actor:** Operations manager or admin staff

**Goal:** Resolve configuration errors with guidance from the system.

**Steps:**

1. Be in an ETL step; real-time validation highlights errors (unmapped fields, invalid enums, join key mismatches).
2. See the system's suggested fix (e.g., "Required field X is unmapped. Suggest mapping source column 'Quote ID' → quote_id").
3. Apply the suggestion (e.g., map the suggested column or fix the enum value).
4. Get instant feedback; error clears when configuration is corrected.
5. Repeat for any remaining errors until the step is valid.

**Outcome:** User fixes errors with minimal guesswork; configuration moves toward completion.

---

### Journey 7: Prototype—ETL without uploading files

**Actor:** Operations manager or admin staff (evaluating or demoing the platform)

**Goal:** Complete a full ETL flow using only generated dirty data, with no file uploads.

**Steps:**

1. Open the platform and select **ETL** from the sidebar.
2. Create or select a Draft profile.
3. On **Ingestion**, click **Generate** for Quote; click **Generate** for Load; click **Generate** for Driver+Vehicle.
4. Do not upload any files.
5. Proceed through Mapping, Joins, Filtering, and Validation using the generated data.
6. Save when validation passes.

**Outcome:** User demonstrates or evaluates the full ETL flow without preparing or uploading real files.

---

### Journey 8: Mixed upload and generate

**Actor:** Operations manager or admin staff

**Goal:** Use uploaded files for some objects and generated data for others.

**Steps:**

1. Open the platform and select **ETL** from the sidebar.
2. Create or select a Draft profile.
3. On **Ingestion**: upload a Quote file; upload a Load file; click **Generate** for Driver+Vehicle (or any other combination).
4. Proceed through Mapping, Joins, Filtering, and Validation.
5. Save when validation passes.

**Outcome:** User combines real data with generated data for a flexible ETL setup.

---

## 3. Functional Requirements

### 1. General

| ID | Requirement |
|----|-------------|
| FR-1.1 | The system must provide a sidebar menu to switch between ETL, Data Discovery, and Job Market. |
| FR-1.2 | The system must display a step-by-step UI showing the user's progress through ETL setup and indicate errors, warnings, skipped, and completed steps. |
| FR-1.3 | The system must validate in real-time as the user configures and provide instant feedback on incorrect or missing configuration. |
| FR-1.4 | The system must show before/after data previews during user-facing steps (Ingestion, Mapping, Joins, Filtering), with a layout that keeps the screen compact and avoids excessive scrolling. |
| FR-1.5 | The system must chain data so each step uses the output of the previous step as input; Ingestion must be the only step that reads raw source data. |
| FR-1.6 | The system must offer two modes—AI Mode (Claude) and Mocked AI—selectable at profile creation; applies to Mapping, Enum Mapping, Joins, and Filtering; Mocked AI may produce errors the user must correct. |
| FR-1.7 | The system must provide at least one ETL configuration by default as a template (conforming to the data model); the user must generate data and run the pipeline. |
| FR-1.8 | The system must store previous ETL configurations; dirty data must be regenerated (not persisted), and the user must be able to generate new dirty data at any time. |
| FR-1.9 | The system must suggest actionable fixes when errors occur (e.g., "Required field X is unmapped. Suggest mapping source column 'Quote ID' → quote_id"); this must apply to unmapped required fields, invalid enum values, and join key mismatches (IDs that don't match). |

### 2. Data Model Preview

| ID | Requirement |
|----|-------------|
| FR-2.1 | The system must provide a dedicated page for the target/latest data model. |
| FR-2.2 | The system must display per field: required vs optional, description, format, and examples. |
| FR-2.3 | The system must allow the user to open the data model in a pop-up during ETL steps. |

### 3. Configuration Profiles

| ID | Requirement |
|----|-------------|
| FR-3.1 | The system must present the configuration profiles step before the ETL flow. |
| FR-3.2 | The system must list historical and implemented ETL configurations with: name, status (active, draft, archive), description, data model version, and last updated. |
| FR-3.3 | The system must support profile states: Active (current live config), Draft (in progress), Archive (superseded). |
| FR-3.4 | The system must prevent users from editing profiles that are Active or Archived. |
| FR-3.5 | The system must allow users to create, duplicate, or delete an ETL profile. |
| FR-3.6 | The system must prompt the user for name, description, and target data model version when creating a profile. |
| FR-3.7 | The system must let the user select data model version (V1, V2, etc.); new profiles must use the latest version; existing profiles may remain on older versions. |
| FR-3.8 | The system must provide, for the prototype, a UI to choose Claude AI or Mocked AI when creating a profile. |

### 4. Ingestion

| ID | Requirement |
|----|-------------|
| FR-4.1 | The system must accept three files: Load, Quote, and Driver+Vehicle. |
| FR-4.2 | The system must show the target data model broken down per data object (Load, Quote, Driver+Vehicle). |
| FR-4.3 | The system must allow the user to click "Generate" per data object to create dirty data; for the prototype, the user must be able to complete full ETL using generated data only, without uploading; row counts must be: Quotes = 100, Loads = 50, Driver+Vehicle = 50. |
| FR-4.4 | The system must follow the Dirty Data Generation Strategy (see below) when generating data. |
| FR-4.5 | The system must allow the user to upload some files and generate dirty data for others, or generate for all three without uploading. |
| FR-4.6 | The system must require the user to upload or generate data for all three objects before advancing to Mapping. |
| FR-4.7 | The system must accept CSV or Excel only. |
| FR-4.8 | The system must enforce a maximum file size of 10 MB per file (prototype). |

#### 4a. Dirty Data Generation Strategy

**Always clean (never dirty):**

| ID | Requirement |
|----|-------------|
| FR-4.4a | The system must ensure Quote IDs and Load IDs are always valid and available in generated data; these must never be missing or malformed. |
| FR-4.4b | The system must ensure created_at and updated_at are always valid and available across all data objects (Quote, Load, Driver, Vehicle) in generated data. |

**Light dirty data (intentional variations to exercise ETL):**

| ID | Requirement |
|----|-------------|
| FR-4.4c | The system must generate column names that are similar but different from the target schema (e.g., "Quote Ref" vs quote_id, "Quoted Amount" vs quoted_price, "Load Number" vs load_id) to require mapping. |
| FR-4.4d | The system may include occasional nulls in optional fields (e.g., distance_km, collection_city) to exercise optional-field handling. |
| FR-4.4e | The system may include minor enum variations (e.g., wrong case "DRAFT" vs "draft", trailing spaces) in a small subset of rows to exercise enum validation and error suggestions. |
| FR-4.4f | The system may include extra columns that do not map to the data model (e.g., "Notes", "Internal Ref") to simulate real-world spreadsheets with surplus columns. |
| FR-4.4g | The system may include minor date/time format variations (e.g., DD/MM/YYYY vs YYYY-MM-DD) in a small subset to exercise format handling. |

### 5. Mapping

| ID | Requirement |
|----|-------------|
| FR-5.1 | The system must enforce 1:1 mapping with the data model as the source of truth. |
| FR-5.2 | The system must split the UI by data object (Load, Quote, Driver+Vehicle), showing required fields, mapping controls, and field descriptions. |
| FR-5.3 | The system must show progress per data object (X/Y mapped) and support collapse/expand. |
| FR-5.4 | The system must provide AI or Mocked AI mapping suggestions with confidence scores per field; mapping must be manual/assisted (no natural language for mapping). |
| FR-5.5 | The system must allow the user to lock fields and ask AI to suggest mappings for remaining fields. |
| FR-5.6 | The system must require all required fields to be mapped before advancing to the next step. |
| FR-5.7 | The system must treat Driver+Vehicle as a single mapping surface in the UI. |

### 5a. Enum Mapping

| ID | Requirement |
|----|-------------|
| FR-5a.1 | The system must provide an Enum Mapping step after Mapping, before Joins. |
| FR-5a.2 | The system must allow the user to map source enum values to target schema enum values per entity and field (e.g. status, vehicle_type, requested_vehicle_type). |
| FR-5a.3 | The system must support AI-suggested enum mappings (Claude or Mocked AI) for source values to valid target values. |
| FR-5a.4 | The system must apply enum mappings before joins; unmapped source values become null at validation (per FR-11.1). |
| FR-5a.5 | The system must persist enum mappings with the profile. |
| FR-5a.6 | The system must allow the user to skip the Enum Mapping step. |

### 6. Deduplication

| ID | Requirement |
|----|-------------|
| FR-6.1 | The system must run deduplication per entity (Quote, Load, Driver, Vehicle) before any joins. |
| FR-6.2 | The system must run deduplication as a backend-only step; the user must not configure or see it. |
| FR-6.3 | The system must use unique identifiers per entity for deduplication and keep the row with the latest updated_at, overwriting older rows with newer data. |
| FR-6.4 | The system must require updated_at and use it for deduplication ordering. |

### 7. Static Joins

| ID | Requirement |
|----|-------------|
| FR-7.1 | The system must join in order: Quote → Load → Driver+Vehicle. |
| FR-7.2 | The system must support join keys: Quote.load_id → Load.load_id; Load.allocated_vehicle_id → Vehicle.vehicle_id OR Load.driver_id → Driver.driver_id (user configures fallback). |
| FR-7.3 | The system must allow Load to join to Driver+Vehicle via vehicle_id or driver_id; the user must be able to define join operations so that when one key is missing, the other can be used. |
| FR-7.4 | The system must allow the user to define join operations with: name, join definition, and description; multiple join operations must be supported. |
| FR-7.5 | The system must offer optional natural language input to define joins (AI-assisted); natural language must be supported for Joins and Filtering only, not Mapping. |
| FR-7.6 | The system must support INNER JOIN only in MVP. |
| FR-7.7 | The system must drop rows only after joins when required IDs are missing or do not match. |

### 8. Filtering

| ID | Requirement |
|----|-------------|
| FR-8.1 | The system must apply filtering after joins, on the flat wide table. |
| FR-8.2 | The system must allow the user to define inclusion and exclusion criteria in plain language (AI-assisted). |
| FR-8.3 | The system must allow the user to create filter rules via natural language; AI must interpret and apply them; natural language must be supported for Filtering and Joins only, not Mapping. |
| FR-8.4 | The system must interpret NL filter phrases according to the semantic taxonomy and interpretation contract defined in `nl-interpretation.md`; example phrasings therein (e.g. "remove London loads", "loads with capacity_kg and more than 1000kg") must produce correct structured rules. |

### 9. Pipeline Validation & Summary

| ID | Requirement |
|----|-------------|
| FR-9.1 | The system must require the user to run a pipeline test before saving the ETL configuration. |
| FR-9.2 | The system must run validation against the full configuration using the dirty data. |
| FR-9.3 | The system must require at least one row to successfully complete the full pipeline (after joins and filtering) for validation to pass. |
| FR-9.4 | The system must show in the UI: rows successful (included), rows dropped (by dedup, joins, or filters), and fields with warnings or nulls; optionally an Included/Excluded tabbed view; and the ability to view data as Flat, Quote, Load, or Vehicle+Driver. |
| FR-9.5 | The system must allow the user to save the ETL configuration only when validation passes. |
| FR-9.6 | The system must, on save, make the new config Active and the previous Active config Archived. |

### 10. Show Overall Data & Simulate Pipeline

| ID | Requirement |
|----|-------------|
| FR-10.1 | The system must provide a separate page within ETL, distinct from the configuration flow. |
| FR-10.2 | The system must require at least one Active ETL profile to access this page. |
| FR-10.3 | The system must allow the user to generate dirty data and run it through the pipeline. |
| FR-10.4 | The system must display the population of processed data flows in a table view. |
| FR-10.5 | The system must display four data objects: (1) Combined Flat, (2) Quote, (3) Load, (4) Vehicle+Driver. The user can switch between views across Joins, Filtering, Validation, and Show Overall Data. |

### 11. Validation & Enum Handling

| ID | Requirement |
|----|-------------|
| FR-11.1 | The system must show a warning and store null/empty for invalid enum values (e.g. status, vehicle_type). |
| FR-11.2 | The system must drop the entire row if Quote, Load, Vehicle, or Driver IDs are missing after joins. |

---

## 4. Guardrails

### 1. Configuration Profiles

| ID | Guardrail | Behaviour |
|----|-----------|-----------|
| GR-1.1 | No edit of Active/Archived | The system must block any edit to mapping, joins, or filters when the profile is Active or Archived. Edit controls must be hidden or disabled. |
| GR-1.2 | Duplicate allowed | The system must allow Duplicate for any profile (Draft, Active, Archived). Result is a new Draft. |
| GR-1.3 | Delete restrictions | The system may restrict delete of the last profile or the default template; behaviour TBD. Duplicate and Create always allowed. |
| GR-1.4 | One Active at a time | The system must ensure only one profile is Active at any time. Saving a config makes it Active and demotes the previous Active to Archived. |
| GR-1.5 | Profile name required | The system must reject profile creation without a name. Description may be optional. |
| GR-1.6 | Data model version required | The system must require a data model version when creating a profile. |

### 2. Ingestion

| ID | Guardrail | Behaviour |
|----|-----------|-----------|
| GR-2.1 | Block advance without data | The system must block "Next" to Mapping until all three data objects (Quote, Load, Driver+Vehicle) have data from upload or generate. |
| GR-2.2 | File format reject | The system must reject uploaded files that are not CSV or Excel. Show clear error (e.g., "Only CSV and Excel (.xlsx) are supported"). |
| GR-2.3 | File size reject | The system must reject files larger than 10 MB. Show clear error with max size. |
| GR-2.4 | Encoding/parse errors | The system must reject files that cannot be parsed (e.g., corrupt Excel, invalid CSV). Show error; do not partially load. |
| GR-2.5 | Empty file reject | The system must reject or warn on files with no data rows (headers only). Treat as no data; user must provide valid file or generate. |
| GR-2.6 | Regenerate replaces | The system must replace existing data when user clicks "Generate" again for an object. No merge; full replace. |

### 3. Mapping

| ID | Guardrail | Behaviour |
|----|-----------|-----------|
| GR-3.1 | Block advance with unmapped required | The system must block advance from Mapping until all required fields are mapped for all three data objects. |
| GR-3.2 | 1:1 mapping only | The system must enforce one source column per target field. No concatenation, splitting, or multi-source mapping in MVP. |
| GR-3.3 | Data model as source of truth | The system must not allow mapping to target fields that do not exist in the selected data model version. |
| GR-3.4 | No duplicate target mapping | The system must not allow the same target field to be mapped twice (e.g., quote_id from two columns). One target = one source. |
| GR-3.5 | Unmapped optional allowed | The system must allow optional fields to remain unmapped. User may proceed with nulls for optional fields. |
| GR-3.6 | Lock persists | The system must persist locked mappings when user invokes "Suggest remaining"; locked mappings are not overwritten by AI. |

### 3a. Enum Mapping

| ID | Guardrail | Behaviour |
|----|-----------|-----------|
| GR-3a.1 | Target values from schema | The system must allow mapping only to valid enum values defined in the data model for each field. |
| GR-3a.2 | One source value per target | Each source value maps to at most one target value; multiple source values may map to the same target. |
| GR-3a.3 | Enum mappings applied before joins | The system must apply enum mappings to mapped rows before dedup and joins. |

### 4. Static Joins

| ID | Guardrail | Behaviour |
|----|-----------|-----------|
| GR-4.1 | Join keys must exist | The system must reject join operations where the specified join key(s) are not present in the mapped/ingested data. Show error and suggestion. |
| GR-4.2 | INNER JOIN only | The system must support INNER JOIN only. No LEFT, RIGHT, or OUTER joins in MVP. |
| GR-4.3 | Fixed join order | The system must enforce join order: Quote → Load → Driver+Vehicle. User configures keys and fallbacks, not order. |
| GR-4.4 | Load join key requirement | The system must require Load to have at least one of allocated_vehicle_id or driver_id populated for rows to join to Driver+Vehicle. Rows without either are dropped. |
| GR-4.5 | Quote load_id must match | The system must drop Quote rows whose load_id does not exist in Loads. Same for Load→Driver+Vehicle: drop Load rows whose vehicle_id/driver_id does not match. |
| GR-4.6 | No circular joins | The system must not allow join definitions that create circular references. |

### 5. Filtering

| ID | Guardrail | Behaviour |
|----|-----------|-----------|
| GR-5.1 | Parseable rules | The system must reject or warn on filter rules that AI cannot interpret. Show error; do not apply malformed rule. |
| GR-5.2 | Filter-all warning | The system must warn the user when filters would result in zero rows (before Validation step). Allow save only if Validation passes with ≥1 row. |
| GR-5.3 | Filter scope | The system must apply filters only to the flat table (post-join). No filtering on raw entities. |
| GR-5.4 | Field existence | The system must reject filter rules that reference fields not present in the flat table. |

### 6. Pipeline Validation & Save

| ID | Guardrail | Behaviour |
|----|-----------|-----------|
| GR-6.1 | Save blocked on zero rows | The system must block Save when pipeline validation produces zero successful rows. Show message: e.g., "No rows passed. Adjust mapping, joins, or filters." |
| GR-6.2 | Run before Save | The system must require the user to run pipeline validation before Save is enabled. Save disabled until validation has been run and passed. |
| GR-6.3 | Validation uses current config | The system must run validation against the current mapping, enum mappings, joins, and filters. Changes after last run require re-run. |
| GR-6.4 | Validation uses current data | The system must run validation against the current dirty data (last uploaded/generated). Regenerating data requires re-run. |
| GR-6.5 | At least one success | The system must consider validation passed only when at least one row completes the full pipeline (after joins and filtering). |
| GR-6.6 | Warnings do not block Save | The system must allow Save when there are warnings (e.g., nulls, enum issues) as long as ≥1 row succeeds. |

### 7. Data Integrity (Runtime)

| ID | Guardrail | Behaviour |
|----|-----------|-----------|
| GR-7.1 | Drop rows with missing IDs | The system must drop entire rows when Quote, Load, Vehicle, or Driver IDs are missing or invalid after joins. No partial rows. |
| GR-7.2 | Invalid enum → warning + null | The system must show warning and store null/empty for invalid enum values (status, vehicle_type). Do not drop row; flag in summary. |
| GR-7.3 | updated_at required for dedup | The system must require updated_at for deduplication. Rows missing updated_at may be excluded from dedup or handled per implementation (e.g., drop or use fallback). |
| GR-7.4 | Dedup before joins | The system must run deduplication before any joins. No user override. |

### 8. Show Overall Data Page

| ID | Guardrail | Behaviour |
|----|-----------|-----------|
| GR-8.1 | Active profile required | The system must block access to Show Overall Data when no Active profile exists. Show empty state or redirect with message. |
| GR-8.2 | Use Active config only | The system must run the pipeline using the Active profile only. Draft/Archived configs are not used for simulation. |
| GR-8.3 | Generate required | The system must require the user to generate (or have) dirty data before running. No run without data. |

### 9. AI & Natural Language

| ID | Guardrail | Behaviour |
|----|-----------|-----------|
| GR-9.1 | No NL for Mapping | The system must not offer natural language input for mapping. Mapping is dropdown/manual only. |
| GR-9.2 | NL for Joins and Filters only | The system must offer natural language only for Joins and Filtering. |
| GR-9.3 | AI failure handling | The system must show clear error when AI fails (e.g., timeout, parse error). Allow retry; do not apply partial or invalid output. |
| GR-9.4 | Suggestion confidence display | The system must display confidence scores for mapping suggestions. User may override. |
| GR-9.5 | Apply suggestion is optional | The system must not auto-apply error suggestions. User must explicitly apply or correct. |

### 10. General UX

| ID | Guardrail | Behaviour |
|----|-----------|-----------|
| GR-10.1 | No destructive action without confirm | The system should require confirmation for Delete profile. Duplicate and Create need not confirm. (TBD per implementation.) |
| GR-10.2 | Preserve draft on navigation | The system must preserve Draft profile state when user navigates between steps or sidebar. Dirty data is session-only; config persists. |
| GR-10.3 | Minimum viewport | The system must support minimum width 1280px (desktop-only per PRD). Responsive below that is out of scope for MVP. |
| GR-10.4 | Dirty data not persisted | The system must not persist dirty data across sessions. User regenerates or re-uploads each time. |

---

## 5. Interaction Model (UX Behaviour)

### 1. Navigation & Flow

| Pattern | Behaviour |
|---------|-----------|
| **Primary navigation** | Sidebar provides persistent access to ETL, Data Discovery, and Job Market. User selects one at a time; selection highlights and loads the corresponding area. |
| **ETL step flow** | Linear progression: Configuration Profiles → Ingestion → Mapping → Joins → Filtering → Validation. User advances with "Next" or equivalent; backward navigation is allowed to earlier steps. |
| **Step indicator** | Always visible during ETL; shows current step, completed steps, and steps with errors or warnings. User can click completed/error steps to jump back. |
| **Profile selection** | From Configuration Profiles, user selects a Draft profile to edit or clicks Create/Duplicate. Active and Archived profiles are view-only; no edit entry point. |
| **Show Overall Data** | Separate page within ETL; accessible via tab or link. Requires at least one Active profile; show empty state or redirect if none. |

### 2. Real-Time Validation & Feedback

| Pattern | Behaviour |
|---------|-----------|
| **Validation trigger** | Validation runs automatically as the user configures (e.g., on field change, mapping change, rule edit). No explicit "Validate" action needed for step-level checks. |
| **Feedback timing** | Instant (within a short delay, e.g., <1s) after user action. No modal blocking; validation results appear inline. |
| **Error display** | Errors appear near the source (e.g., under unmapped field, beside invalid enum). Step indicator shows error count. Errors remain until corrected. |
| **Warning display** | Warnings appear similarly; user can proceed but is informed. Warnings may persist into Validation summary. |
| **Success feedback** | When a step's requirements are met, visual cue (e.g., checkmark) on step indicator; "Next" enabled (if gated). |

### 3. Error Suggestions

| Pattern | Behaviour |
|---------|-----------|
| **When shown** | When an error exists (unmapped required field, invalid enum, join key mismatch), the system surfaces a suggested fix in the same context as the error. |
| **Presentation** | Inline with the error (e.g., below field, in tooltip, or expandable). Example: "Required field quote_id is unmapped. Suggest mapping source column 'Quote ID' → quote_id." |
| **Action** | User can apply the suggestion with one click (e.g., "Apply") or manually correct. Applying updates the config and re-runs validation. |
| **Scope** | Applies to unmapped required fields, invalid enum values, and join key mismatches. |

### 4. Before/After Data Preview

| Pattern | Behaviour |
|---------|-----------|
| **When shown** | During user-facing steps only: Ingestion, Mapping, Joins, Filtering. Not during Deduplication (invisible) or Validation (summary instead). |
| **Layout** | Compact; avoids long vertical scrolling. Options: side-by-side (Before \| After), tabbed view, or collapsible panels with limited rows (e.g., 5–10). |
| **Scope** | Per-step: shows data state before the step's transformation and after. For Ingestion, "before" is N/A (raw); "after" is ingested data. |
| **Update** | Preview refreshes when user changes configuration that affects the step's output (e.g., new mapping, new filter rule). |

### 5. Mapping Interaction

| Pattern | Behaviour |
|---------|-----------|
| **Layout** | UI split by data object (Quote, Load, Driver+Vehicle). Each section shows: target fields (required/optional), mapping dropdown or picker, field description. |
| **Progress** | Per object: "X/Y mapped" with progress indicator. Overall: all required fields mapped across objects before "Next" enabled. |
| **Collapse/expand** | Each data object section can be collapsed to save space; expanded by default. Progress (X/Y) visible when collapsed. |
| **AI suggestions** | On load or "Suggest mappings," AI populates suggestions with confidence scores. User sees which fields are suggested and confidence (e.g., 85%). |
| **Lock & regenerate** | User locks individual mappings; "Suggest remaining" asks AI to fill only unlocked fields. Locked mappings persist; unlocked may change. |
| **Manual mapping** | User can override any suggestion by selecting a different source column. Override is immediate; validation runs. |

### 6. Natural Language Interaction (Joins & Filtering)

| Pattern | Behaviour |
|---------|-----------|
| **Input** | Text area or input field for plain-language rules. Placeholder examples (e.g., "e.g., exclude cancelled loads"). |
| **Invocation** | User types or pastes, then submits (e.g., "Apply" or Enter). AI interprets and generates structured config. |
| **Feedback** | Loading state while AI processes. On success: generated config shown (e.g., join definition, filter rule); user can edit. On failure: error message with retry option. |
| **Edit** | User can edit AI-generated config manually. Edits are reflected in before/after preview. |
| **Scope** | Joins and Filtering only. Mapping uses manual/assisted (dropdown) only, not natural language. |

### 7. Ingestion Interaction

| Pattern | Behaviour |
|---------|-----------|
| **Per-object actions** | Each data object (Quote, Load, Driver+Vehicle) has Upload and Generate. User chooses one per object. |
| **Upload** | Drag-and-drop or file picker; CSV or Excel only. On success: file name and row count shown; preview available. On error: message (e.g., format, size). |
| **Generate** | "Generate" button per object. On click: loading state; on success: preview with row count; before/after N/A for raw. User can regenerate (replaces previous). |
| **Proceed gate** | "Next" to Mapping disabled until all three objects have data (upload or generate). Visual indicator shows which are ready. |
| **Data model breakdown** | Visible on Ingestion: target fields per object (required/optional). User can reference before uploading or generating. |

### 8. Join Configuration Interaction

| Pattern | Behaviour |
|---------|-----------|
| **Join operations list** | User sees list of join operations (e.g., Quote→Load, Load→Driver+Vehicle). Each has name, definition, description. Add/Edit/Delete. |
| **Define join** | Form or structured UI: select left/right entities, join keys, fallback (e.g., vehicle_id else driver_id). Optional: natural language input. |
| **Preview** | Before/after shows joined result; user sees row count change. |
| **Validation** | Real-time check: join keys exist and match. Errors and suggestions surface if keys missing or mismatched. |

### 9. Filtering Interaction

| Pattern | Behaviour |
|---------|-----------|
| **Rule entry** | User adds inclusion and/or exclusion rules. Each rule: natural language input; AI interprets. |
| **Rule list** | Rules listed; user can edit or remove. Order may matter (e.g., inclusion then exclusion). |
| **Preview** | Before/after shows effect of filters on the flat table; row count before vs after. |
| **Validation** | Real-time check that rules are parseable. Warning if filters would drop all rows. |

### 10. Pipeline Validation & Save

| Pattern | Behaviour |
|---------|-----------|
| **Run test** | User clicks "Run validation" or equivalent. System runs full pipeline (ingestion → dedup → joins → filtering) on current dirty data. Loading state during run. |
| **Summary** | Results shown: rows successful, rows dropped (failed + filtered), fields with warnings or nulls. Table or summary view. |
| **Save gate** | "Save" enabled only when at least one row succeeds. If zero rows succeed, Save disabled; message explains (e.g., "No rows passed. Adjust filters or mapping."). |
| **On save** | New config becomes Active; previous Active becomes Archived. Confirmation feedback (e.g., toast or banner). User returns to profile list or stays on current view (TBD). |

### 11. Data Model Pop-Up

| Pattern | Behaviour |
|---------|-----------|
| **Trigger** | "View data model" or icon/link during Mapping, Joins, or Filtering. Click opens pop-up or slide-over. |
| **Content** | Data model per entity: fields, required/optional, description, format, examples. Scrollable if long. |
| **Dismiss** | Close button or click outside. Pop-up does not block main flow; user can keep it open while configuring. |
| **Context** | Optionally filter by current step (e.g., show only Load fields when configuring Load join). MVP may show full model. |

### 12. Profile States & Edit Restrictions

| Pattern | Behaviour |
|---------|-----------|
| **Draft** | Editable. User can change mapping, joins, filters, re-run validation, save. |
| **Active** | View-only. No Edit; Duplicate allowed. |
| **Archived** | View-only. No Edit; Duplicate allowed. |
| **Visual** | Status shown (badge, label). Edit controls hidden or disabled for Active/Archived. |

### 13. Show Overall Data Page

| Pattern | Behaviour |
|---------|-----------|
| **Entry** | Tab or link "Simulate Pipeline" within ETL. |
| **Generate** | User generates dirty data (all three objects) for this run. Generate replaces previous run's data. |
| **Run** | User runs pipeline using Active config. Results displayed in table. |
| **Table** | Flat wide table; columns from all joined entities. Pagination or virtual scroll for large result sets. |

---

## 6. Data & Domain Concepts

### 1. Domain Concepts (Business)

| Concept | Description |
|---------|-------------|
| **Fleet** | A logistics company that operates vehicles and drivers; provides quotes and fulfils loads. |
| **Load** | A shipping job: goods to be moved from collection to delivery. Has status (draft/posted/in_transit/completed/cancelled). |
| **Quote** | A price offered by a fleet for a load. Has status (draft/sent/accepted/rejected/expired). One load can have multiple quotes; one quote is accepted per load. |
| **Driver** | A person who operates a vehicle. Belongs to a fleet; may be assigned to a vehicle and to loads. |
| **Vehicle** | A truck or van used for transport. Has type (e.g. small_van, rigid_18t); belongs to a fleet; has an assigned driver. |
| **ETL Pipeline** | The sequence: Ingestion → Mapping → Deduplication → Joins → Filtering → Validation. Transforms raw data into a unified flat table. |
| **Data Model** | The target schema the platform expects. Defines required/optional fields, types, formats, and enums per entity. |
| **Data Model Version** | A versioned snapshot of the schema (V1, V2, …). Profiles bind to a version; versions may differ in fields. |

### 2. Data Entities (Target Schema)

#### 2.1 Quote

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| quote_id | UUID | ✓ | Unique identifier |
| load_id | UUID | ✓ | Load this quote is for |
| quoted_price | DECIMAL(12,2) | ✓ | Price quoted |
| status | enum | ✓ | draft \| sent \| accepted \| rejected \| expired |
| date_created | TIMESTAMP | ✓ | When quote was created |
| distance_km | DECIMAL(10,2) | Optional | Distance collection → delivery |
| associated_fleet_id | UUID | ✓ | Fleet providing the quote |
| fleet_quoter_name | VARCHAR | ✓ | Person who created the quote |
| requested_vehicle_type | enum | ✓ | small_van \| medium_van \| large_van \| luton \| rigid_7_5t \| rigid_18t \| rigid_26t \| articulated |
| created_at, updated_at | TIMESTAMP | ✓ | System timestamps |

#### 2.2 Load

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| load_id | UUID | ✓ | Unique identifier |
| collection_town, collection_city, collection_time, collection_date | various | mixed | Collection details |
| delivery_town, delivery_city, delivery_time, delivery_date | various | mixed | Delivery details |
| distance_km | DECIMAL(10,2) | Optional | Distance |
| status | enum | ✓ | draft \| posted \| in_transit \| completed \| cancelled |
| completion_date | DATE | Optional | When completed |
| load_poster_name | VARCHAR | ✓ | Who posted the load |
| allocated_vehicle_id | UUID | Optional | Vehicle assigned (at least one of vehicle or driver) |
| driver_id | UUID | Optional | Driver assigned (at least one of vehicle or driver) |
| number_of_items | INTEGER | Optional | Item count |
| created_at, updated_at | TIMESTAMP | ✓ | System timestamps |

#### 2.3 Driver

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| driver_id | UUID | ✓ | Unique identifier |
| name | VARCHAR | ✓ | Full name |
| fleet_id | UUID | ✓ | Fleet the driver belongs to |
| email | VARCHAR | Optional | Contact email |
| phone | VARCHAR | Optional | Contact phone |
| created_at, updated_at | TIMESTAMP | ✓ | System timestamps |

#### 2.4 Vehicle

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| vehicle_id | UUID | ✓ | Unique identifier |
| vehicle_type | enum | ✓ | Same values as requested_vehicle_type |
| registration_number | VARCHAR | ✓ | License plate |
| capacity_kg | DECIMAL(10,2) | Optional | Max payload |
| driver_id | UUID | Optional | Driver assigned to this vehicle |
| created_at, updated_at | TIMESTAMP | ✓ | System timestamps |

### 3. Platform Entities (ETL Configuration)

| Entity | Description |
|--------|-------------|
| **Configuration Profile** | A saved ETL config: name, status (active/draft/archive), description, data model version, AI mode. Contains mapping, joins, filters. |
| **Field Mapping** | A 1:1 link: source column → target field. Per data object; stored as part of the profile. |
| **Join Operation** | A join definition: left entity, right entity, join keys, fallback keys. E.g. Quote→Load on load_id; Load→Driver+Vehicle on vehicle_id or driver_id. |
| **Filter Rule** | Inclusion or exclusion criteria (natural language or structured). Applied to the flat table after joins. |
| **Dirty Data** | Generated or uploaded raw data used to test the ETL. Regenerated, not persisted. |
| **Flat Table** | The final output: one wide row per Quote–Load–Driver–Vehicle combination after joins and filters. |

### 4. Key Relationships

#### 4.1 Logistics Domain (Data Model)

```
┌─────────────┐
│   Quote     │
│ quote_id(PK)│
│ load_id(FK) │────────────┐
└─────────────┘             │
                             │
                             ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Load     │     │    Load     │     │   Driver    │
│ load_id(PK) │◄────│ load_id     │     │driver_id(PK)│
│ allocated_  │     │ allocated_  │────►│ vehicle_id  │──┐
│ vehicle_id  │     │ vehicle_id  │     └─────────────┘  │
│ driver_id   │────►│ driver_id   │────►                 │
└─────────────┘     └─────────────┘                       │
                                                          │
                                                          ▼
                    ┌─────────────────────────────────────────┐
                    │              Vehicle                    │
                    │ vehicle_id (PK) ◄───────────────────────┘
                    │ driver_id (FK) ──► Driver
                    │ fleet_id (implied via driver)
                    └─────────────────────────────────────────┘
```

#### 4.2 Relationship Summary

| From | To | Relationship | Join Key(s) | Cardinality |
|------|-----|--------------|-------------|-------------|
| Quote | Load | Quote is for a Load | quote.load_id → load.load_id | N:1 |
| Load | Vehicle | Load is allocated to Vehicle | load.allocated_vehicle_id → vehicle.vehicle_id | N:1 (optional) |
| Load | Driver | Load is assigned to Driver | load.driver_id → driver.driver_id | N:1 (optional) |
| Vehicle | Driver | Vehicle has assigned Driver | vehicle.driver_id → driver.driver_id | 1:1 (optional) |

**Rule:** Load must have at least one of `allocated_vehicle_id` or `driver_id` for the join to Driver+Vehicle.

#### 4.3 ETL Join Order

```
Quote ──(load_id)──► Load ──(allocated_vehicle_id OR driver_id)──► Driver+Vehicle
                                                                    (Vehicle + Driver in one table)
```

**Result:** One flat wide row = Quote + Load + Vehicle + Driver (where present).

#### 4.4 Configuration Profile Relationships

```
Configuration Profile
│
├── binds to → Data Model Version (V1, V2, …)
│
├── contains → Field Mappings (per data object)
│   source_column → target_field
│
├── contains → Join Operations
│   [Quote→Load, Load→Driver+Vehicle]
│
└── contains → Filter Rules
    inclusion / exclusion (natural language)
```

### 5. Source Data Structure

| Source | Structure | Notes |
|--------|-----------|-------|
| **Quote file** | One row per quote; columns map to Quote fields | CSV or Excel |
| **Load file** | One row per load; columns map to Load fields | CSV or Excel |
| **Driver+Vehicle file** | One row per vehicle with assigned driver; columns include both Driver and Vehicle fields | Single file; vehicle-centric (vehicle_id, vehicle fields, driver_id, driver fields) |

### 6. Unique Identifiers & Deduplication

| Entity | Primary Key | Deduplication |
|--------|-------------|---------------|
| Quote | quote_id | Keep row with latest updated_at |
| Load | load_id | Keep row with latest updated_at |
| Driver | driver_id | Keep row with latest updated_at |
| Vehicle | vehicle_id | Keep row with latest updated_at |

**Deduplication:** Per entity, before joins. Uses `updated_at` to choose the row to keep.

---

## 7. Success Criteria

*Measurable conditions that indicate the MVP has succeeded.*

### 1. End-to-End Pipeline

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| SC-1.1 | A user can complete a full ETL flow from profile creation to save without uploading any files | Create profile → generate all three objects → map → join → filter → validate → save. No file upload. |
| SC-1.2 | At least one row successfully completes the full pipeline and appears in the flat table | Run validation; summary shows ≥1 row successful; flat table displays joined data. |
| SC-1.3 | The output flat table contains columns from Quote, Load, Driver, and Vehicle | Inspect flat table; verify presence of fields from all four entities post-join. |
| SC-1.4 | Dirty data generation produces valid Quote IDs, Load IDs, and timestamps | Generate data; verify quote_id, load_id, created_at, updated_at present and valid per row. |

### 2. Data Model Awareness

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| SC-2.1 | User can view the target data model before starting ETL | Navigate to Data Model Preview page; see all entities and fields. |
| SC-2.2 | User can reference the data model during Mapping, Joins, and Filtering | Open pop-up from each step; see required/optional, description, format, examples. |
| SC-2.3 | The data model drives mapping—only valid target fields are mappable | Attempt to map; only data model fields appear as targets. |

### 3. ETL Configuration

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| SC-3.1 | User can create, duplicate, and delete configuration profiles | Create new profile; duplicate existing; delete (subject to guardrails). |
| SC-3.2 | User can configure mapping, joins, and filters to align with the data model | Complete mapping for all required fields; define join operations; add filter rules. |
| SC-3.3 | Configuration persists across navigation and sessions | Create draft; navigate away; return; config still present. |
| SC-3.4 | On save, new config becomes Active and previous Active becomes Archived | Save draft; verify status change; previous Active is now Archived. |

### 4. AI Assistance

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| SC-4.1 | AI provides mapping suggestions with confidence scores | Enter Mapping step; see suggestions per field with scores. |
| SC-4.2 | User can lock mappings and ask AI to suggest remaining | Lock some; click "Suggest remaining"; only unlocked fields change. |
| SC-4.3 | System suggests fixes for unmapped fields, invalid enums, join mismatches | Introduce error; see suggested fix; apply and verify resolution. |
| SC-4.4 | User can define joins via natural language (AI-assisted) | Enter plain-language join description; AI produces structured config. |
| SC-4.5 | User can define filter rules via natural language (AI-assisted) | Enter inclusion/exclusion in plain language; AI interprets and applies. |
| SC-4.6 | User can complete ETL with Mocked AI (no live Claude) | Select Mocked AI; complete flow; some manual correction may be needed. |

### 5. Visibility & Feedback

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| SC-5.1 | Step indicator shows progress, errors, warnings, and completed steps | Navigate ETL; verify indicator reflects current state and highlights issues. |
| SC-5.2 | Validation runs in real time and gives instant feedback | Change mapping; see validation update within ~1s. |
| SC-5.3 | Before/after preview appears for Ingestion, Mapping, Joins, Filtering | Complete each step; see before/after data; layout stays compact. |
| SC-5.4 | Error suggestions are actionable (user can apply with one click) | Trigger error; see suggestion; apply; error clears. |
| SC-5.5 | Validation summary shows rows successful, dropped, and fields with warnings | Run validation; see counts and breakdown. |

### 6. Business Rules via Natural Language

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| SC-6.1 | User can create inclusion rules in plain language | Add rule (e.g., "include only completed loads"); AI interprets; filter applies. |
| SC-6.2 | User can create exclusion rules in plain language | Add rule (e.g., "exclude cancelled quotes"); AI interprets; filter applies. |
| SC-6.3 | Filter rules affect the flat table row count | Add filter; before/after preview shows row count change. |

### 7. Data Readiness for Downstream

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| SC-7.1 | Transformed data conforms to the target schema | Output flat table has required fields populated (or null where optional). |
| SC-7.2 | Joined data correctly links Quote → Load → Driver+Vehicle | Inspect sample rows; quote.load_id matches load; load joins to vehicle/driver. |
| SC-7.3 | Invalid enums produce warning and null, not row drop | Introduce invalid enum; row remains; field shows null; warning in summary. |
| SC-7.4 | Rows with missing join keys are dropped | Include orphan quote (load_id not in loads); row dropped; reflected in summary. |

### 8. Non-Technical User (Portfolio Demo)

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| SC-8.1 | A user familiar with Excel but not SQL/coding can complete the flow | Run through with such a user; no code or SQL required. |
| SC-8.2 | Generate-only path requires no file preparation | Complete ETL using only "Generate" for all three objects. |
| SC-8.3 | Error suggestions reduce guesswork | Compare time to fix with vs without suggestions; suggestions lead to faster correction. |

### 9. Platform Structure

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| SC-9.1 | Sidebar navigates between ETL, Data Discovery, and Job Market | Click each; corresponding area loads. |
| SC-9.2 | Show Overall Data page displays pipeline output when Active profile exists | Navigate to page; generate; run; see flat table. |
| SC-9.3 | Show Overall Data shows empty state when no Active profile | No Active profile; navigate to page; see appropriate message or redirect. |

### 10. Guardrail Compliance

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| SC-10.1 | Save is blocked when validation produces zero successful rows | Configure filters to drop all rows; run validation; Save disabled. |
| SC-10.2 | "Next" from Ingestion is blocked until all three objects have data | Attempt to proceed with one or two objects; "Next" disabled. |
| SC-10.3 | "Next" from Mapping is blocked until all required fields are mapped | Leave one required field unmapped; "Next" disabled. |
| SC-10.4 | Active and Archived profiles cannot be edited | Open Active profile; edit controls absent or disabled. |
| SC-10.5 | File upload rejects non-CSV/Excel and files >10MB | Upload .json or 15MB file; rejection with clear message. |

---

## 8. Edge Cases & Constraints

*Boundary scenarios and system limitations for the logistics platform ETL MVP.*

### 1. Edge Cases

#### 1.1 Ingestion

| ID | Edge Case | Expected Behaviour |
|----|-----------|---------------------|
| EC-1.1 | File with duplicate column names | Reject or warn; do not silently use first/last. User must fix source. |
| EC-1.2 | File with encoding issues (e.g., mixed UTF-8/BOM) | Reject with message (e.g., "File encoding not supported. Save as UTF-8."). |
| EC-1.3 | File with headers only, no data rows | Reject or treat as empty; user cannot proceed without data. |
| EC-1.4 | Excel with multiple sheets | Use first sheet only; or let user select. Per implementation. |
| EC-1.5 | CSV with inconsistent column count across rows | Reject or warn; do not silently truncate or pad. |
| EC-1.6 | User generates, then uploads for same object | Last action wins; upload replaces generated, generate replaces uploaded. |
| EC-1.7 | Very small dataset (e.g., 1 quote, 1 load, 1 driver+vehicle) | Accept; pipeline may produce 0 or 1 row after joins. Validation passes if ≥1 row. |

#### 1.2 Mapping

| ID | Edge Case | Expected Behaviour |
|----|-----------|---------------------|
| EC-2.1 | Source has no column matching a required field | User must map manually or use AI suggestion; no auto-fill. Block advance until mapped. |
| EC-2.2 | Source column maps to multiple target fields | Not allowed; 1:1 only. User maps same column once. |
| EC-2.3 | All source columns unmapped for optional field | Allowed; optional stays null. |
| EC-2.4 | AI suggests wrong mapping; user applies then corrects | Apply overwrites; user can change again. No undo of single apply. |
| EC-2.5 | Data model has more required fields than source has columns | User cannot map; must add column to source or use generate. Block advance. |
| EC-2.6 | Source has hundreds of columns | UI must handle; mapping dropdown may need search/filter. Pagination or virtualisation for column list. |

#### 1.3 Joins

| ID | Edge Case | Expected Behaviour |
|----|-----------|---------------------|
| EC-3.1 | All Quote load_ids have no match in Loads | All Quote rows dropped at join; 0 rows in flat table. Validation fails; Save blocked. |
| EC-3.2 | All Load rows missing both vehicle_id and driver_id | All Load rows dropped at Load→Driver+Vehicle join; 0 rows. Validation fails. |
| EC-3.3 | One Load has vehicle_id, another has only driver_id | Each joins if key exists and matches; user configures fallback. Rows with neither key are dropped. |
| EC-3.4 | Duplicate join keys (e.g., two quotes for same load) | INNER JOIN produces multiple rows per load; flat table has duplicate load/driver/vehicle data. Accept. |
| EC-3.5 | Quote references load that was dropped earlier (e.g., by filter) | N/A: filters run after joins. Joins first; filters on flat table. |
| EC-3.6 | Vehicle has no driver_id; Load joins on vehicle_id only | Row joins; Driver fields null in flat table. Accept. |
| EC-3.7 | Driver appears in multiple Vehicle rows (one driver, many vehicles) | Accept; 1:N. Flat table may have duplicate driver across rows. |

#### 1.4 Filtering

| ID | Edge Case | Expected Behaviour |
|----|-----------|---------------------|
| EC-4.1 | Filter rule drops all rows | Warning before/during validation; Save blocked (0 rows). |
| EC-4.2 | Ambiguous natural language (e.g., "exclude bad loads") | AI may misinterpret. Show parsed rule; user can edit. On failure: error, retry. |
| EC-4.3 | Filter references field that doesn't exist in flat table | Reject rule; show error. |
| EC-4.4 | Multiple conflicting rules (include X, exclude X) | Order of application matters. Last wins or defined order. Per implementation. |
| EC-4.5 | Empty filter rule (user saves blank) | Reject or treat as no filter. No filter = all rows pass. |
| EC-4.6 | Filter on field with all nulls | Rule may match nothing or everything; depends on semantics. E.g., "where status = completed" with all null → 0 rows. |

#### 1.5 Deduplication

| ID | Edge Case | Expected Behaviour |
|----|-----------|---------------------|
| EC-5.1 | Two rows same ID, same updated_at | Tie-break: keep first or last by row order. Per implementation. |
| EC-5.2 | Row has null updated_at | Exclude from dedup or drop. Per GR-7.3. |
| EC-5.3 | updated_at in wrong format (e.g., text) | Warn; treat as invalid; exclude or drop. Flag in summary. |

#### 1.6 Validation & Save

| ID | Edge Case | Expected Behaviour |
|----|-----------|---------------------|
| EC-6.1 | Validation run, user changes config, tries to Save without re-run | Save disabled until re-run. Guardrail GR-6.3. |
| EC-6.2 | Validation run, user regenerates data, tries to Save | Save disabled; must re-run validation. Guardrail GR-6.4. |
| EC-6.3 | Exactly 1 row succeeds; many warnings | Save allowed. Warnings do not block. |
| EC-6.4 | User closes browser mid-Draft | Config persists (per guardrail); dirty data lost. User must re-upload or regenerate. |
| EC-6.5 | User duplicates Active, makes no changes, runs validation, Save | New Draft becomes Active; previous Active Archived. Valid. |

#### 1.7 Configuration Profiles

| ID | Edge Case | Expected Behaviour |
|----|-----------|---------------------|
| EC-7.1 | User deletes last profile | May block (GR-1.3) or allow. If allowed, default template may auto-create. TBD. |
| EC-7.2 | User duplicates Archived profile with old data model version | New Draft has same version. User can change version when editing (if supported) or keep. |
| EC-7.3 | Profile name duplicate | Allow; no unique constraint on name. Or warn. Per implementation. |

#### 1.8 AI & Natural Language

| ID | Edge Case | Expected Behaviour |
|----|-----------|---------------------|
| EC-8.1 | AI times out or rate-limited | Show error; allow retry. Do not apply partial output. |
| EC-8.2 | User enters nonsensical filter ("asdfasdf") | AI fails to parse; show error; user must rephrase. |
| EC-8.3 | Mocked AI always suggests wrong mapping | User corrects manually; Mocked AI does not learn. |
| EC-8.4 | Natural language join produces invalid config | Reject; show error; user edits manually or retries. |
| EC-8.5 | User applies error suggestion; creates new error | Validation re-runs; new error surfaces. User fixes. |

#### 1.9 Show Overall Data

| ID | Edge Case | Expected Behaviour |
|----|-----------|---------------------|
| EC-9.1 | No Active profile; user navigates to page | Block; show empty state or redirect. |
| EC-9.2 | User generates, runs, then Active profile is overwritten by another save | Next run uses new Active config. Previous run's data replaced on next Generate. |
| EC-9.3 | Flat table has zero rows | Display empty table with message. No error; pipeline ran successfully. |
| EC-9.4 | Flat table has thousands of rows | Pagination or virtual scroll. Performance per implementation. |

### 2. Constraints

#### 2.1 Scope Constraints (Out of MVP)

| ID | Constraint | Notes |
|----|------------|-------|
| C-1.1 | No scheduled/automated ETL | User manually triggers; no cron, event-driven, or scheduled runs. |
| C-1.2 | No multi-file merging | One file per data object. No combining multiple Quote files (e.g., Jan + Feb). |
| C-1.3 | No real-time/streaming | Batch upload only. No live data feeds. |
| C-1.4 | No multi-tenancy or auth | Single-user prototype; no login, roles, or access control. |
| C-1.5 | No cross-session AI learning | AI does not learn from user corrections across sessions. |
| C-1.6 | No data model migration | When V2 releases, user creates new config manually; no auto-migration. |
| C-1.7 | No advanced transformations | Complex logic (e.g., "profit = quoted_price - cost_base") requires custom code; not supported. |
| C-1.8 | No error notifications | No email, Slack, or other alerts for failed runs. |
| C-1.9 | No data export | Transformed data stays in system; no CSV/Excel export. Feeds downstream apps only. |
| C-1.10 | No config versioning/rollback | Cannot revert to previous config version. |
| C-1.11 | No collaborative editing | One user per config; no real-time collaboration. |
| C-1.12 | No mobile app | Desktop only; minimum 1280px width. |
| C-1.13 | No audit logs | No detailed change history or compliance logging. |
| C-1.14 | No external ETL integration | Standalone; no Airflow, dbt, Fivetran integration. |
| C-1.15 | No examples library | No pre-built filter/transform examples to insert. |
| C-1.16 | INNER JOIN only | No LEFT, RIGHT, OUTER joins. |

#### 2.2 Technical Constraints

| ID | Constraint | Notes |
|----|------------|-------|
| C-2.1 | File format | CSV or Excel (.xlsx) only. |
| C-2.2 | File size | Maximum 10 MB per file. |
| C-2.3 | Row counts (generated) | Quotes = 100, Loads = 50, Driver+Vehicle = 50. Fixed for generated data. |
| C-2.4 | Mapping | 1:1 only. No concatenation, splitting, or derived fields. |
| C-2.5 | Join type | INNER JOIN only. |
| C-2.6 | Join order | Fixed: Quote → Load → Driver+Vehicle. |
| C-2.7 | Viewport | Minimum 1280px width; desktop-only. |
| C-2.8 | Natural language scope | Joins and Filtering only. Not Mapping. |
| C-2.9 | Data persistence | Configs persist; dirty data does not. |

#### 2.3 Data Constraints

| ID | Constraint | Notes |
|----|------------|-------|
| C-3.1 | Quote and Load IDs always valid (generated) | Generated dirty data must have valid IDs; never missing/malformed. |
| C-3.2 | created_at and updated_at required (generated) | Always present in generated data. |
| C-3.3 | updated_at for dedup | Required for deduplication; used to pick latest row. |
| C-3.4 | Load join key | Load must have at least one of allocated_vehicle_id or driver_id for join. |
| C-3.5 | Unique IDs per entity | quote_id, load_id, vehicle_id, driver_id are unique within their entity. |
| C-3.6 | Enum values | status (Quote/Load), vehicle_type: strict set. Invalid → warning + null. |

#### 2.4 UX Constraints

| ID | Constraint | Notes |
|----|------------|-------|
| C-4.1 | Edit only Draft | Active and Archived profiles cannot be edited. |
| C-4.2 | One Active profile | Only one profile can be Active at a time. |
| C-4.3 | Save requires validation pass | At least one row must succeed; Save disabled otherwise. |
| C-4.4 | Proceed gates | Ingestion: all three objects; Mapping: all required fields; Enum Mapping, Joins, Filtering: skippable. |
| C-4.5 | No auto-apply suggestions | User must explicitly apply error suggestions. |
| C-4.6 | Show Overall Data requires Active | Page inaccessible without Active profile. |

#### 2.5 Business Constraints

| ID | Constraint | Notes |
|----|------------|-------|
| C-5.1 | Single user | No multi-user or tenant isolation. |
| C-5.2 | Prototype | Portfolio/demo focus; not production-hardened. |
| C-5.3 | AI mode choice | User selects Claude or Mocked AI at profile creation; applies to all steps. |
| C-5.4 | Data model version binding | Profile bound to version at creation; older profiles may stay on old version. |

---

## Appendix A: Technical Architecture

**Stack:** Frontend: React, Vite, TypeScript, Tailwind CSS. Backend: Node.js, Express, TypeScript, SQLite (better-sqlite3). AI: Claude (optional) or mocked mode.

**Routes:** `/etl` (profiles), `/etl/profiles/:id` (ETL flow), `/etl/model` (data model preview), `/etl/simulate` (show overall data).

**API:** REST; profiles CRUD; ingest (upload, generate); mapping suggest; joins/filters config + NL interpret; pipeline run/validate.

---

## Appendix B: Deployment

The ETL Configurator is deployed to [Render](https://render.com):
- **Frontend** (Static Site): https://logistics-platform-demo.onrender.com
- **Backend** (Web Service): https://logistics-platform-ttx9.onrender.com

**Build:** Backend from repo root (`npm install; npm run build`); frontend from `frontend/` (`npm install && npm run build`). Frontend requires `VITE_API_URL` and SPA rewrite `/*` → `/index.html`.

**SQLite on Render**: Default filesystem is ephemeral; data can be lost on redeploy. Use Persistent Disk or Postgres for production.

Full setup: [README.md](../../../README.md#deployment-render)

---

## Appendix C: AI Modes (Claude vs Mocked)

| Mode | Purpose | Behavior |
|------|---------|----------|
| **Claude** | Live AI assistance | Uses Anthropic Claude API for: mapping suggestions (from column names + sample values), NL join interpretation, NL filter interpretation, enum mapping suggestions. Requires `ANTHROPIC_API_KEY`. Handles varied natural language; higher accuracy. |
| **Mocked** | Demos, offline, no key | Deterministic logic: fuzzy column-name matching for mapping; rule-based NL interpretation for joins/filters; simple enum value matching. May produce incorrect suggestions; user corrects. |

**Scope:** Both apply to Mapping, Enum Mapping, Joins, and Filtering. Selected at profile creation; persisted with profile.

**Claude unavailable:** When the user selects Claude but `ANTHROPIC_API_KEY` is not configured on the backend, the system shows a warning banner; AI features do not work until the key is set and backend restarted. No silent fallback to mocked.
