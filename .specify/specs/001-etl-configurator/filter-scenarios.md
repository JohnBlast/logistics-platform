# Natural Language Filter Scenarios

Supported natural language patterns for the Filtering step. Both rule-based (mocked AI) and Claude-backed interpretation support these.

## Compound conditions (field present + numeric)

These produce **multiple rules** (AND'd):

| User says | Rules produced |
|-----------|----------------|
| I want to see only loads with capacity_kg and with more than 1000kg | capacity_kg present, capacity_kg > 1000 |
| loads with capacity_kg and more than 1000kg | same |
| loads with capacity_kg and less than 500 | capacity_kg present, capacity_kg < 500 |
| loads with quoted_price and over 2000 | quoted_price present, quoted_price > 2000 |
| loads with distance_km and at least 50km | distance_km present, distance_km >= 50 |
| loads with capacity_kg and at most 3000 | capacity_kg present, capacity_kg <= 3000 |

## Between / range

| User says | Rules produced |
|-----------|----------------|
| between 100 and 500 on capacity_kg | capacity_kg >= 100, capacity_kg <= 500 |
| capacity_kg between 100 and 500 | same |
| from 50 to 200 on distance_km | distance_km >= 50, distance_km <= 200 |

## Single inclusion

| User says | Rule |
|-----------|------|
| include loads that have capacity_kg | capacity_kg is not null |
| I only want loads with status | status is not null |
| keep loads with email | email is not null |
| I only want to see rows with less than 500 on capacity_kg | capacity_kg < 500 |
| capacity_kg under 500 | capacity_kg < 500 |
| I only want Luton and large_van vehicle types | requested_vehicle_type IN [luton, large_van] |

## Single exclusion

| User says | Rule |
|-----------|------|
| remove London loads | 4 rules: exclude if collection_town/city or delivery_town/city contains London |
| exclude Manchester loads | same (exclude rows with place in any location field) |
| exclude cancelled loads | status = cancelled (exclude) |
| remove loads that don't have capacity_kg | capacity_kg is null (exclude) |
| remove loads without capacity_kg | same |
| Remove all loads with a collection from Leeds | collection_city contains Leeds (exclude) |
| exclude rows where quoted_price is over 2000 | quoted_price > 2000 (exclude) |
| remove loads that are small vans | requested_vehicle_type = small_van (exclude) |
| Remove any row with a null value | has_any_null (exclude any row with any blank cell) |

## Field aliases

- capacity, capacity kg → capacity_kg  
- price, quoted price → quoted_price  
- distance, distance km → distance_km  
- collection city/town, delivery city/town, etc.  

## Multi-value exclusion

| User says | Rules produced |
|-----------|----------------|
| exclude cancelled and rejected loads | status = cancelled (exclude), status = rejected (exclude) |
| remove cancelled, rejected and draft | 3 exclusion rules |

## Location inclusion

| User says | Rule |
|-----------|------|
| include loads from Manchester | collection_city contains Manchester (inclusion) |
| keep loads from London | same |

## Numeric operators

- more than, greater than, over, above → `>`
- less than, under, below → `<`
- at least, minimum, min → `>=`
- at most, no more than, maximum, max → `<=`
