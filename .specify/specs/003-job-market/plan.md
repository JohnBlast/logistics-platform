# Implementation Plan: 003 – Job Market Simulation

**Branch**: `003-job-market` | **Date**: 2026-02-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-job-market/spec.md`

---

## Summary

Build a 2-sided marketplace simulation where Load Posters generate shipping jobs and Fleet Operators bid with quotes. The system features a rule-based price recommender, 4-signal acceptance scoring, fleet management, and a UK map (Leaflet + OpenStreetMap). All data is in-memory — no persistent database for simulation state. Integrates into the existing monorepo alongside 001 ETL and 002 Discovery.

**Technical approach**: Existing monorepo with React + Vite frontend and Node.js + Express backend. In-memory data stores (Maps/arrays). Leaflet for the UK map. Rule-based scoring formulas. Haversine for distance, ~60 km/h for ETA.

---

## Technical Context

| Area | Choice |
|------|--------|
| **Language/Version** | TypeScript 5.x (frontend + backend) — existing stack |
| **Frontend** | React 18 + Vite 5 + Tailwind — existing stack |
| **Backend** | Node.js 20+ with Express — existing stack |
| **Storage** | In-memory (Map/array). No database for simulation data. |
| **Map** | Leaflet + OpenStreetMap (react-leaflet wrapper). Free, no API key. |
| **Scoring** | Rule-based formulas. No ML, no LLM. |
| **Distance** | Haversine formula (straight-line). ETA at ~60 km/h. |
| **UK Hubs** | Static lookup table (~30-35 cities with lat/lng coordinates) |
| **Testing** | Vitest (unit + integration) — existing stack |
| **Target Platform** | Web (desktop, 1280px min); Node 20+ |
| **Constraints** | In-memory data resets on restart; GBP only; UK only; single-session roles |

---

## Constitution Check

| Principle | Compliance |
|-----------|------------|
| **User-Centric Design** | Job board, map visualisation, price recommendations, score feedback — all aid decision-making |
| **Data Integrity** | Platform data model extended with 003 fields; ADR hard gate prevents invalid quotes |
| **Specification-First** | Plan derived from spec + clarifications (C-1 through C-24); no vibe coding |
| **Incremental Delivery** | MVP scope explicit; out-of-scope documented (LLM, real data, payments, multi-user) |
| **AI-Assisted Development** | Rule-based recommender in MVP; LLM-powered profiles planned for future |

**Gate**: Passed.

---

## Project Structure

### Documentation

```text
.specify/specs/003-job-market/
├── 003-PRD-job-market.md    # Golden source
├── spec.md                   # Feature spec (with clarifications C-1 to C-24)
├── plan.md                   # This file
├── tasks.md                  # Task breakdown
├── e2e-scenarios.md          # E2E test scenarios
└── handoff-checklist.md      # Readiness checklist
```

### Source Code

```text
logistics-platform/
├── frontend/src/
│   ├── components/
│   │   └── jobmarket/        # Job Market components
│   │       ├── JobBoard.tsx           # Job listing table
│   │       ├── QuoteForm.tsx          # Quote submission form
│   │       ├── QuoteHistory.tsx       # Fleet's quote history
│   │       ├── FleetManagement.tsx    # CRUD vehicles/drivers
│   │       ├── FleetProfile.tsx       # Fleet profile view/edit
│   │       ├── UKMap.tsx              # Leaflet map wrapper
│   │       ├── PriceRecommendation.tsx # Recommender display
│   │       └── JobDetails.tsx         # Selected job details + map
│   ├── pages/
│   │   └── JobMarket.tsx              # Main page with tab/section navigation
│   ├── services/
│   │   └── api.ts                     # Extended with api.jobmarket.* methods
│   └── lib/
│       └── jobmarket/
│           └── types.ts               # Shared TypeScript interfaces
│
├── backend/src/
│   ├── api/
│   │   └── jobmarket.ts               # Express router: all Job Market endpoints
│   ├── services/
│   │   ├── jobmarketStore.ts          # In-memory data store (loads, quotes, fleets)
│   │   ├── recommenderService.ts      # Price recommendation formula
│   │   ├── acceptanceService.ts       # 4-signal scoring + acceptance decision
│   │   ├── jobGeneratorService.ts     # Random job generation from UK hubs
│   │   └── fleetGeneratorService.ts   # Random fleet generation
│   └── lib/
│       ├── ukHubs.ts                  # Static UK hubs lookup (~30-35 cities)
│       └── haversine.ts              # Haversine distance + ETA calculation
│
└── package.json
```

---

## Architecture

### High-Level Flow

```
┌───────────────────────┐     ┌──────────────────────────┐
│       Frontend        │────►│        Backend            │
│  (React + Leaflet)    │     │  (Express, in-memory)     │
└───────────────────────┘     └──────────────────────────┘
        │                              │
   ┌────┴────┐                ┌────────┴────────┐
   │ UKMap   │                │ In-Memory Store  │
   │ Leaflet │                │  loads[]         │
   │ + OSM   │                │  quotes[]        │
   └─────────┘                │  vehicles[]      │
                              │  drivers[]       │
                              │  fleetProfile    │
                              └─────────────────┘
```

### Component Architecture

#### 1. Data Layer (Backend)

**In-Memory Store** (`jobmarketStore.ts`)
- `Map<string, Load>` — loads keyed by load_id
- `Map<string, Quote>` — quotes keyed by quote_id
- `Map<string, Vehicle>` — vehicles keyed by vehicle_id
- `Map<string, Driver>` — drivers keyed by driver_id
- `FleetProfile` — single fleet profile object
- Provides CRUD operations, lookups by foreign key

**UK Hubs Lookup** (`ukHubs.ts`)
- Static constant: `Record<string, { lat: number; lng: number }>`
- ~30-35 UK cities covering major cities, distribution hubs, ports
- Used by job generation, ETA calculation, map pin placement

**Haversine Utility** (`haversine.ts`)
- `haversineDistance(lat1, lng1, lat2, lng2): number` → km
- `estimateETA(distanceKm: number): number` → minutes (distanceKm / 60 × 60)

#### 2. Job Generation (`jobGeneratorService.ts`)

- Picks random collection/delivery cities (different) from UK hubs
- Calculates distance via Haversine
- Assigns random: vehicle_type, adr_required, collection_time, load_poster_name (from pool per C-21)
- Validates count: 1 ≤ count ≤ 20 (C-12)
- Returns created loads with status "posted"

#### 3. Fleet Generation (`fleetGeneratorService.ts`)

- Generates drivers with random names, random ADR certification
- Generates vehicles with random type, registration, current_city from UK hubs
- Appends to existing fleet (C-13), validates max 50 each
- Updates fleet profile counts

#### 4. Quote Submission Flow

```
Fleet Operator fills form (price, vehicle, driver)
    │
    ▼
Backend: POST /api/job-market/quotes
    │
    ├─ Validate: has vehicles/drivers? (GR-1)
    ├─ Validate: ADR hard gate — job requires ADR, driver has it? (GR-2, C-1)
    ├─ Validate: duplicate quote? (GR-3) — only blocks if existing quote has status "sent"
    ├─ Auto-populate: vehicle_type, adr_certified, fleet_quoter_name
    ├─ Calculate: ETA via Haversine (vehicle city → collection city)
    ├─ Validate: unrealistic quote? (C-17, C-18)
    │   ├─ price ≤ 0 → reject
    │   ├─ price < recommended_min × 0.50 → reject
    │   ├─ price > recommended_max × 3.0 → reject
    │   └─ ETA > 480 min → reject
    │
    ├─ Create quote with status "sent"
    │
    ▼
Acceptance Scoring (immediate, per C-22)
    │
    ├─ Gather all quotes for this load
    ├─ Normalise: price_score, eta_score across all quotes
    │   └─ Formula: 1.0 - (value - min) / (max - min); guard max == min → 1.0
    ├─ Calculate: fleet_rating_score = fleet_rating / 5.0
    ├─ Calculate: vehicle_match = offered >= requested? 1.0 : 0.0
    │   └─ Vehicle hierarchy by rate_per_km ordering
    ├─ Composite = Σ(signal × weight)
    │   └─ Weights: price 0.40, ETA 0.30, fleet_rating 0.18, vehicle_match 0.12
    ├─ Threshold: ≥ 0.65 (multi-quote) or ≥ 0.50 (sole bidder)
    ├─ If accepted: quote → "accepted", load → "in_transit", increment total_jobs_completed
    └─ If rejected: quote → "rejected", feedback on which signals scored poorly
```

#### 5. Recommender (`recommenderService.ts`)

```
Input: load_id, vehicle_type (optional, defaults to load's required type)
    │
    ▼
Calculate:
    base_price = distance_km × rate_per_km[vehicle_type]
    adr_multiplier = adr_required ? 1.15 : 1.0
    competition_factor = max(0.70, 1.0 - competing_quotes × 0.05)
    rating_factor = 0.95 + (fleet_rating / 5.0 × 0.10)
    recommended_mid = base_price × adr_multiplier × competition_factor × rating_factor
    recommended_min = recommended_mid × 0.85
    recommended_max = recommended_mid × 1.15
    │
    ▼
Output: { min, mid, max, signals: { distance_km, vehicle_type, adr_required, competing_quotes, fleet_rating } }
```

#### 6. Frontend: Map Component (`UKMap.tsx`)

- Uses `react-leaflet` with OpenStreetMap tiles
- UK bounds: SW (49.9, -8.2) to NE (60.9, 1.8), center (53.0, -1.5), zoom 6
- Vehicle pins: one per vehicle at current_city coordinates (tooltip: vehicle type + city)
- Collection pin: at collection_city coordinates (tooltip: city name)
- Delivery pin: at delivery_city coordinates (tooltip: city name)
- Polylines: vehicle → collection (distance/ETA popup), collection → delivery (distance/ETA popup)
- Different pin colors/icons for vehicle vs collection vs delivery

#### 7. Frontend: Page Layout

```
/jobmarket (main page)
    │
    ├── Role selector: Fleet Operator / Load Poster (tab or toggle)
    │
    ├── Fleet Operator view:
    │   ├── Job Board (table: all posted loads)
    │   ├── Selected Job → Job Details + Map + Recommender + Quote Form
    │   ├── Fleet Management (vehicles + drivers CRUD + generate)
    │   ├── Fleet Profile (view + edit company name)
    │   └── Quote History (all submitted quotes with status + score breakdown)
    │
    └── Load Poster view:
        ├── Generate Jobs (count input + button)
        └── Posted Jobs (table with quote counts)
```

---

## API Endpoints

Following existing pattern: Express Router in `backend/src/api/jobmarket.ts`, registered as `app.use('/api/job-market', jobmarketRouter)` in `index.ts`.

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| POST | `/api/job-market/jobs/generate` | Generate N random jobs | count: 1-20 (C-12) |
| GET | `/api/job-market/jobs` | Get job board | `?status=posted` filter |
| GET | `/api/job-market/jobs/:id` | Get single job details | |
| POST | `/api/job-market/quotes` | Submit a quote | ADR gate, price validation, immediate scoring |
| GET | `/api/job-market/quotes/:id` | Get quote result + score | |
| GET | `/api/job-market/quotes` | Get fleet's quote history | |
| GET | `/api/job-market/quotes/recommend` | Get recommended price | `?load_id=&vehicle_type=` |
| POST | `/api/job-market/fleet/vehicles` | Create a vehicle | |
| POST | `/api/job-market/fleet/drivers` | Create a driver | |
| POST | `/api/job-market/fleet/generate` | Generate vehicles + drivers | Append, max 50 each (C-13) |
| GET | `/api/job-market/fleet/profile` | Get fleet profile | Includes vehicles and drivers |
| PATCH | `/api/job-market/fleet/profile` | Update fleet profile | Only company_name (C-20) |
| GET | `/api/job-market/hubs` | Get UK hubs list | For frontend map + dropdowns |

---

## Implementation Approach

### Phase 0: Setup
Add Job Market route, sidebar entry, shared types, UK hubs, Haversine utility.

### Phase 1: Data Layer
In-memory store for loads, quotes, vehicles, drivers, fleet profile. CRUD operations.

### Phase 2: Job Generation + Board
Load Poster generates jobs. Job board displays posted loads. Single job details view.

### Phase 3: Fleet Management
CRUD vehicles/drivers. Generate fleet. Fleet profile view/edit.

### Phase 4: Quote Submission + Recommender
Quote form with validation, ADR hard gate, price validation. Recommender formula. Quote creation.

### Phase 5: Quote Acceptance Scoring
4-signal scoring engine. Acceptance/rejection logic. Score feedback. Quote history.

### Phase 6: Map Integration
Leaflet + OSM. Vehicle/collection/delivery pins. Polylines with popups. UK bounds.

### Phase 7: Observability & Logging
Boundary logging (input/output counts). Decision logging (scoring, generation). Log prefixes per handoff-checklist §G.

### Phase 8: Integration Testing
E2E scenarios from e2e-scenarios.md. Edge cases. Evaluation scenarios (EVAL-01, EVAL-02, EVAL-03).

---

## Dependencies

### New npm packages

| Package | Purpose | Where |
|---------|---------|-------|
| `leaflet` | Map rendering library | frontend |
| `react-leaflet` | React bindings for Leaflet | frontend |
| `@types/leaflet` | TypeScript types for Leaflet | frontend (dev) |

### Existing packages (no new installs)

- Express, TypeScript, Vite, React, Tailwind, Vitest — all already installed

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data storage | In-memory Maps | No persistence needed; simulation resets on restart (C-5) |
| Map library | Leaflet + OSM | Free, no API key, sufficient for pins + polylines (C-6) |
| Scoring | Rule-based formula | Deterministic, testable, matches PRD §16 exactly |
| ADR | Hard gate | Blocks submission — not a scoring signal (C-1) |
| Quote evaluation | Immediate on submission | First good-enough quote wins (C-22) |
| Fleet Profile | Job Market only | Excluded from ETL/Discovery (C-2) |
| Vehicle hierarchy | Rate_per_km ordering | small_van < medium_van < ... < articulated for "matches or exceeds" |
| Duplicate prevention | Active quotes only | If previous quote rejected, fleet may re-quote |
| Score normalisation | Linear interpolation | `1.0 - (value - min) / (max - min)`; guard max == min → 1.0 |

---

## Supporting Documents

- [003-PRD-job-market.md](003-PRD-job-market.md) – Golden source PRD
- [spec.md](spec.md) – Feature spec with clarifications C-1 to C-24
- [e2e-scenarios.md](e2e-scenarios.md) – Test scenarios with sample data and manual walkthroughs
- [handoff-checklist.md](handoff-checklist.md) – Readiness checklist (§G observability pending)
- [platform-data-model.md](../../platform-data-model.md) – Canonical schema with 003 extensions
- [constitution.md](../../memory/constitution.md) – Platform principles
