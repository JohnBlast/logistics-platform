# End-to-End Test Scenarios — Job Market Simulation

## 1. Sample Data Reference

**Fleet setup:** 1 Fleet Operator ("Express Logistics Ltd") with fleet_id `fleet-001`, rating 4.2, 3 vehicles, 3 drivers.

**Drivers:**
```json
[
  { "driver_id": "d-001", "name": "Alice Smith", "fleet_id": "fleet-001", "has_adr_certification": true },
  { "driver_id": "d-002", "name": "Bob Jones", "fleet_id": "fleet-001", "has_adr_certification": false },
  { "driver_id": "d-003", "name": "Carol Davis", "fleet_id": "fleet-001", "has_adr_certification": true }
]
```

**Vehicles:**
```json
[
  { "vehicle_id": "v-001", "vehicle_type": "rigid_18t", "registration_number": "AB12 CDE", "capacity_kg": 18000, "driver_id": "d-001", "current_city": "Birmingham" },
  { "vehicle_id": "v-002", "vehicle_type": "articulated", "registration_number": "XY34 FGH", "capacity_kg": 26000, "driver_id": "d-002", "current_city": "London" },
  { "vehicle_id": "v-003", "vehicle_type": "small_van", "registration_number": "JK56 LMN", "capacity_kg": 1000, "driver_id": "d-003", "current_city": "Manchester" }
]
```

**Posted jobs (Loads):**
```json
[
  { "load_id": "load-001", "collection_city": "Leeds", "delivery_city": "Southampton", "distance_km": 370.5, "required_vehicle_type": "rigid_18t", "adr_required": false, "status": "posted", "collection_time": "2026-02-24T09:00:00Z" },
  { "load_id": "load-002", "collection_city": "Birmingham", "delivery_city": "Felixstowe", "distance_km": 220.8, "required_vehicle_type": "articulated", "adr_required": true, "status": "posted", "collection_time": "2026-02-24T14:00:00Z" },
  { "load_id": "load-003", "collection_city": "Glasgow", "delivery_city": "London", "distance_km": 555.0, "required_vehicle_type": "small_van", "adr_required": false, "status": "posted", "collection_time": "2026-02-25T08:00:00Z" }
]
```

**UK Hubs (subset for calculations):**
| City | Lat | Lng |
|------|-----|-----|
| Birmingham | 52.486 | -1.890 |
| Leeds | 53.801 | -1.549 |
| Southampton | 50.910 | -1.404 |
| London | 51.507 | -0.128 |
| Manchester | 53.481 | -2.243 |
| Glasgow | 55.864 | -4.252 |
| Felixstowe | 51.954 | 1.351 |

---

## 2. Scenario Format

Each scenario specifies:

| Element | Description |
|---------|-------------|
| **Preconditions** | What data must exist and in what state |
| **User action** | The exact input (button click, form submission, API call) |
| **Expected intermediate states** | Data shape at each pipeline boundary |
| **Expected final output** | Columns, row count, value constraints |

---

## 3. Scenarios

### E2E-01: Fleet Operator Submits a Quote (Happy Path)

| Element | Value |
|---------|-------|
| **Preconditions** | Fleet "Express Logistics Ltd" (fleet-001, rating 4.2) exists. Vehicle v-001 (rigid_18t, Birmingham, driver d-001 ADR=true). Load-001 posted (Leeds → Southampton, 370.5km, rigid_18t, no ADR). No existing quotes on load-001. |
| **User action** | Fleet Operator selects load-001, selects vehicle v-001 and driver d-001, enters price £741, submits quote. |

**Expected intermediate states:**

1. **ETA calculation**: Vehicle in Birmingham, collection in Leeds.
   - Haversine(Birmingham → Leeds) ≈ 160 km
   - ETA = 160 / 60 × 60 = 160 minutes

2. **Quote record created:**
```json
{
  "quote_id": "auto-generated",
  "load_id": "load-001",
  "quoted_price": 741.00,
  "status": "sent",
  "associated_fleet_id": "fleet-001",
  "offered_vehicle_type": "rigid_18t",
  "adr_certified": true,
  "eta_to_collection": 160,
  "distance_km": 370.5
}
```

3. **Recommender output** (before submission):
   - base_price = 370.5 × 2.00 = £741.00
   - adr_premium = 0 (not required)
   - competition_factor = 1.0 (0 competing quotes)
   - rating_factor = 0.95 + (4.2 / 5.0 × 0.10) = 1.034
   - recommended_mid = 741.00 × 1.0 × 1.034 = £766.19
   - recommended_min = £651.26, recommended_max = £881.12

| Element | Value |
|---------|-------|
| **Expected output** | Quote created with status "sent". Recommender showed range ~£651–£881. Quote appears in fleet's quote history. |

---

### E2E-02: Quote Acceptance — Single Quote Accepted

| Element | Value |
|---------|-------|
| **Preconditions** | Load-001 has one quote (from E2E-01): price £741, ETA 160min, ADR=true (not required), fleet rating 4.2, vehicle rigid_18t (matches). |
| **User action** | System evaluates the quote for acceptance. |

**Scoring breakdown (sole bidder, threshold 0.50):**

Note: ADR is a hard gate enforced at submission. Since load-001 does not require ADR, any driver can quote. ADR is not a scoring signal.

| Signal | Value | Weight | Score |
|--------|-------|--------|-------|
| price_score | 1.0 (only quote, so both cheapest and most expensive — use 1.0) | 0.40 | 0.40 |
| eta_score | 1.0 (only quote) | 0.30 | 0.30 |
| fleet_rating_score | 4.2 / 5.0 = 0.84 | 0.18 | 0.1512 |
| vehicle_match | 1.0 (rigid_18t matches rigid_18t) | 0.12 | 0.12 |
| **composite** | | | **0.9712** |

| Element | Value |
|---------|-------|
| **Expected output** | Composite score 0.9712 >= 0.50 (sole bidder threshold). Quote accepted. Load-001 status → "in_transit". Quote status → "accepted". |

---

### E2E-03: Quote Acceptance — Competing Quotes, Best Wins

| Element | Value |
|---------|-------|
| **Preconditions** | Load-002 (Birmingham → Felixstowe, 220.8km, articulated, ADR required). Two quotes submitted: Quote-A from fleet-001 (price £700, ETA 0min [vehicle already in Birmingham], driver d-001 ADR=true, vehicle articulated=no [v-001 is rigid_18t]). Quote-B from fleet-002 (price £750, ETA 180min, driver ADR=true, vehicle articulated=yes, fleet rating 3.5). |
| **User action** | System evaluates both quotes. |

Note: ADR is a hard gate. Both drivers have ADR certification (required for load-002), so both passed the gate. ADR is not scored.

**Quote-A scoring:**

| Signal | Value | Weight | Score |
|--------|-------|--------|-------|
| price_score | 1.0 (cheapest: £700 vs £750) | 0.40 | 0.40 |
| eta_score | 1.0 (fastest: 0 vs 180) | 0.30 | 0.30 |
| fleet_rating_score | 4.2 / 5.0 = 0.84 | 0.18 | 0.1512 |
| vehicle_match | 0.0 (offered rigid_18t, requested articulated) | 0.12 | 0.00 |
| **composite** | | | **0.8512** |

**Quote-B scoring:**

| Signal | Value | Weight | Score |
|--------|-------|--------|-------|
| price_score | 0.0 (most expensive) | 0.40 | 0.00 |
| eta_score | 0.0 (slowest) | 0.30 | 0.00 |
| fleet_rating_score | 3.5 / 5.0 = 0.70 | 0.18 | 0.126 |
| vehicle_match | 1.0 (articulated matches) | 0.12 | 0.12 |
| **composite** | | | **0.246** |

| Element | Value |
|---------|-------|
| **Expected output** | Quote-A: composite 0.8512 >= 0.65 → accepted. Quote-B: composite 0.246 < 0.65 → rejected. Only one quote accepted per load. |

---

### E2E-04: Job Generation

| Element | Value |
|---------|-------|
| **Preconditions** | UK hubs lookup loaded. No existing jobs. |
| **User action** | Load Poster presses "Generate Jobs" with count=3. |

**Expected intermediate states:**

1. **Random city selection**: System picks collection_city and delivery_city from the UK hubs lookup (must be different cities)
2. **Distance calculation**: Haversine between the two cities' coordinates
3. **Random attributes**: vehicle_type from enum, adr_required (boolean), collection_time (future timestamp)

| Element | Value |
|---------|-------|
| **Expected output** | 3 new Load records, each with: status="posted", distance_km > 0, collection_city ≠ delivery_city, valid vehicle_type enum, collection_time in the future. Jobs appear on the job board. |

---

### E2E-05: Map Visualisation

| Element | Value |
|---------|-------|
| **Preconditions** | Fleet-001 with vehicles in Birmingham, London, Manchester. Load-001 (Leeds → Southampton) selected. |
| **User action** | Fleet Operator views map with load-001 selected. |

**Expected map state:**

| Map Element | Expected |
|-------------|----------|
| Vehicle pins | 3 pins: Birmingham (52.486, -1.890), London (51.507, -0.128), Manchester (53.481, -2.243) |
| Collection pin | Leeds (53.801, -1.549) |
| Delivery pin | Southampton (50.910, -1.404) |
| Vehicle → collection line | Birmingham → Leeds (nearest vehicle). Popup: ~160 km, ~160 min |
| Collection → delivery line | Leeds → Southampton. Popup: ~370 km, ~370 min |
| Map bounds | UK only: SW (49.9, -8.2) to NE (60.9, 1.8) |

---

### E2E-06: Fleet Management — Generate Vehicles and Drivers

| Element | Value |
|---------|-------|
| **Preconditions** | Fleet-001 exists with 0 vehicles and 0 drivers. |
| **User action** | Fleet Operator clicks "Generate" with vehicle_count=3, driver_count=3. |

| Element | Value |
|---------|-------|
| **Expected output** | 3 Driver records (each with random name, random ADR true/false). 3 Vehicle records (each with random vehicle_type from enum, random registration, random current_city from UK hubs). Fleet profile updates: driver_count=3, vehicle_count=3. |

---

## 4. Edge Case Scenarios

### E2E-EC-01: Quote When No Vehicles Exist

| Element | Value |
|---------|-------|
| **Preconditions** | Fleet-001 exists but has 0 vehicles and 0 drivers. Load-001 is posted. |
| **User action** | Fleet Operator tries to submit a quote on load-001. |
| **Expected behaviour** | Quote form is disabled. Message: "Add vehicles and drivers to your fleet before quoting." |
| **Expected output** | No quote created. Fleet Operator directed to fleet management. |

### E2E-EC-02: ADR Required but Driver Not Certified (Hard Gate)

| Element | Value |
|---------|-------|
| **Preconditions** | Load-002 requires ADR. Fleet Operator selects driver d-002 (has_adr_certification=false). |
| **User action** | Fleet Operator attempts to submit quote with non-ADR driver. |
| **Expected behaviour** | System blocks quote submission. Message: "This job requires ADR certification. Select an ADR-certified driver to quote." Submit button is disabled. |
| **Expected output** | No quote created. Fleet Operator must select an ADR-certified driver (d-001 or d-003) to proceed. |

### E2E-EC-03: Duplicate Quote Prevention

| Element | Value |
|---------|-------|
| **Preconditions** | Fleet-001 already has a quote on load-001. |
| **User action** | Fleet Operator tries to submit another quote on load-001. |
| **Expected behaviour** | System prevents submission. Message: "You have already quoted on this job." |
| **Expected output** | No new quote created. |

### E2E-EC-04: Empty Job Board

| Element | Value |
|---------|-------|
| **Preconditions** | No loads with status "posted" exist. |
| **User action** | Fleet Operator navigates to job board. |
| **Expected behaviour** | Empty state displayed: "No jobs available. Check back later." |
| **Expected output** | Empty job list. No errors. |

### E2E-EC-05: Vehicle Type Mismatch

| Element | Value |
|---------|-------|
| **Preconditions** | Load-003 requires small_van. Fleet Operator selects vehicle v-001 (rigid_18t). |
| **User action** | Fleet Operator submits quote with wrong vehicle type. |
| **Expected behaviour** | Warning shown: "This job requests a small_van. You're offering a rigid_18t." Quote can still be submitted. |
| **Expected output** | Quote created with offered_vehicle_type=rigid_18t. In scoring: vehicle_match=0.0, reducing composite score by 0.10 weight. |

---

## 6. Evaluation Scenarios (Recommender)

### EVAL-01: Quote Recommender Price Accuracy

| Element | Value |
|---------|-------|
| **Preconditions** | 20 test loads with known distances, vehicle types, and ADR requirements. 0–5 existing quotes per load. Fleet rating varies from 2.0 to 5.0. |
| **Evaluation method** | For each load, compute recommended price range. Verify it follows the formula from PRD §16.2. |
| **Metrics & targets** | |

| Metric | Target | Rationale |
|--------|--------|-----------|
| Formula correctness | 100% | Rule-based — every output must exactly match the formula |
| Range width | min is 85% of mid, max is 115% of mid | Consistent band width |
| Price > 0 | 100% | No negative or zero prices |
| ADR premium applied when required | 100% | 15% uplift present |

| Element | Value |
|---------|-------|
| **Pass criteria** | All targets met for all 20 test loads |
| **Fail action** | Fix formula implementation; retest |

### EVAL-02: Quote Acceptance Scoring Consistency

| Element | Value |
|---------|-------|
| **Preconditions** | 15 test quotes with known signal values (4 signals: price, ETA, fleet_rating, vehicle_match). All quotes pass ADR gate. Manual composite scores pre-calculated. |
| **Evaluation method** | For each quote, compute composite score using 4 signals (weights: 0.40, 0.30, 0.18, 0.12). Compare against manual calculation. Verify accept/reject decision matches threshold rules. |
| **Metrics & targets** | |

| Metric | Target | Rationale |
|--------|--------|-----------|
| Score accuracy | Within ±0.01 of manual calculation | Floating point tolerance |
| Threshold correctness | 100% correct accept/reject | 0.65 for multiple quotes, 0.50 for sole bidder |
| Single winner per load | 100% | Only highest-scoring quote accepted when multiple exceed threshold |

| Element | Value |
|---------|-------|
| **Pass criteria** | All 15 test quotes scored correctly with correct accept/reject decisions |
| **Fail action** | Fix scoring implementation; verify weight application order |

### EVAL-03: Competition Factor Impact

| Element | Value |
|---------|-------|
| **Change** | Verify that more competing quotes reduces recommended price |
| **Expected improvement** | Recommended mid-price decreases as competing_quotes increases |
| **Maximum acceptable regression** | Price should never go below 70% of the base (competition_factor clamped to 0.7) |
| **Evaluation method** | For the same load, compute recommended price with 0, 1, 3, 5, 6+ competing quotes. Verify monotonic decrease, clamped at 0.7. |

**Manual walkthrough (load-001, rigid_18t, 370.5km, no ADR, fleet rating 4.2):**

| Competing Quotes | Competition Factor | Recommended Mid (approx) |
|-----------------|-------------------|-------------------------|
| 0 | 1.00 | £766 |
| 1 | 0.95 | £728 |
| 3 | 0.85 | £651 |
| 5 | 0.75 | £575 |
| 6 | 0.70 (clamped) | £536 |
| 10 | 0.70 (clamped) | £536 |

### Recommender Edge Case Scenarios

| ID | Given | When | Then |
|----|-------|------|------|
| REC-EC-01 | New fleet with 0 completed jobs, no rating | Fleet requests price recommendation | Default rating 3.0 used. Rating factor = 0.95 + (3.0/5.0 × 0.10) = 1.01. Price is calculated normally. |
| REC-EC-02 | Load with 6+ existing quotes | Fleet requests price recommendation | Competition factor clamped at 0.70 (not 0.65 or lower). |
| REC-EC-03 | Sole quote with composite score 0.48 | System evaluates acceptance | Rejected (below sole bidder threshold of 0.50). Quote status = "rejected". Load remains "posted". |
| REC-EC-04 | Two quotes both exceed 0.65 threshold | System evaluates acceptance | Higher composite score wins. Only one accepted. Other rejected. |
| REC-EC-05 | Load requires ADR, only available driver has no ADR, fleet has no other drivers | Fleet tries to quote | Quote submission blocked. "This job requires ADR certification. Select an ADR-certified driver to quote." No quote created. |

---

## 7. Boundary State Expectations

| Boundary | Key assertion |
|----------|--------------|
| After job generation | All loads have status "posted", collection_city ≠ delivery_city, distance_km > 0, valid vehicle_type enum |
| After fleet generation | All drivers have fleet_id set, has_adr_certification is boolean, all vehicles have valid vehicle_type and current_city from UK hubs |
| After ADR gate | If job requires ADR, only ADR-certified drivers can quote. Non-ADR driver → submission blocked. |
| After quote submission | Quote has all required fields populated, ETA calculated from vehicle city to collection city, adr_certified derived from driver |
| After recommender | Price range has min < mid < max, min = mid × 0.85, max = mid × 1.15, all values > 0 |
| After acceptance scoring | Composite score is weighted sum of 4 signals (price 0.40, ETA 0.30, fleet_rating 0.18, vehicle_match 0.12), threshold applied correctly (0.65 or 0.50 for sole bidder), at most one accepted quote per load |
| After acceptance decision | Accepted quote status = "accepted", load status = "in_transit". Rejected quote status = "rejected", load remains "posted" if no accepted quote. |
| Map rendering | All pins correspond to valid UK hub coordinates within bounds (49.9–60.9°N, 8.2°W–1.8°E). Lines connect correct pairs. Popups show non-zero distance and time. |
