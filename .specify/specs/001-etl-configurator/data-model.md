# Data Model – 001 ETL Configurator

Target schema for the logistics platform ETL. **Platform canonical:** This schema conforms to the platform data model (`.specify/platform-data-model.md`), which is the single source of truth for all products.

## Domain Entities

| Entity | Description |
|--------|-------------|
| Quote | Price offered by fleet for a load; status draft/sent/accepted/rejected/expired |
| Load | Shipping job; status draft/posted/in_transit/completed/cancelled |
| Driver | Person operating vehicle; belongs to fleet |
| Vehicle | Truck/van; type enum; has optional driver_id |
| Fleet | Logistics company (implied via fleet_id) |

## Target Schema

### Quote
- quote_id (UUID, PK), load_id (UUID, FK), quoted_price, status, date_created
- distance_km, associated_fleet_id, fleet_quoter_name, requested_vehicle_type
- created_at, updated_at

### Load
- load_id (UUID, PK), collection_*, delivery_*, status
- load_poster_name, allocated_vehicle_id, driver_id (at least one of vehicle/driver for join)
- number_of_items, created_at, updated_at

### Driver
- driver_id (UUID, PK), name, fleet_id, email, phone, created_at, updated_at

### Vehicle
- vehicle_id (UUID, PK), vehicle_type, registration_number, capacity_kg, driver_id (optional)
- created_at, updated_at

## Join Order

```
Quote ──(load_id)──► Load ──(allocated_vehicle_id OR driver_id)──► Driver+Vehicle
```

## Pipeline Output (Four Data Objects)

| Output | Description |
|--------|-------------|
| **Flat** | Connected rows only—Quote + Load + Vehicle+Driver that successfully joined |
| **Quote** | Full quote dataset (all quotes; includes those not in flat) |
| **Load** | Full load dataset (all loads) |
| **Vehicle+Driver** | Full driver+vehicle dataset (all) |

Flat = accepted/successful connections. Quote, Load, Vehicle+Driver = full entity datasets (nothing dropped from view).

The user sees all four views in Joins, Filtering, Validation, and Show Overall Data.

## Source Structure

| Source | Structure |
|--------|-----------|
| Quote file | One row per quote; CSV or Excel |
| Load file | One row per load; CSV or Excel |
| Driver+Vehicle file | One row per vehicle with driver; vehicle-centric |

## Deduplication

Per entity before joins. Keep row with latest `updated_at`. Keys: quote_id, load_id, driver_id, vehicle_id.
