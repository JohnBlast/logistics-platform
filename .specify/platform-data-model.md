# Platform Data Model

**Status**: Canonical for all products  
**Products**: 001 ETL Configurator, 002 Logistics Discovery (and future products)  
**Last updated**: 2025-02-20

---

## Principle: One Data Model

The platform uses a **single data model** across all products. The ETL Configurator (001) transforms raw data into this schema. The Logistics Discovery tool (002) and other downstream products consume data that conforms to this schema. No product invents its own field names or structures.

**Naming convention:** `snake_case` for all field names.

---

## Domain Entities

| Entity | Description |
|--------|-------------|
| Quote | Price offered by fleet for a load; status draft/sent/accepted/rejected/expired |
| Load | Shipping job; status draft/posted/in_transit/completed/cancelled |
| Driver | Person operating vehicle; belongs to fleet |
| Vehicle | Truck/van; type enum; has optional driver_id |
| Fleet | Logistics company (implied via fleet_id) |

---

## Entity Schemas

### Quote
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| quote_id | UUID | Yes | Unique quote identifier (PK) |
| load_id | UUID | Yes | Reference to the load being quoted |
| quoted_price | DECIMAL | Yes | Price offered in pounds (£) |
| status | enum | Yes | draft, sent, accepted, rejected, expired |
| date_created | TIMESTAMP | Yes | When the quote was created |
| distance_km | DECIMAL | No | Distance in kilometres |
| associated_fleet_id | UUID | Yes | Fleet making the quote (tenant identifier for Fleet Operator) |
| fleet_quoter_name | VARCHAR | Yes | Name of person who quoted |
| requested_vehicle_type | enum | Yes | Vehicle type requested |
| created_at | TIMESTAMP | Yes | Record creation timestamp |
| updated_at | TIMESTAMP | Yes | Last update timestamp |

### Load
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| load_id | UUID | Yes | Unique load identifier (PK) |
| collection_town | VARCHAR | No | Town where load is collected |
| collection_city | VARCHAR | No | City where load is collected |
| collection_time | TIMESTAMP | No | Collection time |
| collection_date | DATE | No | Collection date |
| delivery_town | VARCHAR | No | Town where load is delivered |
| delivery_city | VARCHAR | No | City where load is delivered |
| delivery_time | TIMESTAMP | No | Delivery time |
| delivery_date | DATE | No | Delivery date |
| distance_km | DECIMAL | No | Distance in kilometres |
| status | enum | Yes | draft, posted, in_transit, completed, cancelled |
| completion_date | DATE | No | When the load was completed |
| load_poster_name | VARCHAR | Yes | Name of person who posted the load |
| allocated_vehicle_id | UUID | No | Vehicle assigned to the load |
| driver_id | UUID | No | Driver assigned to the load |
| number_of_items | INTEGER | No | Number of items in the load |
| created_at | TIMESTAMP | Yes | Record creation timestamp |
| updated_at | TIMESTAMP | Yes | Last update timestamp |

### Driver
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| driver_id | UUID | Yes | Unique driver identifier (PK) |
| name | VARCHAR | Yes | Driver full name |
| fleet_id | UUID | Yes | Fleet the driver belongs to |
| email | VARCHAR | No | Driver email |
| phone | VARCHAR | No | Driver phone number |
| created_at | TIMESTAMP | Yes | Record creation timestamp |
| updated_at | TIMESTAMP | Yes | Last update timestamp |

### Vehicle
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| vehicle_id | UUID | Yes | Unique vehicle identifier (PK) |
| vehicle_type | enum | Yes | small_van, medium_van, large_van, luton, rigid_7_5t, rigid_18t, rigid_26t, articulated |
| registration_number | VARCHAR | Yes | Vehicle registration plate |
| capacity_kg | DECIMAL | No | Maximum load capacity in kg |
| driver_id | UUID | No | Assigned driver (optional) |
| created_at | TIMESTAMP | Yes | Record creation timestamp |
| updated_at | TIMESTAMP | Yes | Last update timestamp |

---

## ETL Pipeline Output: Four Data Objects

The ETL Configurator produces **four outputs** (all post-join, post-filter):

| Output | Description | Row shape |
|--------|-------------|-----------|
| **Flat** | Combined wide table: Quote + Load + Vehicle + Driver | One row per Quote; all entity fields merged |
| **Quote** | Quote entity rows only | One row per Quote (project Quote fields from flat) |
| **Load** | Load entity rows only | One row per Load, distinct by `load_id` |
| **Vehicle+Driver** | Vehicle with Driver rows | One row per Vehicle, distinct by `vehicle_id` |

**Join flow:**
```
Quote ──(load_id)──► Load ──(allocated_vehicle_id OR driver_id)──► Driver+Vehicle
```

**Derivation:**
- **Flat:** The joined result—only rows where Quote, Load, and Vehicle+Driver connected (accepted/successful matches).
- **Quote:** Full quote dataset (all quotes, including those not in flat). Not derived from flat.
- **Load:** Full load dataset (all loads). Not derived from flat.
- **Vehicle+Driver:** Full driver+vehicle dataset (all). Not derived from flat.

Quotes, loads, and drivers that don't appear in the flat are still valid—they are shown in their respective entity views.

**UI:** The user can view Flat, Quote, Load, and Vehicle+Driver across ETL steps (Joins, Filtering, Validation) and on Show Overall Data.

---

## Downstream Product Consumption

Products that consume ETL output (e.g. Logistics Discovery) may use any of the four outputs. Discovery derives **views** from the flat table:

| View | Derivation |
|------|------------|
| **quotes** | Project Quote fields from flat; one row per quote. Filter by tenant (associated_fleet_id) for Fleet Operator access. |
| **loads** | Distinct by load_id; project Load fields. For Fleet Operator: only loads where the accepted quote has associated_fleet_id = tenant. |
| **loads_and_quotes** | Filter flat where quote.status = 'accepted'; distinct by load_id. One row per load with its accepted quote. Tenant filter as for loads. |

**Tenant identification (Fleet Operator):** `associated_fleet_id` on Quote identifies the Fleet Operator tenant. A Fleet Operator sees:
- Quotes where `associated_fleet_id` = their tenant
- Loads where the accepted quote's `associated_fleet_id` = their tenant

---

## Product Integration: ETL → Discovery

**Data flow:** The Simulate Pipeline (Show Overall Data) page produces the pipeline output. When the user adds data and runs the pipeline, that output becomes the input for Logistics Discovery. Discovery derives its queryable views (`quotes`, `loads`, `loads_and_quotes`) from the flat table.

**Contract:** ETL exposes `flatRows`, `quoteRows`, `loadRows`, `vehicleDriverRows` via the pipeline run API. Discovery consumes this structure. No separate export step in MVP.
