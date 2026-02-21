# Clarifications: 002 – Logistics Discovery

**Purpose:** Resolved underspecified areas from PRD comparison and spec-kit clarify workflow.  
**Source:** [002-PRD-discovery.md](002-PRD-discovery.md)  
**Created:** 2025-02-20

---

## Summary

These clarifications resolve ambiguities and implementation choices left as TBD or "per implementation" in the Discovery PRD. They should be reflected in the feature spec when created via `/speckit.specify`.

---

## Clarifications Table

| # | Area | PRD Ref | Question | Resolution |
|---|------|---------|----------|------------|
| C-1 | **Tenant in prototype** | §2 Target Users, §4 Data Scope, ETL PRD | ETL is single-user, no login; Discovery assumes authenticated Tenant. How does tenant isolation work in MVP? | **Single implicit tenant.** For prototype: treat the first distinct `associated_fleet_id` in the pipeline output as the "current user's tenant." No login = no tenant selector. All visible data is filtered to that one fleet. If no pipeline run: use first fleet from mock data, or show empty state. Future: replace with real auth + tenant binding. |
| C-2 | **loads view derivation** | §1a, §11.3 | "loads" = distinct by load_id, tenant-filtered. Does "tenant-filtered" mean only awarded loads? | **Yes.** loads = distinct Load rows from flat where the quote for that load has `status = 'accepted'` AND `associated_fleet_id` = tenant. Same as "loads awarded to Fleet Operator." |
| C-3 | **loads_and_quotes status disambiguation** | §11.3 | Both Load and Quote have `status`. Which drives "accepted quote"? | **Quote.status.** The phrase "accepted quote" refers to `Quote.status = 'accepted'`. loads_and_quotes filters flat where `quote.status = 'accepted'`; one row per load with its accepted quote. In joined flat, column naming: use `quote_status` and `load_status` when both exist to avoid ambiguity. |
| C-4 | **Fallback when no pipeline run** | §1a, §10 Data Ingestion | "Show empty state or mock data conforming to platform schema." Which? | **Prefer empty state.** If user opens Discovery without running the pipeline: show empty state with message ("Add data and run pipeline in ETL to query"). Mock data is optional for demos: if provided, use single-tenant mock (one `associated_fleet_id`) so tenant logic behaves consistently. |
| C-5 | **TableFilter operator key** | §11.5 | Filter objects use `operator` (e.g. eq, include). Confirm key name. | **Use `operator`** for TableFilter objects (distinct from aggregation `op`). Example: `{ field: "status", operator: "eq", value: "completed" }`. |
| C-6 | **Filter combination (AND vs OR)** | §11.12.2 | Multiple filters in `filters` array—how combined? | **AND.** All filter objects must match. Within `include`/`exclude`, values are OR (field matches any value in list). |
| C-7 | **Empty query result** | §4, Journey 7 | "Query returns no results" → empty-state message. What exactly? | **Structured output:** Empty table with message ("No rows match your criteria"). **Text response:** "Your query returned no results." Do not fabricate summary stats. |
| C-8 | **Rate limit scope** | §10 | "10 requests per 30 minutes per IP." Per user or per IP? | **Per IP** in MVP (no login). When auth exists, switch to per-user. |
| C-9 | **Conversation persistence** | §10 Deployment | "Conversations and messages persisted in browser localStorage." Shared with pipeline? | **No.** Discovery conversations are independent of ETL. localStorage is client-only; no backend persistence for conversations in MVP. |
| C-10 | **Validate tab for raw listing** | §4 Validation Behavior | "Omit aggregations → raw rows." Does Validate show same? | **Yes.** When output is raw (no groupBy/aggregations), Validate tab shows the same filtered rows. When output is aggregated, Validate shows underlying raw rows (all Load/Quote fields) that fed the aggregation. |
| C-11 | **loads dataSource and quoted_price** | §11.3 | loads view has Load fields only. Revenue uses quoted_price from Quote. | **Use loads_and_quotes for revenue.** loads view = Load fields only (no quoted_price). For "revenue by load poster" etc., use dataSource `loads_and_quotes` where quoted_price exists. |
| C-12 | **OR across different fields** | §11.12.2, 11.12.7 | "status = completed OR vehicle_type = small_van" not supported. | **Confirmed.** AND between filters only. OR within one field via include/exclude. For cross-field OR: guide user to narrow question or future extension. Exception: **orFilters** (C-15) for "between X and Y" pattern. |
| C-13 | **pctChange first row** | §11.7 | First row shows null (no previous period). Display? | **Show "—" or "N/A"** in the change column for the first row. Do not show "0%" (would be misleading). |
| C-15 | **orFilters for "between X and Y"** | Common queries | "How many jobs between London and Birmingham" needs (col=L,del=B) OR (col=B,del=L). | **orFilters** array: each inner array is ANDed; results from each group are ORed. Example: orFilters: [[{collection_city,eq,London},{delivery_city,eq,Birmingham}],[{collection_city,eq,Birmingham},{delivery_city,eq,London}]]. |
| C-14 | **Generated data row limits** | Platform deployment | Limit rows to avoid absurd amounts and stay within Render free tier. | **Max 2000 rows.** Pipeline output (flatRows) capped at 2000. Simulate Pipeline Add accumulation capped at 2000 total rows (quote + load + driver_vehicle). Discovery table output (Output/Validate) capped at 2000 rows. Keeps memory and response sizes within Render free tier limits. |

---

## Traceability to PRD

| Clarification | PRD Sections |
|---------------|--------------|
| C-1 | §2 Target Users, §4 Data Scope, §6 Tenant, §12 Assumptions |
| C-2, C-3 | §1a Derivation, §11.3 Data Sources |
| C-4 | §1a Persistence & Deployment, §10 Data Ingestion |
| C-5, C-6 | §11.5 Filter Expressions, §11.12.2 |
| C-7 | §4 Output Behavior, Journey 7 |
| C-8 | §10 Rate Limiting |
| C-9 | §10 Deployment |
| C-10 | §4 Validation Behavior |
| C-11 | §11.3 Load fields, §11.4 ratio example |
| C-12 | §11.12.2, §11.12.7 |
| C-13 | §11.7 pctChange |
| C-14 | Platform deployment, Render free tier |

---

## Next Steps

1. Run `/speckit.specify` with PRD + this document to produce `spec.md`
2. Ensure user stories and acceptance scenarios reflect these resolutions
3. Reference this document in plan and tasks
