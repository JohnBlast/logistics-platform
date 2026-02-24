# Feature Specification: 003 – Job Market Simulation

**Feature Branch**: `003-job-market`
**Created**: 2026-02-23
**Status**: Specifying
**Product**: Logistics Platform – Third Product
**Source of Truth**: [003-PRD-job-market.md](003-PRD-job-market.md) — full product requirements; reference when specifying, clarifying, or validating.

---

## Overview

### Product Context

A 2-sided marketplace simulation where Load Posters generate shipping jobs and Fleet Operators bid on work. Product 003 is independent from ETL Configurator (001) and Data Discovery (002) — the only connection is sidebar navigation. It extends the shared platform data model with marketplace-specific fields and introduces a rule-based recommender for pricing and a composite scoring system for quote acceptance.

### Problem Statement

Fleet operators in logistics lack tools to view available jobs geographically, understand competitive pricing, and manage their fleet in a single interface. Load posters lack visibility into how their jobs attract quotes and which fleet operators offer the best value. This product simulates the marketplace to demonstrate the bidding and scoring workflow.

### Target Users

**Fleet Operator** — An authenticated user representing a logistics fleet company. Comfortable with fleet management software. Needs to find available work, submit competitive bids, and manage vehicles and drivers.

**Load Poster** — A simulated user role that generates jobs and evaluates quotes algorithmically. Does not manually accept or reject quotes (scoring is automatic in MVP).

### Goals (MVP)

- Fleet Operators can view a job board, see jobs on a UK map, submit quotes, and receive accept/reject feedback
- Load Posters can generate jobs on demand
- Rule-based recommender suggests competitive price ranges
- Quote acceptance scoring produces consistent, explainable results using 4 weighted signals
- Fleet management supports creating and generating vehicles and drivers
- UK map (Leaflet + OpenStreetMap) visualises job and fleet positions
- All data is in-memory (no persistent database for simulation data)

---

## Clarifications

*Resolved underspecified areas (from PRD comparison and spec-kit specify workflow).*

| # | Area | PRD Ref | Question | Resolution |
|---|------|---------|----------|------------|
| C-1 | ADR enforcement | §4, §16.3 | Is ADR a scoring signal or a hard gate? | **Hard gate.** If a job requires ADR and the selected driver lacks certification, quote submission is blocked. ADR is NOT a scoring signal. |
| C-2 | Fleet Profile scope | §5 | Is Fleet Profile shared with ETL/Discovery or Job Market–only? | **Job Market only.** Not part of ETL pipeline output or Discovery views. |
| C-3 | Location granularity | §9 | Street/postcode level or city level? | **City/town level only.** Static UK hubs lookup (~30-35 cities). Lat/lng derived at runtime. |
| C-4 | Distance calculation | §9 | Real routing or straight-line? | **Straight-line (Haversine).** ETA assumes ~60 km/h average road speed. |
| C-5 | Data persistence | §18 | Database or in-memory? | **In-memory.** All simulation data resets on server restart. Config not persisted. |
| C-6 | Map library | §4, Journey 5 | Which map library? | **Leaflet + OpenStreetMap.** Free, no API key required. |
| C-7 | Currency | §18 | Multi-currency? | **GBP (£) only.** |
| C-8 | User roles | §2, §18 | Separate authenticated users? | **Role-based views** within the same session. Not separate authenticated users. |
| C-9 | Acceptance scoring signals | §16.3 | How many signals and what weights? | **4 signals:** price (0.40), ETA (0.30), fleet_rating (0.18), vehicle_match (0.12). Sum = 1.0. |
| C-10 | Default fleet rating | §16.4 | What rating for new fleets? | **Default 3.0** (neutral). |
| C-11 | Map pin interaction | Journey 1, Journey 5 | What happens when clicking a pin? | **Job selection from the board list, not pin clicks.** Vehicle/collection/delivery pins show city name on hover tooltip. Popups with distance/ETA on polylines only. Map is a visualisation aid, not a navigation tool. |
| C-12 | Job generation count | §10 Generate Jobs API | Is count user-configurable? Max? | **User-configurable** via numeric input field, default 5, min 1, max 20. Backend validates bounds. |
| C-13 | Fleet generation: replace vs append | Journey 4, §10 Fleet APIs | Does generating replace or append? | **Append.** Generating adds to existing fleet. Max fleet size: 50 vehicles and 50 drivers. Backend validates total. |
| C-14 | Quote form fields | §4 Quote Submission, Journey 1 | Which fields manual vs auto? | **Manual:** price (£), vehicle (dropdown), driver (dropdown). **Auto-populated:** vehicle_type, adr_certified, eta_to_collection. Recommended price range displayed above price input. |
| C-15 | Job board refresh | §4 Job Board | Auto-refresh or manual? | **Optimistic UI** after generation (Load Poster sees immediately). Fleet Operator uses manual "Refresh" button. No polling or WebSockets (out of scope). |
| C-16 | Competition factor timing | §16.2 vs §16.3 | When are competing quotes counted? | **Recommender:** count at recommendation time. **Acceptance:** normalise across all quotes at evaluation time. |
| C-17 | Price validation thresholds | §4 Quote Acceptance | What are exact "unrealistic" boundaries? | **Zero/negative:** rejected. **Too low:** < recommended_min × 0.50. **Too high:** > recommended_max × 3.0. **Excessive distance:** ETA > 480 min (8 hours). Pre-scoring guardrails with specific messages. |
| C-18 | Vehicle-to-collection max distance | §4 Quote Acceptance | Max ETA before rejection? | **480 minutes** (8 hours at 60 km/h = 480 km). Covers essentially all UK city pairs. |
| C-19 | Quote cancellation | §2 Restrictions | Can Fleet Operator cancel a submitted quote? | **No cancellation in MVP.** Once submitted, quotes cannot be modified or withdrawn. `expired` status not used. |
| C-20 | Fleet profile editable fields | Journey 4 | What fields are editable? | **Only `company_name`.** `total_jobs_completed` auto-increments on acceptance. `rating` stays at default 3.0 in MVP (no rating mechanism). `driver_count`/`vehicle_count` computed from fleet. |
| C-21 | Multiple load posters | §2, Journey 1 | One or many simulated posters? | **Multiple simulated names, single role.** System randomly assigns `load_poster_name` from a pool of fictional companies (e.g., "Tesco Distribution", "Amazon Logistics"). Generate API does not take poster name. |
| C-22 | Quote evaluation trigger | Journey 2, §4 | When does scoring happen? | **Immediately on submission.** System scores against all current quotes for the load. First good-enough quote wins. Rejected quotes are not re-evaluated when new quotes arrive. |
| C-23 | `adr_required` missing from Load | §5, §10 API | Load entity in data model has no `adr_required` field but API returns it. | **Add `adr_required` (BOOLEAN, Required, default false) to Load in `platform-data-model.md`** as a 003 extension field. |
| C-24 | ADR premium formula bug | §16.2 pseudocode vs REC-06 | Pseudocode says `base × (1 + base × 0.15)` which is dimensionally wrong. REC-06 uses `base × 1.15`. | **Correct formula:** `adr_multiplier = adr_required ? 1.15 : 1.0; recommended_mid = base_price × adr_multiplier × competition_factor × rating_factor`. Matches REC-06 worked example. |

*Additional implementation notes (resolved during clarify, for technical plan):*
- **Vehicle match "exceeds"**: Use rate_per_km ordering as implicit size hierarchy (small_van < ... < articulated). Offering a larger vehicle than requested = match.
- **`fleet_quoter_name`**: Auto-derive from Fleet Profile `company_name`.
- **Re-quoting after rejection**: Duplicate prevention applies to active quotes only (status `sent`). If previous quote was `rejected`, fleet may re-quote.
- **Score normalisation (N quotes)**: `price_score = 1.0 - (price - min) / (max - min)`. Guard: if max == min, all get 1.0. Same for `eta_score`.

---

## User Stories & Acceptance Scenarios

### User Story 1 – Fleet Operator Views Job Board and Submits a Quote (P1)

A Fleet Operator finds available work and submits a competitive bid aided by a pricing recommendation.

**Why this priority**: Core marketplace action — without quoting, there is no marketplace.

**Traces to**: PRD Journey 1, §4 Quote Submission, §10 Submit Quote API.

**Independent Test**: Load jobs exist → view board → select job → see map + recommended price → fill quote → submit → quote created with status "sent".

**Acceptance Scenarios**:

1. **Given** at least one posted job exists, **When** Fleet Operator navigates to Job Market, **Then** job board displays all posted loads with: collection city, delivery city, distance (km), required vehicle type, ADR requirement, collection time, quote count
2. **Given** Fleet Operator selects a job, **When** details load, **Then** UK map shows vehicle pins, collection pin, delivery pin, lines with distance/ETA popups, and the recommended price range is displayed
3. **Given** Fleet Operator has vehicles and drivers, **When** they fill in the quote form (price, select vehicle+driver), **Then** system auto-populates: vehicle type, ADR status, ETA from vehicle's city to collection city
4. **Given** a completed quote form, **When** Fleet Operator submits, **Then** quote is created with status "sent", quote appears in history, and the quote enters the acceptance scoring pipeline
5. **Given** the job requires ADR and the selected driver lacks ADR certification, **When** Fleet Operator attempts to submit, **Then** submission is blocked with message "This job requires ADR certification. Select an ADR-certified driver to quote." and submit button is disabled

---

### User Story 2 – Quote Acceptance Determines Winner (P1)

The system scores submitted quotes and accepts or rejects them based on a composite score.

**Why this priority**: Core marketplace feedback — Fleet Operators need to understand whether their bid won and why.

**Traces to**: PRD Journey 2, §4 Quote Acceptance, §16.3 Scoring Signals, §16.5 Acceptance Scenarios.

**Independent Test**: Submit a quote → system scores with 4 signals → quote accepted or rejected → Fleet Operator sees result with score breakdown.

**Acceptance Scenarios**:

1. **Given** a submitted quote, **When** system evaluates, **Then** quote is scored using 4 weighted signals: price_score (0.40), eta_score (0.30), fleet_rating_score (0.18), vehicle_match (0.12)
2. **Given** composite score >= 0.65 (multiple quotes on the load), **When** system decides, **Then** quote is accepted, load status → "in_transit", quote status → "accepted"
3. **Given** composite score < 0.65 (multiple quotes), **When** system decides, **Then** quote is rejected with feedback on which metrics fell short
4. **Given** a sole bidder with composite score >= 0.50, **When** system evaluates, **Then** quote is accepted (lower threshold for sole bidder)
5. **Given** a sole bidder with composite score < 0.50, **When** system evaluates, **Then** quote is rejected
6. **Given** multiple quotes exceed the threshold for the same load, **When** system decides, **Then** highest composite score wins; only one quote accepted per load
7. **Given** the system rejects unrealistic quotes (zero price, too low, too high, excessive vehicle-to-collection distance), **When** such a quote is submitted, **Then** it is rejected before scoring

---

### User Story 3 – Load Poster Generates Jobs (P1)

A Load Poster creates new shipping jobs for Fleet Operators to bid on.

**Why this priority**: Without job generation, there is nothing to bid on.

**Traces to**: PRD Journey 3, §4 Job Generation, §10 Generate Jobs API.

**Independent Test**: Press "Generate Jobs" → system creates N loads with randomised parameters from UK hubs → jobs appear on job board.

**Acceptance Scenarios**:

1. **Given** UK hubs lookup is loaded, **When** Load Poster presses "Generate Jobs" with a count, **Then** system generates that many loads with randomised: collection city, delivery city (different cities), required vehicle type, ADR requirement, collection time
2. **Given** generated jobs, **When** they appear on the board, **Then** each has status "posted", distance_km > 0 (Haversine), valid vehicle_type enum, collection_time in the future
3. **Given** existing jobs on the board, **When** Load Poster generates more, **Then** new jobs are appended (not replacing existing ones)

---

### User Story 4 – Fleet Operator Manages Fleet (P1)

A Fleet Operator creates or generates vehicles and drivers for their fleet.

**Why this priority**: Fleet Operators need vehicles and drivers before they can submit quotes.

**Traces to**: PRD Journey 4, §4 Fleet Management, §10 Fleet Management APIs.

**Independent Test**: Navigate to fleet management → create/generate drivers and vehicles → fleet profile updates → vehicles/drivers available for quoting.

**Acceptance Scenarios**:

1. **Given** Fleet Operator navigates to fleet management, **When** they create a driver, **Then** driver is created with: name, ADR certification (yes/no), fleet_id auto-assigned
2. **Given** Fleet Operator in fleet management, **When** they create a vehicle, **Then** vehicle is created with: type, registration, capacity, current_city (from UK hubs), optional driver assignment
3. **Given** Fleet Operator clicks "Generate", **When** they specify counts, **Then** system generates drivers (random name, random ADR) and vehicles (random type, random registration, random current_city from UK hubs)
4. **Given** vehicles and drivers are created/generated, **When** fleet profile is viewed, **Then** driver_count and vehicle_count reflect the current fleet size
5. **Given** Fleet Operator views fleet profile, **When** profile loads, **Then** displays: company name, total jobs completed, rating, driver count, vehicle count
6. **Given** Fleet Operator wants to edit the fleet profile, **When** they modify company name, **Then** profile is updated

---

### User Story 5 – Fleet Operator Views Map (P2)

A Fleet Operator visualises job and fleet positions on a UK map.

**Why this priority**: Geographic context helps Fleet Operators assess job feasibility and ETA.

**Traces to**: PRD Journey 5, §4 Map, §10 (map is frontend-only using hub coordinates).

**Independent Test**: View map → see vehicle pins → select a job → see collection/delivery pins → see lines with distance/ETA popups.

**Acceptance Scenarios**:

1. **Given** fleet vehicles exist, **When** map loads, **Then** pins appear at each vehicle's current_city coordinates (from UK hubs lookup)
2. **Given** a job is selected, **When** map updates, **Then** collection pin and delivery pin appear at the correct UK hub coordinates
3. **Given** a job is selected, **When** map draws lines, **Then** straight-line polyline from nearest vehicle to collection (popup: X km, ~Y min) and collection to delivery (popup: X km, ~Y min)
4. **Given** the map, **When** it renders, **Then** it is bounded to UK (SW 49.9°N, 8.2°W to NE 60.9°N, 1.8°E) with default center 53.0°N, 1.5°W, zoom 6

---

### User Story 6 – Fleet Operator Gets Price Recommendation (P1)

A Fleet Operator sees a recommended price range before submitting a quote.

**Why this priority**: Pricing guidance is core to the marketplace value proposition.

**Traces to**: PRD §4 Quote Recommender, §16.2 Scoring Signals, §10 Get Recommended Price API.

**Independent Test**: Select a job → request recommendation → see price range (min/mid/max) based on scoring signals.

**Acceptance Scenarios**:

1. **Given** a selected job and vehicle type, **When** system calculates recommendation, **Then** price range is computed using: `base_price = distance_km × rate_per_km[vehicle_type]`, with ADR premium (+15% if required), competition factor (1.0 − competing_quotes × 0.05, clamped [0.7, 1.0]), and rating factor (0.95 + fleet_rating/5.0 × 0.10)
2. **Given** the recommended mid-price, **When** range is displayed, **Then** min = mid × 0.85, max = mid × 1.15
3. **Given** the Fleet Operator changes vehicle type selection, **When** recommendation recalculates, **Then** the price range updates to reflect the new rate_per_km
4. **Given** a new fleet with no rating, **When** recommendation is requested, **Then** default rating 3.0 is used

---

### User Story 7 – Fleet Operator Views Quote History and Results (P2)

A Fleet Operator tracks their submitted quotes and understands acceptance decisions.

**Why this priority**: Feedback loop — understanding what makes a winning bid.

**Traces to**: PRD Journey 2, §10 Get Quote Result API.

**Independent Test**: Submit quotes → view quote history → see status (sent/accepted/rejected) → see score breakdown for evaluated quotes.

**Acceptance Scenarios**:

1. **Given** Fleet Operator has submitted quotes, **When** they view quote history, **Then** all quotes are listed with: job reference, price, status, vehicle type, timestamp
2. **Given** a quote has been evaluated, **When** Fleet Operator views the result, **Then** score breakdown shows: price_score, eta_score, fleet_rating_score, vehicle_match, composite_score
3. **Given** a rejected quote, **When** Fleet Operator views it, **Then** feedback indicates which signals scored poorly

---

## Edge Cases

**Quote Submission**

- No vehicles/drivers: Quote form disabled. Message: "Add vehicles and drivers to your fleet before quoting." (EC from PRD §8)
- No price entered: Form validation prevents submission
- ADR required, driver not certified: Submission blocked (hard gate — C-1)
- Vehicle type mismatch: Warning shown, quote can still be submitted but vehicle_match = 0.0 in scoring
- Duplicate quote per fleet per load: System prevents. Message: "You have already quoted on this job." (PRD §8)
- Unrealistic quote (zero, too low, too high, excessive distance): Rejected before scoring (PRD §4)

**Job Board**

- No posted jobs: Informative empty state with icon, heading, descriptive text, and refresh CTA (PRD §8)
- Job with no quotes: Load remains "posted" indefinitely (PRD §8)
- All quotes rejected for a job: Load remains "posted"; Fleet Operators can re-quote (PRD §8)

**Fleet Management**

- City not in UK hubs: Should not occur in simulation — generation only uses hubs list (PRD §8)

**Scoring**

- Sole bidder: Acceptance threshold lowers to 0.50 (PRD §16.4)
- New fleet with no rating: Default 3.0 used (PRD §16.4)
- Multiple quotes exceed threshold: Highest composite wins; only one accepted per load (PRD §16.3)
- Competition factor with 6+ quotes: Clamped to 0.70, not lower (PRD §16.2)

---

## Requirements

### Functional Requirements

**Job Board**: Display posted loads; show per-job details; allow job selection; update on generation (PRD §4)

**Quote Submission**: Submit with price + vehicle + driver; auto-populate type/ADR/ETA; display recommendation; block if no fleet; ADR hard gate (PRD §4)

**Quote Recommender**: Rule-based formula; price range (min/mid/max) with mid price shown prominently; update on input change (PRD §4, §16.2)

**Quote Acceptance**: 4-signal scoring; composite threshold 0.65 (0.50 sole bidder); reject unrealistic quotes; feedback on rejection (PRD §4, §16.3)

**Job Generation**: Randomised from UK hubs; Haversine distance; random vehicle type + ADR (PRD §4)

**Fleet Management**: CRUD vehicles/drivers; generate in bulk; fleet profile display and edit (PRD §4)

**Map**: Leaflet + OSM; UK bounds; vehicle/collection/delivery pins; straight-line polylines; distance/ETA popups (PRD §4)

### Guardrails

- GR-1: Quote submission blocked without vehicles, drivers, or price
- GR-2: ADR hard gate — blocks submission if job requires ADR and driver lacks it
- GR-3: Duplicate quote prevention — one quote per fleet per load
- GR-4: Unrealistic quote rejection — zero, too low, too high, excessive distance
- GR-5: Acceptance threshold enforced — 0.65 (multi-quote) or 0.50 (sole bidder)
- GR-6: One accepted quote per load — highest composite wins
- GR-7: Job generation uses only UK hubs — no invalid cities
- GR-8: Map bounded to UK

### Key Entities

- **Load** — Shipping job; status posted/in_transit/completed (platform data model + Job Market usage)
- **Quote** — Bid from Fleet Operator; extends with eta_to_collection, offered_vehicle_type, adr_certified
- **Driver** — Fleet member; extends with has_adr_certification
- **Vehicle** — Fleet asset; extends with current_city
- **Fleet Profile** — Job Market–only entity: company name, rating, job count, fleet size

---

## Success Criteria

- SC-1: Fleet Operator can view available jobs, submit quotes, and receive accept/reject feedback
- SC-2: Load Poster can generate jobs on demand
- SC-3: Quote acceptance scoring produces consistent, explainable results (matches manual walkthrough in e2e-scenarios.md)
- SC-4: UK map displays vehicle, collection, and delivery pins with correct Haversine distances/ETAs
- SC-5: Fleet Operator can create/generate vehicles and drivers; ADR certification tracked correctly
- SC-6: Recommended prices follow the formula from PRD §16.2 (100% accuracy for rule-based)
- SC-7: Acceptance scoring uses 4 signals summing to 1.0; thresholds applied correctly
- SC-8: ADR hard gate blocks submission — no ADR-uncertified driver can quote on ADR-required jobs

---

## Out of Scope (MVP)

- Real data ingestion (all data is simulated)
- Integration with ETL Configurator or Data Discovery
- Live routing or traffic-based ETA (straight-line only)
- LLM-powered features (planned for future iteration)
- Payment processing or invoicing
- Multi-currency (GBP only)
- Real-time notifications or WebSockets
- Postcode/street-level location resolution
- Multi-user concurrency / authentication
- Persistent database for simulation data

---

## Constraints

- **Data**: All in-memory; resets on server restart
- **Currency**: GBP (£) only
- **Geography**: UK only; ~30-35 static hubs
- **Map**: Leaflet + OpenStreetMap; no API key
- **Distance**: Haversine (straight-line); ETA at ~60 km/h
- **Roles**: Fleet Operator and Load Poster are views within same session, not separate authenticated users
- **Scoring**: Rule-based (no ML, no LLM)
- **Vehicle types**: small_van, medium_van, large_van, luton, rigid_7_5t, rigid_18t, rigid_26t, articulated

---

## Supporting Documents

- [003-PRD-job-market.md](003-PRD-job-market.md) – Golden source; full product requirements
- [e2e-scenarios.md](e2e-scenarios.md) – End-to-end test scenarios with sample data and manual walkthroughs
- [handoff-checklist.md](handoff-checklist.md) – PM → AI developer readiness checklist
- [platform-data-model.md](../../platform-data-model.md) – Canonical schema (Job Market fields marked with "003")
- [constitution.md](../../memory/constitution.md) – Platform principles
