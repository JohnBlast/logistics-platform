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
  { name: 'quote_id', type: 'UUID', required: true, description: 'Unique quote identifier' },
  { name: 'load_id', type: 'UUID', required: true, description: 'Reference to the load being quoted' },
  { name: 'quoted_price', type: 'DECIMAL', required: true, description: 'Price offered in pounds (£)' },
  { name: 'status', type: 'enum', required: true, description: 'Quote status: draft, sent, accepted, rejected, expired' },
  { name: 'date_created', type: 'TIMESTAMP', required: true, description: 'When the quote was created' },
  { name: 'distance_km', type: 'DECIMAL', required: false, description: 'Distance in kilometres' },
  { name: 'associated_fleet_id', type: 'UUID', required: true, description: 'Fleet making the quote' },
  { name: 'fleet_quoter_name', type: 'VARCHAR', required: true, description: 'Name of person who quoted' },
  { name: 'requested_vehicle_type', type: 'enum', required: true, description: 'Vehicle type requested for the load' },
  { name: 'created_at', type: 'TIMESTAMP', required: true, description: 'Record creation timestamp' },
  { name: 'updated_at', type: 'TIMESTAMP', required: true, description: 'Last update timestamp' },
]

export const LOAD_FIELDS: FieldDef[] = [
  { name: 'load_id', type: 'UUID', required: true, description: 'Unique load identifier' },
  { name: 'collection_town', type: 'VARCHAR', required: false, description: 'Town where load is collected' },
  { name: 'collection_city', type: 'VARCHAR', required: false, description: 'City where load is collected' },
  { name: 'collection_time', type: 'TIMESTAMP', required: false, description: 'Collection time' },
  { name: 'collection_date', type: 'DATE', required: false, description: 'Collection date' },
  { name: 'delivery_town', type: 'VARCHAR', required: false, description: 'Town where load is delivered' },
  { name: 'delivery_city', type: 'VARCHAR', required: false, description: 'City where load is delivered' },
  { name: 'delivery_time', type: 'TIMESTAMP', required: false, description: 'Delivery time' },
  { name: 'delivery_date', type: 'DATE', required: false, description: 'Delivery date' },
  { name: 'distance_km', type: 'DECIMAL', required: false, description: 'Distance in kilometres' },
  { name: 'status', type: 'enum', required: true, description: 'Load status: draft, posted, in_transit, completed, cancelled' },
  { name: 'completion_date', type: 'DATE', required: false, description: 'When the load was completed' },
  { name: 'load_poster_name', type: 'VARCHAR', required: true, description: 'Name of person who posted the load' },
  { name: 'allocated_vehicle_id', type: 'UUID', required: false, description: 'Vehicle assigned to the load' },
  { name: 'driver_id', type: 'UUID', required: false, description: 'Driver assigned to the load' },
  { name: 'number_of_items', type: 'INTEGER', required: false, description: 'Number of items in the load' },
  { name: 'created_at', type: 'TIMESTAMP', required: true, description: 'Record creation timestamp' },
  { name: 'updated_at', type: 'TIMESTAMP', required: true, description: 'Last update timestamp' },
]

export const DRIVER_FIELDS: FieldDef[] = [
  { name: 'driver_id', type: 'UUID', required: true, description: 'Unique driver identifier' },
  { name: 'name', type: 'VARCHAR', required: true, description: 'Driver full name' },
  { name: 'fleet_id', type: 'UUID', required: true, description: 'Fleet the driver belongs to' },
  { name: 'email', type: 'VARCHAR', required: false, description: 'Driver email' },
  { name: 'phone', type: 'VARCHAR', required: false, description: 'Driver phone number' },
  { name: 'created_at', type: 'TIMESTAMP', required: true, description: 'Record creation timestamp' },
  { name: 'updated_at', type: 'TIMESTAMP', required: true, description: 'Last update timestamp' },
]

export const VEHICLE_FIELDS: FieldDef[] = [
  { name: 'vehicle_id', type: 'UUID', required: true, description: 'Unique vehicle identifier' },
  { name: 'vehicle_type', type: 'enum', required: true, description: 'Type of vehicle (e.g. small_van, articulated)' },
  { name: 'registration_number', type: 'VARCHAR', required: true, description: 'Vehicle registration plate' },
  { name: 'capacity_kg', type: 'DECIMAL', required: false, description: 'Maximum load capacity in kg' },
  { name: 'driver_id', type: 'UUID', required: false, description: 'Assigned driver (optional)' },
  { name: 'created_at', type: 'TIMESTAMP', required: true, description: 'Record creation timestamp' },
  { name: 'updated_at', type: 'TIMESTAMP', required: true, description: 'Last update timestamp' },
]

export const SCHEMA = {
  quote: QUOTE_FIELDS,
  load: LOAD_FIELDS,
  driver: DRIVER_FIELDS,
  vehicle: VEHICLE_FIELDS,
} as const

export type ObjectType = 'quote' | 'load' | 'driver_vehicle'
