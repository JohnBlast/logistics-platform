# Job Market Simulation — Product Requirements Document

## 1. Overview

### Product Context

A 2-sided marketplace simulation within the Logistics Platform where Load Posters generate shipping jobs and Fleet Operators bid on work. This is product 003, unattached from the ETL Configurator (001) and Data Discovery (002) — the only connection is sidebar navigation. It extends the shared platform data model with marketplace-specific fields.

### Problem Statement

Fleet operators in logistics need to compete for work by quoting on available loads. Currently, they lack tools to view available jobs geographically, understand competitive pricing, and manage their fleet of vehicles and drivers in a single interface. Load posters similarly lack visibility into how their jobs attract quotes and which fleet operators offer the best value.

### Primary Goal (MVP)

Enable the platform to simulate a logistics marketplace where:

- **Fleet Operators** can view a job board, see jobs on a UK map, submit quotes aided by a pricing recommender, and manage their vehicles and drivers
- **Load Posters** can generate jobs on demand and have quotes automatically accepted or rejected based on scoring metrics

### Core Capability: Simulated 2-Sided Marketplace

The product uses a **simulation pattern**: all data (jobs, vehicles, drivers, quotes) is artificially generated rather than ingested from external sources. Load Posters generate jobs via an on-demand button. Fleet Operators bid on these jobs, with a rule-based recommender suggesting competitive prices. Quote acceptance is determined by a scoring formula, not manual review — this creates a feedback loop where Fleet Operators learn what makes a winning bid.

### Out of Scope (MVP)

- Real data ingestion (all data is simulated)
- Integration with ETL Configurator or Data Discovery
- Live routing or traffic-based ETA (straight-line distance only)
- LLM-powered features (planned for future iteration)
- Payment processing or invoicing
- Multi-currency (GBP only)
- Real-time notifications or WebSockets
- Postcode-level or street-level location resolution

---

## 2. Target Users

### Fleet Operator

An authenticated user representing a logistics fleet company.

**Capabilities:**

- View the job board (all posted loads)
- View jobs on a UK map with collection/delivery pins
- Submit quotes on available jobs (price, vehicle type, driver/ADR, ETA)
- See a recommended price range before quoting
- Manage fleet: create/generate vehicles and drivers
- View and edit fleet profile (company rating, job count)
- See quote status (accepted/rejected) and history

**Restrictions:**

- Cannot see other Fleet Operators' quotes or pricing
- Cannot modify a quote after submission
- Cannot create or delete jobs (only Load Posters generate jobs)

### Load Poster

A simulated user role that generates jobs and evaluates quotes. 

**Capabilities:**

- Generate new jobs on demand (button press)
- View all quotes received for their jobs
- System automatically accepts/rejects quotes based on scoring metrics

**Restrictions:**

- Cannot submit quotes
- Cannot manage vehicles or drivers
- Quote acceptance is algorithmic, not manual (in MVP)

---

## 3. User Journeys

### Journey 1: Fleet Operator Views Job Board and Submits a Quote

**Intent:** Fleet Operator wants to find available work and submit a competitive bid.

**Flow:**

1. Fleet Operator navigates to Job Market from the sidebar
2. Fleet Operator sees a job board listing all posted loads by multiple load posters (collection city, delivery city, distance, required vehicle type, ADR requirement)
3. Fleet Operator selects a job to view details
4. System displays a UK map showing: vehicle positions (pins), collection point (pin), delivery point (pin), straight-line from nearest vehicle to collection (with distance/ETA popup), and straight-line from collection to delivery (with distance/time popup)
5. System displays a recommended price range based on scoring signals
6. Fleet Operator fills in quote: price (£), selects vehicle and driver (system auto-flags ADR status), confirms vehicle type
7. Fleet Operator submits quote
8. System calculates ETA from selected vehicle's city to collection city
9. Quote appears in the Fleet Operator's quote history with status "sent"

**Outcome:** Quote is submitted and enters the acceptance scoring pipeline.

### Journey 2: Quote Acceptance Flow

**Intent:** Determine whether a submitted quote wins the job.

**Flow:**

1. Fleet Operator submits a quote (from Journey 1)
2. System scores the quote against acceptance metrics (price competitiveness, ETA, ADR match, fleet rating, vehicle type match)
3. System either accepts or rejects the quote
4. If accepted: Load status changes to "in_transit", quote status changes to "accepted", Fleet Operator sees confirmation
5. If rejected: Quote status changes to "rejected", Fleet Operator sees rejection with feedback on which metrics fell short

**Outcome:** Fleet Operator understands whether their bid won and why.

### Journey 3: Load Poster Generates Jobs

**Intent:** Create new shipping jobs for Fleet Operators to bid on.

**Flow:**

1. Load Poster navigates to the Job Market
2. Load Poster presses "Generate Jobs" button
3. System generates one or more jobs with randomised: collection city, delivery city (from UK hubs), required vehicle type, ADR requirement (yes/no), collection time
4. Jobs appear on the job board with status "posted"

**Outcome:** New jobs are available for Fleet Operators to bid on.

### Journey 4: Fleet Operator Manages Fleet

**Intent:** Fleet Operator wants to add or generate vehicles and drivers for their fleet.

**Flow:**

1. Fleet Operator navigates to fleet management section
2. Fleet Operator can manually create a driver (name, ADR certification yes/no) and Fleet Operator can manually create a vehicle (type, registration, capacity) or generate both of them.
3. Each vehicle and driver are have a current city filled (from UK hubs list)
4. Fleet profile updates automatically (driver and vehicle count)

**Outcome:** Fleet Operator has vehicles and drivers available for quoting on jobs.

### Journey 5: Fleet Operator Views Map

**Intent:** Fleet Operator wants to visualise job and fleet positions geographically.

**Flow:**

1. Fleet Operator views the map (UK-only, Leaflet + OpenStreetMap)
2. Map shows pins for: all fleet vehicles (by current city), selected job's collection point, selected job's delivery point
3. When a job is selected, map draws: straight line from nearest vehicle to collection (popup: X km, ~Y min), straight line from collection to delivery (popup: X km, ~Y min)
4. Map is bounded to UK (SW 49.9°N, 8.2°W to NE 60.9°N, 1.8°E), default center 53.0°N, 1.5°W, zoom 6

**Outcome:** Fleet Operator understands geographic context of jobs relative to their fleet.

---

## 4. Functional Requirements

### Job Board

- System shall display all loads with status "posted" in a list/table
- System shall show per job: collection city, delivery city, distance (km), required vehicle type, ADR requirement, collection time, number of existing quotes
- System shall allow Fleet Operators to select a job to view details and map
- System shall update the job board when new jobs are generated

### Quote Submission

- System shall allow Fleet Operator to submit a quote with: price (£), selected vehicle and driver
- System shall auto-populate: vehicle type (from selected vehicle), ADR status (from selected driver), ETA (calculated from vehicle's city to collection city)
- System shall display the recommended price range before submission
- System shall prevent quoting if Fleet Operator has no vehicles, drivers, or price
- System shall block quote submission if the job requires ADR and the selected driver does not have ADR certification

### Quote Recommender (Rule-Based)

- System shall calculate a recommended price range based on: distance (km), required vehicle type, ADR requirement, number of competing quotes, fleet rating
- System shall display the recommendation as a price range (min–max £)
- System shall update the recommendation when the user selects a different vehicle type

### Quote Acceptance (Scoring)

- System shall score each submitted quote against: price competitiveness (relative to other quotes and distance), ETA to collection, fleet rating, vehicle type match
- System shall accept or reject the quote based on the composite score
- System shall provide feedback on rejection (which metrics fell short)
- System shall rejects unrealistic quotes (zero, too low, too high, and distance from vehicle to collection time is too long)

### Job Generation

- System shall generate jobs with randomised parameters from the UK hubs lookup
- System shall generate realistic distance values using Haversine formula between collection and delivery cities
- System shall randomly assign vehicle type requirements and ADR requirements

### Fleet Management

- System shall allow creating and generating vehicles with: type, registration, capacity, current city
- System shall allow creating and generating drivers with: name, ADR certification
- System shall allow assigning drivers to vehicles
- System shall display the fleet profile: company name, total jobs completed, rating, driver count, vehicle count

### Map

- System shall render a Leaflet + OpenStreetMap map bounded to the UK
- System shall display pins for vehicle positions, collection points, and delivery points
- System shall draw straight-line polylines between: vehicle → collection, collection → delivery
- System shall show popups on lines with distance (km) and estimated time (minutes)

---

## 5. Data & Domain Concepts

All entities extend or reuse the shared platform data model. **Golden source:** `.specify/platform-data-model.md`

### Load

A shipping job posted by a Load Poster.

**Fields (existing):** `load_id`, `collection_town`, `collection_city`, `collection_time`, `collection_date`, `delivery_town`, `delivery_city`, `delivery_time`, `delivery_date`, `distance_km`, `status`, `load_poster_name`, `allocated_vehicle_id`, `driver_id`, `number_of_items`, `created_at`, `updated_at`

**Job Market usage:** `collection_city` and `delivery_city` map to the static UK hubs lookup for lat/lng at runtime. `distance_km` is calculated via Haversine at generation time. Status flow: `posted` → `in_transit` → `completed`.

### Quote

A bid submitted by a Fleet Operator on a load.

**Fields (existing + new):** `quote_id`, `load_id`, `quoted_price`, `status`, `date_created`, `distance_km`, `associated_fleet_id`, `fleet_quoter_name`, `requested_vehicle_type`, `eta_to_collection` *(new)*, `offered_vehicle_type` *(new)*, `adr_certified` *(new)*, `created_at`, `updated_at`

### Driver

A person operating a vehicle, belonging to a fleet.

**Fields (existing + new):** `driver_id`, `name`, `fleet_id`, `email`, `phone`, `has_adr_certification` *(new)*, `created_at`, `updated_at`

### Vehicle

A truck or van in the fleet.

**Fields (existing + new):** `vehicle_id`, `vehicle_type`, `registration_number`, `capacity_kg`, `driver_id`, `current_city` *(new)*, `created_at`, `updated_at`

### Fleet Profile *(new entity)*

Company-level profile for a fleet.

**Fields:** `fleet_id`, `company_name`, `total_jobs_completed`, `rating`, `driver_count`, `vehicle_count`, `created_at`, `updated_at`

### Job Market Data Objects

The Job Market manages these data objects in-memory (not persisted to a database in MVP). These are independent from the ETL pipeline outputs and Discovery views.

| Object | Description |
|--------|-------------|
| **Jobs (Loads)** | Posted loads available for bidding; generated on demand by Load Posters |
| **Quotes** | Bids submitted by Fleet Operators on jobs |
| **Vehicles** | Fleet vehicles with type and current city |
| **Drivers** | Fleet drivers with ADR certification status |
| **Fleet Profile** | Company-level profile: name, rating, completed job count, fleet size. Job Market–only data object — not part of ETL/Discovery. |

---

## 6. Key Relationships

- Fleet Profile has many Drivers (via `fleet_id`)
- Fleet Profile has many Vehicles (via driver's `fleet_id`)
- Load has many Quotes (via `load_id`)
- Quote belongs to one Fleet (via `associated_fleet_id`)
- Quote references one Vehicle (via `offered_vehicle_type` and ETA calculation from vehicle's `current_city`)
- Quote references one Driver (via `adr_certified` flag derived from driver)
- Vehicle may have one assigned Driver (via `driver_id`)
- Access: Fleet Operator can only see their own quotes, vehicles, and drivers
- Access: Fleet Operator can see all posted loads (job board is shared)

---

## 7. Success Criteria

### Marketplace Simulation

- Fleet Operator can view available jobs, submit quotes, and receive accept/reject feedback
- Load Poster can generate jobs on demand
- Quote acceptance scoring produces consistent, explainable results

### Map Visualisation

- UK map displays vehicle, collection, and delivery pins correctly
- Straight-line distances and ETAs match Haversine calculations
- Map is bounded to UK and loads at appropriate zoom level

### Fleet Management

- Fleet Operator can create/generate vehicles and drivers
- ADR certification is correctly tracked and reflected in quotes
- Fleet profile metrics update when jobs are completed

### Quote Recommender

- Recommended prices correlate with distance, vehicle type, and market conditions
- Recommendations update when inputs change

---

## 8. Edge Cases & Constraints

- **No vehicles/drivers/quote price**: Fleet Operator sees "Add vehicles and drivers to your fleet before quoting" or "You must add a quote price" message; quote form is disabled
- **No posted jobs**: Job board shows "No jobs available. Check back later." empty state
- **Job with no quotes**: Load remains "posted" indefinitely until quoted
- **All quotes rejected for a job**: Load remains "posted"; Fleet Operators can re-quote with better terms
- **City not in UK hubs lookup**: Should not occur — simulation only generates from the hubs list. If manual entry is added later, show validation error
- **Fleet Operator quotes on same job twice**: System prevents duplicate quotes per fleet per load
- **ADR required but driver not certified**: System blocks quote submission. Message: "This job requires ADR certification. Select an ADR-certified driver to quote." Quote form submit is disabled
- **Vehicle type mismatch**: System warns if offered vehicle type doesn't match requested; quote can still be submitted but will score poorly

---

## 9. Supported Capabilities (MVP)

### UK Hubs Lookup

A static constant mapping ~30-35 UK town/city names to `{ lat, lng }` coordinates. Used for:

- Map pin placement
- Simulated job generation (random collection/delivery cities)
- Haversine distance calculation
- ETA estimation


| Category          | Example Locations                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Major cities      | London, Birmingham, Manchester, Leeds, Glasgow, Liverpool, Bristol, Newcastle, Edinburgh, Cardiff, Sheffield, Nottingham |
| Distribution hubs | Daventry, Northampton, Milton Keynes, Doncaster, Wakefield, Warrington                                                   |
| Ports             | Felixstowe, Southampton, Dover, Immingham, Tilbury                                                                       |


### Distance & ETA


| Calculation   | Method                  | Notes                                      |
| ------------- | ----------------------- | ------------------------------------------ |
| Distance (km) | Haversine formula       | Straight-line between two city coordinates |
| ETA (minutes) | `distance_km / 60 * 60` | Assumes ~60 km/h average UK road speed     |


---

## 10. API Contract

### Generate Jobs

**Endpoint:** `POST /api/job-market/jobs/generate`

**Request:**

```json
{
  "count": 5
}
```

**Response:**

```json
{
  "jobs": [
    {
      "load_id": "uuid",
      "collection_city": "Birmingham",
      "delivery_city": "London",
      "distance_km": 163.5,
      "required_vehicle_type": "rigid_18t",
      "adr_required": false,
      "collection_time": "2026-02-24T09:00:00Z",
      "status": "posted"
    }
  ]
}
```

### Get Job Board

**Endpoint:** `GET /api/job-market/jobs?status=posted`

**Response:**

```json
{
  "jobs": [
    {
      "load_id": "uuid",
      "collection_city": "Manchester",
      "delivery_city": "Southampton",
      "distance_km": 340.2,
      "required_vehicle_type": "articulated",
      "adr_required": true,
      "collection_time": "2026-02-24T14:00:00Z",
      "status": "posted",
      "quote_count": 3
    }
  ]
}
```

### Submit Quote

**Endpoint:** `POST /api/job-market/quotes`

**Request:**

```json
{
  "load_id": "uuid",
  "quoted_price": 450.00,
  "vehicle_id": "uuid",
  "driver_id": "uuid"
}
```

**Response (success):**

```json
{
  "quote_id": "uuid",
  "status": "sent",
  "eta_to_collection": 95,
  "offered_vehicle_type": "rigid_18t",
  "adr_certified": true,
  "recommended_price": { "min": 380.00, "max": 520.00 }
}
```

**Response (ADR validation error — 422):**

```json
{
  "error": "ADR_REQUIRED",
  "message": "This job requires ADR certification. Select an ADR-certified driver to quote."
}
```

### Get Quote Result

**Endpoint:** `GET /api/job-market/quotes/:quote_id`

**Response:**

```json
{
  "quote_id": "uuid",
  "status": "accepted",
  "score_breakdown": {
    "price_score": 0.82,
    "eta_score": 0.75,
    "fleet_rating_score": 0.90,
    "vehicle_match": 1.0,
    "composite_score": 0.85
  }
}
```

### Get Recommended Price

**Endpoint:** `GET /api/job-market/quotes/recommend?load_id=uuid&vehicle_type=rigid_18t`

**Response:**

```json
{
  "recommended_price": { "min": 380.00, "max": 520.00 },
  "signals": {
    "distance_km": 340.2,
    "vehicle_type": "rigid_18t",
    "adr_required": true,
    "competing_quotes": 3,
    "fleet_rating": 4.2
  }
}
```

### Fleet Management

**Endpoint:** `POST /api/job-market/fleet/vehicles`

**Request:**

```json
{
  "vehicle_type": "rigid_18t",
  "registration_number": "AB12 CDE",
  "capacity_kg": 18000,
  "driver_id": "uuid",
  "current_city": "Birmingham"
}
```

**Endpoint:** `POST /api/job-market/fleet/drivers`

**Request:**

```json
{
  "name": "John Smith",
  "has_adr_certification": true
}
```

**Endpoint:** `POST /api/job-market/fleet/generate`

**Request:**

```json
{
  "vehicle_count": 5,
  "driver_count": 5
}
```

**Endpoint:** `GET /api/job-market/fleet/profile`

**Response:**

```json
{
  "fleet_id": "uuid",
  "company_name": "Express Logistics Ltd",
  "total_jobs_completed": 47,
  "rating": 4.2,
  "driver_count": 8,
  "vehicle_count": 6,
  "vehicles": [],
  "drivers": []
}
```

---

# ━━━ ADVANCED ━━━

## 16. Scoring & Ranking Contract (Recommender)

### 16.1 Candidate Generation

**Quote Recommender** — generates a suggested price range for the Fleet Operator before they submit a quote.

**Candidate pool:** Not applicable (the recommender suggests a price, it doesn't rank items). The "candidate" is a price range derived from scoring signals.

### 16.2 Scoring Signals (Quote Recommender)


| Signal                | Source                  | Weight | Description                                  |
| --------------------- | ----------------------- | ------ | -------------------------------------------- |
| distance_km           | Load entity             | Mid    | Longer distance = higher base price          |
| required_vehicle_type | Load entity             | Low    | Larger vehicles command higher prices        |
| adr_required          | Load entity             | ---    | ADR loads carry a premium                    |
| competing_quotes      | Count of quotes on load | High   | More competition = lower recommended price   |
| fleet_rating          | Fleet Profile           | Low    | Higher-rated fleets can charge slightly more |


**Price calculation approach (rule-based):**

```
base_price = distance_km × rate_per_km[vehicle_type]
adr_multiplier = adr_required ? 1.15 : 1.0
competition_factor = 1.0 - (competing_quotes × 0.05), clamped to [0.7, 1.0]
rating_factor = 0.95 + (fleet_rating / 5.0 × 0.10)

recommended_mid = base_price × adr_multiplier × competition_factor × rating_factor
recommended_min = recommended_mid × 0.85
recommended_max = recommended_mid × 1.15
```

**Rate per km by vehicle type:**


| Vehicle Type | Rate (£/km) |
| ------------ | ----------- |
| small_van    | 0.80        |
| medium_van   | 1.00        |
| large_van    | 1.20        |
| luton        | 1.40        |
| rigid_7_5t   | 1.60        |
| rigid_18t    | 2.00        |
| rigid_26t    | 2.40        |
| articulated  | 3.00        |


### 16.3 Scoring Signals (Quote Acceptance)

Determines whether the Load Poster's system accepts a quote.

**ADR prerequisite:** If the job requires ADR, only quotes from ADR-certified drivers are accepted. This is enforced at submission time (hard gate), not as a scoring signal. Non-ADR drivers cannot quote on ADR jobs.


| Signal             | Weight | Score Range | How Scored                                                                         |
| ------------------ | ------ | ----------- | ---------------------------------------------------------------------------------- |
| price_score        | 0.40   | 0.0–1.0     | Inverse normalised: cheapest quote among all for this load = 1.0, most expensive = 0.0 |
| eta_score          | 0.30   | 0.0–1.0     | Inverse normalised: fastest ETA = 1.0, slowest = 0.0                               |
| fleet_rating_score | 0.18   | 0.0–1.0     | `fleet_rating / 5.0`                                                                |
| vehicle_match      | 0.12   | 0.0 or 1.0  | 1.0 if offered vehicle type matches or exceeds requested; 0.0 otherwise             |


**Composite score:** Weighted sum of all signals.

**Acceptance threshold:** `composite_score >= 0.65` → accepted; below → rejected.

**Tie-breaking:** If multiple quotes exceed the threshold for the same load, the highest composite score wins. Only one quote is accepted per load.

### 16.4 Fallback Strategies


| Scenario                        | Strategy                                                            |
| ------------------------------- | ------------------------------------------------------------------- |
| Only one quote for a job        | Accept if composite score >= 0.50 (lower threshold for sole bidder) |
| No quotes after generation      | Load remains "posted"; no timeout in MVP                            |
| Fleet has no rating history     | Default rating = 3.0 (neutral)                                      |
| New fleet (zero completed jobs) | Fleet profile shows 0 completed, rating 3.0                         |


### 16.5 Acceptance Scenarios


| ID     | Given                                                                                                                     | When                     | Then                                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| REC-01 | Load requires rigid_18t, 200km, no ADR. Three quotes submitted: £400 (rating 4.5), £350 (rating 3.0), £500 (rating 4.8)   | System scores all quotes | £350 quote has highest price_score; final acceptance depends on composite of all signals                                              |
| REC-02 | Load requires ADR. Fleet Operator selects a non-ADR driver                                                                | System validates quote   | Quote submission blocked. "This job requires ADR certification. Select an ADR-certified driver to quote."                              |
| REC-03 | Load requires articulated. Fleet Operator offers small_van                                                                | System scores the quote  | vehicle_match = 0.0; composite score penalised by 0.12 weight                                                                         |
| REC-04 | Single quote on a load with composite score 0.52                                                                          | System evaluates         | Accepted (sole bidder threshold is 0.50)                                                                                              |
| REC-05 | Single quote on a load with composite score 0.45                                                                          | System evaluates         | Rejected (below sole bidder threshold of 0.50)                                                                                        |
| REC-06 | Fleet Operator asks for price recommendation on 300km articulated load, ADR required, 2 existing quotes, fleet rating 4.0 | System calculates        | base = 300 × 3.00 = £900; ADR premium = +15% → £1035; competition factor = 0.90; rating factor = 1.03; mid ≈ £959; range ≈ £815–£1103 |


---

## 18. Assumptions

- All data is in-memory for MVP (no persistent database)
- GBP (£) is the only currency
- UK is the only geography
- Average road speed of ~60 km/h is sufficient for ETA estimates
- The simulation runs in a single user session (no multi-user concurrency)
- Fleet Operator and Load Poster are role-based views within the same session, not separate authenticated users
- The platform constitution (`.specify/memory/constitution.md`) applies to this product

