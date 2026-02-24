# Tasks: 003 – Job Market Simulation

**Input**: [plan.md](plan.md), [spec.md](spec.md), [e2e-scenarios.md](e2e-scenarios.md)
**Path convention**: Web app — `backend/src/`, `frontend/src/`

**Format**: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: US1–US7 from spec

---

## Phase 0: Setup

**Purpose**: Route registration, sidebar entry, shared types, core utilities.

- [ ] T001 [US1] Add `/jobmarket` route in `frontend/src/App.tsx`; create placeholder `frontend/src/pages/JobMarket.tsx`
- [ ] T002 [P] [US1] Update `frontend/src/layouts/MainLayout.tsx`: replace "Job Market (planned)" placeholder with active link to `/jobmarket`
- [ ] T003 [P] Create shared types in `frontend/src/lib/jobmarket/types.ts`: interfaces for Load, Quote, Driver, Vehicle, FleetProfile, UKHub, PriceRecommendation, ScoreBreakdown, QuoteResult
- [ ] T004 [P] Create `backend/src/lib/ukHubs.ts`: static lookup of ~30-35 UK cities with `{ lat, lng }` coordinates (major cities, distribution hubs, ports per PRD §9)
- [ ] T005 [P] Create `backend/src/lib/haversine.ts`: `haversineDistance(lat1, lng1, lat2, lng2)` → km; `estimateETA(distanceKm)` → minutes at 60 km/h
- [ ] T006 [P] Create `backend/src/api/jobmarket.ts`: empty Express Router; register as `app.use('/api/job-market', jobmarketRouter)` in `backend/src/index.ts`
- [ ] T007 [P] Install frontend dependencies: `leaflet`, `react-leaflet`, `@types/leaflet`

**Checkpoint**: Dev server starts; `/jobmarket` route renders placeholder; sidebar shows Job Market link; Haversine returns correct distance for Birmingham→Leeds (~160km).

---

## Phase 1: Data Layer

**Purpose**: In-memory store and backend types. Blocks all subsequent phases.

- [ ] T008 Create `backend/src/services/jobmarketStore.ts`: in-memory store with Maps for loads, quotes, vehicles, drivers; single FleetProfile object; initialise with defaults (empty fleet, rating 3.0, company name "My Fleet")
- [ ] T009 [P] Implement store CRUD: `addLoad`, `getLoad`, `getLoadsByStatus`, `updateLoadStatus`; `addQuote`, `getQuote`, `getQuotesByLoad`, `getQuotesByFleet`; `addVehicle`, `getVehicle`, `getVehicles`, `deleteVehicle`; `addDriver`, `getDriver`, `getDrivers`, `deleteDriver`; `getFleetProfile`, `updateFleetProfile`
- [ ] T010 [P] Implement store helpers: `getQuoteCountForLoad(loadId)`, `hasActiveQuote(fleetId, loadId)` (status "sent"), `getVehicleByDriver(driverId)`, fleet count updaters
- [ ] T011 [P] Add `GET /api/job-market/hubs` endpoint in jobmarket router: returns UK hubs list for frontend dropdowns and map

**Checkpoint**: Store CRUD works in isolation (unit tests). Hubs endpoint returns ~30-35 cities.

---

## Phase 2: Job Generation + Job Board

**Purpose**: Load Poster generates jobs; Fleet Operator views the board. Enables US1, US3.

### Backend – Generation

- [ ] T012 [US3] Create `backend/src/services/jobGeneratorService.ts`: `generateJobs(count)` — picks random collection/delivery cities (different) from hubs, Haversine distance, random vehicle_type, adr_required, collection_time (future), load_poster_name from pool of ~5 fictional companies (C-21)
- [ ] T013 [US3] Implement `POST /api/job-market/jobs/generate`: validate count 1-20 (C-12); call generator; add loads to store; return created jobs
- [ ] T014 [P] [US1] Implement `GET /api/job-market/jobs`: return loads filtered by status query param; include `quote_count` per load
- [ ] T015 [P] [US1] Implement `GET /api/job-market/jobs/:id`: return single load with full details

### Frontend – Board

- [ ] T016 [US1] Create `frontend/src/components/jobmarket/JobBoard.tsx`: table of posted loads (collection city, delivery city, distance, vehicle type, ADR, collection time, quote count); reuse DataTableWithSearch pattern; show empty state "No jobs available. Check back later." when no posted jobs (E2E-EC-04)
- [ ] T017 [US3] Add "Generate Jobs" section to Load Poster view: count input (default 5, min 1, max 20) + Generate button; calls API; appends results to board (C-15)
- [ ] T018 [US1] Create `frontend/src/components/jobmarket/JobDetails.tsx`: selected job details panel (all load fields + map placeholder)

**Checkpoint**: Load Poster can generate 1-20 jobs. Job board lists all posted loads. Selecting a job shows details.

---

## Phase 3: Fleet Management

**Purpose**: Fleet Operator manages vehicles, drivers, and fleet profile. Enables US4.

### Backend – Fleet

- [ ] T019 [US4] Create `backend/src/services/fleetGeneratorService.ts`: `generateFleet(vehicleCount, driverCount)` — random names, ADR, vehicle types, registrations, current_city from hubs
- [ ] T020 [US4] Implement fleet endpoints in jobmarket router:
  - `POST /api/job-market/fleet/vehicles` — create single vehicle (validate current_city is in hubs)
  - `POST /api/job-market/fleet/drivers` — create single driver
  - `POST /api/job-market/fleet/generate` — generate bulk; validate append + max 50 each (C-13)
  - `GET /api/job-market/fleet/profile` — return profile with vehicles[] and drivers[]
  - `PATCH /api/job-market/fleet/profile` — update company_name and rating (C-20)

### Frontend – Fleet

- [ ] T021 [US4] Create `frontend/src/components/jobmarket/FleetManagement.tsx`: vehicle list (type, registration, city, assigned driver) + driver list (name, ADR status); Create vehicle/driver forms; Generate button with count inputs
- [ ] T022 [US4] Create `frontend/src/components/jobmarket/FleetProfile.tsx`: display company name (editable), total jobs completed, rating (editable 0–5), driver count, vehicle count; save button for name and rating changes
- [ ] T023 [US4] Add API methods to `frontend/src/services/api.ts`: `api.jobmarket.createVehicle()`, `api.jobmarket.createDriver()`, `api.jobmarket.generateFleet()`, `api.jobmarket.getProfile()`, `api.jobmarket.updateProfile()`

**Checkpoint**: Can create/generate vehicles and drivers. Fleet profile shows correct counts. Can edit company name.

---

## Phase 4: Quote Submission + Recommender

**Purpose**: Fleet Operator submits quotes with validation; pricing recommendation displayed. Enables US1, US6.

### Backend – Recommender

- [ ] T024 [US6] Create `backend/src/services/recommenderService.ts`: `recommendPrice(loadId, vehicleType?, fleetRating?)` — formula: base × adr_multiplier × competition_factor × rating_factor; returns { min, mid, max, signals }. Rate per km table from PRD §16.2. Competition factor clamped [0.7, 1.0]. Default rating 3.0 for new fleets.
- [ ] T025 [US6] Implement `GET /api/job-market/quotes/recommend?load_id=&vehicle_type=`: call recommender; return price range + signals

### Backend – Submission

- [ ] T026 [US1] Implement `POST /api/job-market/quotes`: full submission flow:
  1. Validate fleet has vehicles/drivers (GR-1)
  2. ADR hard gate: if load requires ADR and driver lacks it → 422 (GR-2, C-1)
  3. Duplicate check: active quote (status "sent") for this fleet+load → 409 (GR-3); allow re-quote if previous rejected
  4. Auto-populate: vehicle_type, adr_certified, fleet_quoter_name from profile
  5. Calculate ETA: Haversine(vehicle city → collection city) / 60 × 60
  6. Price validation (C-17): zero/negative → 400; < rec_min × 0.50 → 400; > rec_max × 3.0 → 400
  7. ETA validation (C-18): > 480 min → 400
  8. Create quote with status "sent"
  9. Trigger acceptance scoring (immediate per C-22)
  10. Return quote with status + recommended price

### Frontend – Quote Form

- [ ] T027 [US1] Create `frontend/src/components/jobmarket/QuoteForm.tsx`: price input (£), vehicle dropdown, driver dropdown; show recommended price range above price input; auto-display vehicle type, ADR status, estimated ETA; disable submit if: no vehicles/drivers, ADR mismatch, missing price
- [ ] T028 [US6] Create `frontend/src/components/jobmarket/PriceRecommendation.tsx`: display min–mid–max range with signal breakdown; update when vehicle type changes
- [ ] T029 [US1] Add API methods: `api.jobmarket.submitQuote()`, `api.jobmarket.getRecommendation()`

**Checkpoint**: Recommender returns correct prices per EVAL-01. ADR hard gate blocks submission (E2E-EC-02). Price validation rejects unrealistic quotes. Quote created with auto-populated fields.

---

## Phase 5: Quote Acceptance Scoring

**Purpose**: 4-signal composite scoring determines quote acceptance. Enables US2.

### Backend – Scoring Engine

- [ ] T030 [US2] Create `backend/src/services/acceptanceService.ts`:
  - `scoreQuote(quoteId)` — gather all quotes for the load; normalise price_score and eta_score across all quotes (linear interpolation, guard max == min → 1.0); fleet_rating_score = rating / 5.0; vehicle_match using vehicle hierarchy (rate_per_km ordering: small_van < ... < articulated; offered ≥ requested → 1.0)
  - Composite = Σ(signal × weight) with weights: price 0.40, ETA 0.30, fleet_rating 0.18, vehicle_match 0.12
  - Threshold: ≥ 0.65 (multi-quote) or ≥ 0.50 (sole bidder)
  - If multiple quotes exceed threshold for same load: highest composite wins, others rejected
  - On acceptance: quote → "accepted", load → "in_transit", increment fleet total_jobs_completed
  - On rejection: quote → "rejected", generate feedback (which signals scored poorly)
- [ ] T031 [US2] Implement `GET /api/job-market/quotes/:id`: return quote with score_breakdown (price_score, eta_score, fleet_rating_score, vehicle_match, composite_score) and status

### Frontend – Quote Results

- [ ] T032 [US7] Create `frontend/src/components/jobmarket/QuoteHistory.tsx`: list all fleet quotes with: job reference, price, status (sent/accepted/rejected), vehicle type, timestamp; expandable row shows score breakdown for evaluated quotes; highlight poor-scoring signals on rejected quotes
- [ ] T033 [US2] Implement `GET /api/job-market/quotes` endpoint: return all quotes for the fleet
- [ ] T034 [US7] Add API methods: `api.jobmarket.getQuote()`, `api.jobmarket.getQuoteHistory()`

**Checkpoint**: Scoring matches manual walkthroughs in e2e-scenarios (E2E-02 composite 0.9712, E2E-03 Quote-A 0.8512, Quote-B 0.246). Sole bidder threshold works. One accepted quote per load.

---

## Phase 6: Map Integration

**Purpose**: UK map with Leaflet + OSM showing fleet and job positions. Enables US5.

- [ ] T035 [US5] Create `frontend/src/components/jobmarket/UKMap.tsx`: Leaflet MapContainer with OSM tiles; UK bounds (SW 49.9,-8.2 to NE 60.9,1.8); center 53.0,-1.5; zoom 6; use react-leaflet Marker, Popup, Polyline components
- [ ] T036 [US5] Add vehicle pins: Marker at each vehicle's current_city coordinates from UK hubs; tooltip showing vehicle type + city name; distinct pin colour/icon
- [ ] T037 [US5] Add job pins: when a job is selected, add collection pin (green) and delivery pin (red) at city coordinates; tooltips with city names
- [ ] T038 [US5] Add polylines: straight line vehicle → collection (blue, dashed); straight line collection → delivery (green, solid); Popup on each line showing "X km, ~Y min"
- [ ] T039 [US5] Integrate map into JobDetails component: when job is selected from board, map updates with correct pins and lines; vehicle → collection uses nearest vehicle (shortest Haversine distance)
- [ ] T040 [P] Import Leaflet CSS in frontend entry point (`index.css` or `App.tsx`); ensure map tiles render correctly

**Checkpoint**: Map renders UK with vehicle pins. Selecting a job shows collection/delivery pins + lines. Distance/ETA popups match Haversine calculations. Map matches E2E-05 expectations.

---

## Phase 7: Page Assembly + Polish

**Purpose**: Wire all components into the main JobMarket page with role-based views.

- [ ] T041 Build `frontend/src/pages/JobMarket.tsx` main page: role toggle (Fleet Operator / Load Poster); Fleet Operator view with sections: Job Board, Selected Job (details + map + recommender + quote form), Fleet Management, Fleet Profile, Quote History; Load Poster view: Generate Jobs, Posted Jobs
- [ ] T042 [P] Add "Refresh" button to job board for Fleet Operator view (C-15)
- [ ] T043 [P] Handle empty states: no vehicles/drivers → disable quote form with message (E2E-EC-01); no posted jobs → "No jobs available" (E2E-EC-04); empty quote history → "No quotes submitted yet"
- [ ] T044 [P] Style consistency: follow existing Tailwind + Material Design tokens; primary colour #1976d2; consistent shadows, spacing, typography

**Checkpoint**: Full page renders with role toggle. All empty states handled. Styling matches existing platform aesthetic.

---

## Phase 8: Observability & Logging

**Purpose**: Boundary and decision logging per handoff-checklist §G.

- [ ] T045 Add boundary logging to all backend services:
  - `[job-market]` prefix for job generation: "Generated {count} jobs" / "0 jobs generated (warning)"
  - `[fleet]` prefix for fleet operations: "Fleet generate: {vehicleCount} vehicles, {driverCount} drivers added (total: {totalV}/{totalD})"
  - `[recommender]` prefix: "Price recommendation for load {id}: base={base}, adr_mult={mult}, comp_factor={cf}, rating_factor={rf} → range £{min}–£{max}"
  - `[acceptance]` prefix: "Scoring quote {id} for load {loadId}: {signalCount} quotes in pool"
- [ ] T046 [P] Add decision logging:
  - `[acceptance]` Quote score breakdown: "Quote {id}: price={ps} eta={es} rating={rs} vehicle={vm} → composite={cs} (threshold={th}) → {accepted|rejected}"
  - `[acceptance]` ADR gate block: "Quote blocked: load {loadId} requires ADR, driver {driverId} not certified"
  - `[acceptance]` Price validation: "Quote rejected: price £{price} below minimum (rec_min × 0.50 = £{threshold})"
  - `[job-market]` Job generation city assignments: "Job {id}: {collection} → {delivery}, {distance}km, {vehicleType}, ADR={adr}"
- [ ] T047 [P] Ensure no PII in logs (no driver names, only IDs); logs structured enough to diagnose issues without reading source

**Checkpoint**: Generate jobs → see `[job-market]` logs with counts and city assignments. Submit quote → see `[acceptance]` logs with full score breakdown. Blocked ADR → see warning log.

---

## Phase 9: Integration Testing

**Purpose**: Verify against E2E scenarios from e2e-scenarios.md.

- [ ] T048 Write unit tests for Haversine: Birmingham→Leeds ≈ 160km; London→Glasgow ≈ 555km
- [ ] T049 [P] Write unit tests for recommender: EVAL-01 (20 test loads, formula correctness), EVAL-03 (competition factor impact, monotonic decrease, clamped at 0.70)
- [ ] T050 [P] Write unit tests for acceptance scoring: EVAL-02 (15 test quotes, score accuracy within ±0.01, correct accept/reject)
- [ ] T051 Write integration tests for E2E scenarios:
  - E2E-01: Submit quote happy path (ETA ~160min, recommender range ~£651–£881)
  - E2E-02: Single quote accepted (composite 0.9712, sole bidder threshold 0.50)
  - E2E-03: Competing quotes (Quote-A 0.8512 accepted, Quote-B 0.246 rejected)
  - E2E-04: Job generation (3 jobs, all posted, valid fields)
  - E2E-06: Fleet generation (3 drivers, 3 vehicles, profile updated)
- [ ] T052 [P] Write edge case tests:
  - E2E-EC-01: No vehicles → quote form disabled
  - E2E-EC-02: ADR hard gate → submission blocked (422)
  - E2E-EC-03: Duplicate quote prevention → rejected (409)
  - E2E-EC-04: Empty job board → empty state
  - E2E-EC-05: Vehicle type mismatch → warning, vehicle_match=0.0
- [ ] T053 [P] Write recommender edge case tests:
  - REC-EC-01: New fleet, default rating 3.0
  - REC-EC-02: 6+ quotes, competition factor clamped 0.70
  - REC-EC-03: Sole quote composite 0.48 → rejected
  - REC-EC-04: Two quotes both exceed 0.65 → higher wins
  - REC-EC-05: ADR required, no ADR driver → submission blocked

**Checkpoint**: All E2E scenarios pass. All edge cases handled. Composite scores match manual walkthroughs within ±0.01.

---

## Task Summary

| Phase | Tasks | Purpose |
|-------|-------|---------|
| 0 | T001–T007 | Setup: routes, sidebar, types, utilities |
| 1 | T008–T011 | Data layer: in-memory store |
| 2 | T012–T018 | Job generation + board |
| 3 | T019–T023 | Fleet management |
| 4 | T024–T029 | Quote submission + recommender |
| 5 | T030–T034 | Acceptance scoring |
| 6 | T035–T040 | Map integration |
| 7 | T041–T044 | Page assembly + polish |
| 8 | T045–T047 | Observability & logging |
| 9 | T048–T053 | Integration testing |

**Total**: 53 tasks across 10 phases.
