/**
 * Central config for mocked AI mode.
 * Single source of truth for predetermined joins, field aliases, and supported patterns.
 */

import {
  QUOTE_STATUS,
  LOAD_STATUS,
  VEHICLE_TYPES,
  QUOTE_FIELDS,
  LOAD_FIELDS,
  DRIVER_FIELDS,
  VEHICLE_FIELDS,
} from '../models/schema.js'

/** Suggested joins for mocked mode - standard Quote→Load→Driver+Vehicle flow */
export const SUGGESTED_JOINS = [
  {
    name: 'Quote→Load',
    leftEntity: 'quote',
    rightEntity: 'load',
    leftKey: 'load_id',
    rightKey: 'load_id',
  },
  {
    name: 'Load→Driver+Vehicle',
    leftEntity: 'load',
    rightEntity: 'driver_vehicle',
    leftKey: 'allocated_vehicle_id',
    rightKey: 'vehicle_id',
    fallbackKey: 'driver_id',
  },
] as const

/** Filter interpretation: map user phrases to flat table field names */
export const FILTER_FIELD_ALIASES: Record<string, string> = {
  capacity_kg: 'capacity_kg',
  'capacity kg': 'capacity_kg',
  capacity: 'capacity_kg',
  quoted_price: 'quoted_price',
  'quoted price': 'quoted_price',
  price: 'quoted_price',
  'quoted amount': 'quoted_price',
  'quote amount': 'quoted_price',
  amount: 'quoted_price',
  distance_km: 'distance_km',
  'distance km': 'distance_km',
  distance: 'distance_km',
  'collection city': 'collection_city',
  collection_city: 'collection_city',
  'collection town': 'collection_town',
  'collection time': 'collection_time',
  collection_time: 'collection_time',
  'collection date': 'collection_date',
  collection_date: 'collection_date',
  'delivery city': 'delivery_city',
  'delivery town': 'delivery_town',
  'delivery time': 'delivery_time',
  'delivery date': 'delivery_date',
  'number of items': 'number_of_items',
  number_of_items: 'number_of_items',
  items: 'number_of_items',
  email: 'email',
  phone: 'phone',
  'phone numbers': 'phone',
  'phone number': 'phone',
  'registration number': 'registration_number',
  registration: 'registration_number',
  'driver name': 'name',
  'load poster name': 'load_poster_name',
  status: 'status',
  'vehicle type': 'vehicle_type',
  'requested vehicle type': 'requested_vehicle_type',
  load_status: 'load_status',
  quote_status: 'quote_status',
}

/** Unit suffix → field for filter interpretation (e.g. "1000kg" → capacity_kg) */
export const FILTER_UNIT_TO_FIELD: Record<string, string> = {
  kg: 'capacity_kg',
  km: 'distance_km',
  '£': 'quoted_price',
  gbp: 'quoted_price',
}

/** Numeric fields usable in filter comparisons */
export const FILTER_NUMERIC_FIELDS = [
  'capacity_kg',
  'quoted_price',
  'distance_km',
  'number_of_items',
] as const

/** Location fields for place-based filters (exclude London loads, include Manchester loads) */
export const FILTER_LOCATION_FIELDS = [
  'collection_town',
  'collection_city',
  'delivery_town',
  'delivery_city',
] as const

/** Status values recognized in filter NL */
export const FILTER_STATUS_VALUES = [
  ...QUOTE_STATUS,
  ...LOAD_STATUS,
  'pending',
  'accepted',
] as unknown as string[]

/** Vehicle type names for filter NL (with display variants) */
export const FILTER_VEHICLE_TYPE_NAMES = [
  ...VEHICLE_TYPES,
  'small van',
  'medium van',
  'large van',
  'rigid',
] as unknown as string[]

/** Mapping suggestions: fuzzy match source column names to target fields */
export const MAPPING_ALIASES: Record<string, string[]> = {
  quote_id: ['quote ref', 'quote id', 'quoteref', 'quote reference'],
  load_id: ['load number', 'load id', 'load reference', 'load ref'],
  quoted_price: ['quoted amount', 'price', 'amount', 'quoted price', 'quote amount'],
  status: ['status'],
  date_created: ['date created', 'created date'],
  created_at: ['created_at', 'created'],
  updated_at: ['updated_at', 'updated'],
  distance_km: ['distance', 'distance km', 'distance (km)'],
  associated_fleet_id: ['fleet id', 'fleetid', 'associated fleet'],
  fleet_quoter_name: ['quoter name', 'quoter', 'fleet quoter'],
  requested_vehicle_type: ['vehicle type', 'requested vehicle', 'vehicle type requested'],
  collection_town: ['collection town', 'collection town', 'origin town'],
  collection_city: ['collection city', 'collection city', 'origin city'],
  collection_time: ['collection time', 'pickup time'],
  collection_date: ['collection date', 'pickup date'],
  delivery_town: ['delivery town', 'destination town'],
  delivery_city: ['delivery city', 'destination city'],
  delivery_time: ['delivery time', 'drop-off time'],
  delivery_date: ['delivery date', 'drop-off date'],
  completion_date: ['completion date', 'completion'],
  load_poster_name: ['poster name', 'load poster', 'poster'],
  allocated_vehicle_id: ['vehicle id', 'vehicleid', 'allocated vehicle'],
  driver_id: ['driver id', 'driverid'],
  vehicle_id: ['vehicle id', 'vehicleid'],
  name: ['driver name', 'name'],
  fleet_id: ['fleet id', 'fleetid'],
  vehicle_type: ['type', 'vehicle type'],
  registration_number: ['registration', 'reg', 'reg number'],
  number_of_items: ['number of items', 'items', 'item count'],
  email: ['email'],
  phone: ['phone'],
  capacity_kg: ['capacity', 'capacity kg', 'capacity (kg)'],
}

/** Minimum name score (0–1) for mapping suggestion to be included. Lower = more permissive. */
export const MAPPING_NAME_SCORE_THRESHOLD = 0.25

/**
 * Fuzzy-match a user phrase to a canonical field name.
 * Returns 0-1 similarity; used when resolving against actual column names.
 */
/** Flat table column names (platform schema) for filter field resolution */
export function getFlatTableColumnNames(): string[] {
  const names = new Set<string>()
  for (const f of [...QUOTE_FIELDS, ...LOAD_FIELDS, ...DRIVER_FIELDS, ...VEHICLE_FIELDS]) {
    names.add(f.name)
  }
  return [...names]
}

/**
 * Fuzzy-match a user phrase to a canonical field name.
 * Returns 0-1 similarity; used when resolving against actual column names.
 */
export function fuzzyColumnMatch(userPhrase: string, columnName: string): number {
  const a = userPhrase.toLowerCase().trim().replace(/\s+/g, '_')
  const b = columnName.toLowerCase().replace(/\s+/g, '_')
  if (a === b) return 1
  if (b.includes(a) || a.includes(b)) return 0.85
  const aWords = new Set(a.split(/[_\s]+/))
  const bWords = new Set(b.split(/[_\s]+/))
  const overlap = [...aWords].filter((w) => bWords.has(w)).length
  return overlap / Math.max(aWords.size, bWords.size, 1) * 0.7
}
