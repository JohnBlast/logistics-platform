# Data Quality Contract — Discovery Pipeline

> Defines dirty data patterns produced by the generator, normalization rules at each pipeline stage, field alias mappings, and number/date format handling. This document prevents re-discovering the same data issues when adding new query types.

## 1. Dirty Data Patterns (Generator Output)

The `dirtyDataGenerator` produces realistic dirty data. Every layer downstream must handle these patterns.

### 1.1 Status Values

| Canonical | Dirty variants (examples) |
|-----------|--------------------------|
| `accepted` | `Accepted`, `ACCEPTED`, `accepted `, `Acepted`, `acceptd`, `ACEPTED`, ` accepted` |
| `rejected` | `Rejected`, `REJECTED`, `Rejectd`, `reject`, `REJCTED`, ` rejected ` |
| `draft` | `Draft`, `DRAFT`, ` Draft `, `drft`, `DRAF` |
| `sent` | `Sent`, `SENT`, ` sent `, `snt`, `Sen` |
| `expired` | `Expired`, `EXPIRED`, `Exired`, `expirred`, `expird`, `EXPIRES` |
| `posted` | `Posted`, `POSTED`, ` posted `, `postd`, `Post`, `poste` |
| `in_transit` | `In Transit`, `in transit`, `IN TRANSIT`, `InTransit`, `in-transit`, `In Trasit` |
| `completed` | `Completed`, `COMPLETED`, `Complet`, `completd`, `COMPLETD` |
| `cancelled` | `Cancelled`, `CANCELED`, `Cancled`, `canceld`, `CANCELLED`, `Canceled` |

### 1.2 Location Values

| Type | Clean pool | Dirty pool (examples) |
|------|-----------|----------------------|
| Cities | `London`, `Birmingham`, `Manchester` | `london`, `Birmigham`, `MANCHESTER`, `Leeds `, `Glasow`, `Lverpool` |
| Towns | `Reading`, `Slough`, `Luton` | `slough`, `LUTON`, `Nothampton`, `Oxfrord`, `Cambrige` |

Generator biases: First 10% of loads are London→Birmingham; next 10% are Birmingham→London. ~30% of location values use dirty variants.

### 1.3 Numeric Values

| Pattern | Example | Frequency |
|---------|---------|-----------|
| Standard decimal | `1234.56` | ~25% |
| Comma-decimal (European) | `781,68` | ~25% |
| Trailing space | `1234.56 ` | ~12% |
| Unit suffix | `1234.56 GBP`, `1234.56£`, `350km` | ~12% |
| Capacity with unit | `3500 kg` | ~15% |
| Null | `null` | ~8-10% |

### 1.4 Date Formats

| Format | Example | Frequency |
|--------|---------|-----------|
| ISO 8601 | `2025-01-15T14:30:00.000Z` | ~25% |
| DD/MM/YYYY | `15/01/2025` | ~15% |
| MM-DD-YYYY | `01-15-2025` | ~10% |
| DD-MM-YYYY | `15-01-2025` | ~10% |
| DD.MM.YYYY | `15.01.2025` | ~10% |
| Trailing space | `15/01/2025 ` | ~5% |
| Double separator | `15//01/2025` | ~5% |
| Null | `null` | ~15% |

### 1.5 Name Values

~35% of names use dirty variants: case changes (`james`, `JOHN`), typos (`Davd`, `Micheal`), truncation (`Rober`).

### 1.6 Vehicle Types

~10% have case/whitespace issues: `SMALL_VAN`, `small_van  `, `LARGE_VAN`.

### 1.7 Fleet IDs

Pool of 5 UUIDs. ~70% of quotes use `FLEET_IDS[0]` (the "dominant tenant"). This ensures the tenant selected by Discovery has sufficient data.

---

## 2. Normalization Rules by Pipeline Stage

### Stage 1: ETL Mapping (`applyMappings`)

Transforms raw column names to canonical schema names.

| Raw column | Canonical field |
|-----------|----------------|
| `Quote Ref` | `quote_id` |
| `Load Reference` | `load_id` |
| `Quoted Amount` | `quoted_price` |
| `Status` | `status` |
| `Date Created` | `date_created` |
| `Distance (km)` | `distance_km` |
| `Fleet ID` | `associated_fleet_id` |
| `Quoter Name` | `fleet_quoter_name` |
| `Vehicle Type` | `requested_vehicle_type` / `vehicle_type` |
| `Load Number` | `load_id` |
| `Collection Town` | `collection_town` |
| `Collection City` | `collection_city` |
| `Collection Date` | `collection_date` |
| `Collection Time` | `collection_time` |
| `Delivery Town` | `delivery_town` |
| `Delivery City` | `delivery_city` |
| `Delivery Date` | `delivery_date` |
| `Delivery Time` | `delivery_time` |
| `Distance km` | `distance_km` |
| `Poster Name` | `load_poster_name` |
| `Vehicle ID` | `allocated_vehicle_id` / `vehicle_id` |
| `Driver ID` | `driver_id` |
| `Driver Name` | `driver_name` / `name` |
| `Type` | `vehicle_type` |
| `Capacity kg` | `capacity_kg` |

### Stage 2.5: AI Transformation (`applyTransformations`)

Runs after enum mapping, before deduplication. Deterministic cleaning based on TransformConfig (generated once from schema + sample data; Claude or mocked). Invisible to user.

| Field type | Transformation | Output |
|------------|----------------|--------|
| `date` | Parse DD/MM/YYYY, MM-DD-YYYY, DD-MM-YYYY, ISO, etc. | `YYYY-MM-DD` |
| `datetime` | Parse all formats | ISO 8601 |
| `number` | Strip £, GBP, km, kg; normalize comma-decimal/thousands | `"1234.56"` |
| `integer` | Parse to int | `42` |
| `location_city` | Fuzzy match to UK cities | `"Birmingham"` |
| `location_town` | Fuzzy match to UK towns | `"Reading"` |
| `person_name` | Title Case (no spell fix) | `"James Smith"` |
| `email` | Lowercase, trim | `"joe@example.com"` |
| `phone` | Strip non-digits | `"07123456789"` |
| `registration` | Uppercase, normalize separators | `"AB12 CDE"` |
| `uuid` | Trim | (trimmed) |
| `skip` | Enum fields (handled by Stage 2) | (unchanged) |

Post-transformation, Discovery receives clean data: canonical locations, ISO dates, numeric values without unit suffixes. `LOCATION_ALIASES` and `parseNum` remain as defense-in-depth for external data sources.

### Stage 2: Enum Mapping (`applyEnumMappings`)

Normalizes enum fields to canonical values using a three-tier resolution:

1. **Exact match**: `fieldMap[str]` from profile mappings
2. **Case-normalized match**: `str.trim().toLowerCase()` against valid values (e.g., `"ACCEPTED"` → `"accepted"`)
3. **Fuzzy match** (`fuzzyMatchEnum`):
   a. Normalize both strings (lowercase, underscores)
   b. Substring match (e.g., `"reject"` → `"rejected"`)
   c. Levenshtein distance with dynamic threshold: `max(2, floor(len × 0.3))`

| Entity | Enum fields | Valid values |
|--------|------------|-------------|
| `quote` | `status` | `draft`, `sent`, `accepted`, `rejected`, `expired` |
| `quote` | `requested_vehicle_type` | `small_van`, `medium_van`, `large_van`, `luton`, `rigid_7_5t`, `rigid_18t`, `rigid_26t`, `articulated` |
| `load` | `status` | `draft`, `posted`, `in_transit`, `completed`, `cancelled` |
| `driver_vehicle` | `vehicle_type` | same as vehicle types above |

### Stage 3: Deduplication

Removes duplicate rows per entity by primary key.

### Stage 4: Join (`runJoins`)

Produces flat table by joining Quote → Load → Driver+Vehicle.

**Critical join behaviour:**
- `q.status` is preserved as `quote_status` independently of `load.status`
- `load.status` is preserved as `load_status`
- If no Driver+Vehicle match, empty columns are filled with `null`

### Stage 5: View Derivation (`deriveViews`)

Creates filtered views from the flat table.

| View | Filter logic |
|------|-------------|
| `quotes` | All rows matching tenant's `associated_fleet_id` |
| `loads` | Delegates to `loads_and_quotes` |
| `loads_and_quotes` | `quote_status === "accepted"` (case-insensitive) AND matching tenant AND distinct by `load_id` |

**Tenant selection**: The fleet ID with the most rows in `flatRows` (dominant tenant), not the first encountered.

**Key resolution**: Uses `resolveKey` to find actual column names via aliases (e.g., `quote_status` → `Quote Status` → `Status`).

### Stage 6: Query Engine (`queryEngine`)

Final normalization at query time:

| Normalization | Implementation | Handles |
|--------------|---------------|---------|
| Field alias resolution | `getRowValue(row, field)` | `quoted_price` → `Quoted Amount`; `collection_city` → `Collection City` |
| Numeric parsing | `parseNum(v)` | `781,68` → `781.68`; `1,234.56` → `1234.56`; standard numbers |
| Location matching | `matchesValue(v, x)` via `LOCATION_ALIASES` | `Birmigham` matches `Birmingham` |
| Date comparison | `compareNumericOrDate(v, x, cmp)` | ISO date strings compared lexicographically |

---

## 3. Field Alias Mappings (Complete Reference)

### 3.1 Query Engine Aliases (`getRowValue`)

| Canonical field | Aliases tried (in order) |
|----------------|------------------------|
| `quoted_price` | `Quoted Amount`, `Quoted price`, `price` |
| `collection_town` | `Collection Town`, `collection town` |
| `delivery_town` | `Delivery Town`, `delivery town` |
| `collection_city` | `Collection City`, `collection city` |
| `delivery_city` | `Delivery City`, `delivery city` |
| `vehicle_type` | `Type`, `Vehicle Type`, `vehicle type` |
| `requested_vehicle_type` | `Vehicle Type`, `Type`, `requested_vehicle_type` |
| `driver_name` | `Driver Name`, `driver name`, `name` |
| `collection_date` | `Collection Date`, `collection date`, `Collection Time` |

Final fallback: normalized key comparison (lowercase, underscores).

### 3.2 View Derivation Aliases (`resolveKey`)

| Canonical field | Aliases tried |
|----------------|--------------|
| `associated_fleet_id` | `Fleet ID`, `fleet_id`, `fleetid` |
| `quote_status` | `Quote Status`, `quote status` |
| `status` | `Status` |
| `load_id` | `Load Number`, `Load Reference`, `load_number` |

### 3.3 Location Aliases (`LOCATION_ALIASES`)

| Canonical | Known dirty variants |
|-----------|---------------------|
| `london` | `London`, `LONDON` |
| `birmingham` | `Birmingham`, `Birmigham`, `birmigham`, `BIRMINGHAM` |
| `manchester` | `Manchester`, `MANCHESTER`, `Manchestter` |
| `leeds` | `Leeds`, `Leeds ` |
| `glasgow` | `Glasgow`, `Glasow` |
| `liverpool` | `Liverpool`, `Lverpool` |
| `edinburgh` | `Edinburgh`, `Edinbrugh` |
| `cardiff` | `Cardiff`, `CArdiff` |
| `newcastle` | `Newcastle`, `Newcstle` |
| `sheffield` | `Sheffield`, `Sheffeild` |
| `bristol` | `Bristol` |
| `nottingham` | `Nottingham`, `Nottingam` |
| `southampton` | `Southampton`, `Southhampton` |
| `brighton` | `Brighton`, `Bighton` |
| `coventry` | `Coventry`, `Coventy` |
| `hull` | `Hull`, ` Hul `, `Hul` |
| `bradford` | `Bradford`, `Bradfrord` |
| `stoke` | `Stoke`, `Stokee` |

---

## 4. Number Format Handling (`parseNum`)

The `parseNum` function in `queryEngine.ts` handles all numeric formats:

```
Input              → Output
typeof number      → pass through
null / undefined   → NaN
"781,68"           → 781.68   (comma-decimal: /^\d[\d\s]*,\d+$/)
"1,234.56"         → 1234.56  (comma-thousands: /^\d{1,3}(,\d{3})+(\.\d+)?$/)
"1234.56"          → 1234.56  (standard)
"1234.56 "         → 1234.56  (trimmed)
"350km"            → NaN      (unit suffix — stripped before ETL by mapping)
```

Rounding: Aggregated sums/averages are rounded to 2 decimal places (`Math.round(val * 100) / 100`).

---

## 5. Date Format Handling

### At query time (post-ETL)

Dates in `flatRows` after ETL should be in ISO format (`YYYY-MM-DD` or full ISO 8601). The query engine compares dates lexicographically after slicing to 10 characters:

```
"2025-01-15" >= "2025-01-10" → true (string comparison)
```

### Date truncation for grouping

| Format | Output |
|--------|--------|
| `day` | `YYYY-MM-DD` (first 10 chars) |
| `week` | `YYYY-Wnn` (ISO week) |
| `month` | `YYYY-MM` |
| `year` | `YYYY` |
