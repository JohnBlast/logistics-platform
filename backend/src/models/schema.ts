/**
 * Data model schema for ETL Configurator (per data-model.md)
 */

export const QUOTE_STATUS = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const
export const LOAD_STATUS = ['draft', 'posted', 'in_transit', 'completed', 'cancelled'] as const
export const VEHICLE_TYPES = [
  'small_van',
  'medium_van',
  'large_van',
  'luton',
  'rigid_7_5t',
  'rigid_18t',
  'rigid_26t',
  'articulated',
] as const

export type QuoteStatus = (typeof QUOTE_STATUS)[number]
export type LoadStatus = (typeof LOAD_STATUS)[number]
export type VehicleType = (typeof VEHICLE_TYPES)[number]

export interface FieldDef {
  name: string
  type: string
  required: boolean
  description?: string
}

export const QUOTE_FIELDS: FieldDef[] = [
  { name: 'quote_id', type: 'UUID', required: true },
  { name: 'load_id', type: 'UUID', required: true },
  { name: 'quoted_price', type: 'DECIMAL', required: true },
  { name: 'status', type: 'enum', required: true },
  { name: 'date_created', type: 'TIMESTAMP', required: true },
  { name: 'distance_km', type: 'DECIMAL', required: false },
  { name: 'collection_town', type: 'VARCHAR', required: false },
  { name: 'collection_city', type: 'VARCHAR', required: false },
  { name: 'collection_time', type: 'TIMESTAMP', required: false },
  { name: 'collection_date', type: 'DATE', required: false },
  { name: 'delivery_town', type: 'VARCHAR', required: false },
  { name: 'delivery_city', type: 'VARCHAR', required: false },
  { name: 'delivery_time', type: 'TIMESTAMP', required: false },
  { name: 'delivery_date', type: 'DATE', required: false },
  { name: 'associated_fleet_id', type: 'UUID', required: true },
  { name: 'fleet_quoter_name', type: 'VARCHAR', required: true },
  { name: 'requested_vehicle_type', type: 'enum', required: true },
  { name: 'created_at', type: 'TIMESTAMP', required: true },
  { name: 'updated_at', type: 'TIMESTAMP', required: true },
]

export const LOAD_FIELDS: FieldDef[] = [
  { name: 'load_id', type: 'UUID', required: true },
  { name: 'collection_town', type: 'VARCHAR', required: false },
  { name: 'collection_city', type: 'VARCHAR', required: false },
  { name: 'collection_time', type: 'TIMESTAMP', required: false },
  { name: 'collection_date', type: 'DATE', required: false },
  { name: 'delivery_town', type: 'VARCHAR', required: false },
  { name: 'delivery_city', type: 'VARCHAR', required: false },
  { name: 'delivery_time', type: 'TIMESTAMP', required: false },
  { name: 'delivery_date', type: 'DATE', required: false },
  { name: 'distance_km', type: 'DECIMAL', required: false },
  { name: 'status', type: 'enum', required: true },
  { name: 'completion_date', type: 'DATE', required: false },
  { name: 'accepted_quote_id', type: 'UUID', required: false },
  { name: 'load_poster_name', type: 'VARCHAR', required: true },
  { name: 'allocated_fleet_id', type: 'UUID', required: false },
  { name: 'allocated_vehicle_id', type: 'UUID', required: false },
  { name: 'driver_id', type: 'UUID', required: false },
  { name: 'number_of_items', type: 'INTEGER', required: false },
  { name: 'created_at', type: 'TIMESTAMP', required: true },
  { name: 'updated_at', type: 'TIMESTAMP', required: true },
]

export const DRIVER_FIELDS: FieldDef[] = [
  { name: 'driver_id', type: 'UUID', required: true },
  { name: 'name', type: 'VARCHAR', required: true },
  { name: 'license_number', type: 'VARCHAR', required: false },
  { name: 'fleet_id', type: 'UUID', required: true },
  { name: 'email', type: 'VARCHAR', required: false },
  { name: 'phone', type: 'VARCHAR', required: false },
  { name: 'created_at', type: 'TIMESTAMP', required: true },
  { name: 'updated_at', type: 'TIMESTAMP', required: true },
]

export const VEHICLE_FIELDS: FieldDef[] = [
  { name: 'vehicle_id', type: 'UUID', required: true },
  { name: 'vehicle_type', type: 'enum', required: true },
  { name: 'registration_number', type: 'VARCHAR', required: true },
  { name: 'capacity_kg', type: 'DECIMAL', required: false },
  { name: 'driver_id', type: 'UUID', required: false },
  { name: 'created_at', type: 'TIMESTAMP', required: true },
  { name: 'updated_at', type: 'TIMESTAMP', required: true },
]

export const SCHEMA = {
  quote: QUOTE_FIELDS,
  load: LOAD_FIELDS,
  driver: DRIVER_FIELDS,
  vehicle: VEHICLE_FIELDS,
} as const

export type ObjectType = 'quote' | 'load' | 'driver_vehicle'
