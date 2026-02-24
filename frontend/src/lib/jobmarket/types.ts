/** Job Market shared types (003) — aligned with platform-data-model.md */

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
export type VehicleType = (typeof VEHICLE_TYPES)[number]

export interface UKHub {
  city: string
  lat: number
  lng: number
}

export interface Load {
  load_id: string
  collection_town?: string
  collection_city: string
  collection_time?: string
  collection_date?: string
  delivery_town?: string
  delivery_city: string
  delivery_time?: string
  delivery_date?: string
  distance_km: number
  status: 'draft' | 'posted' | 'in_transit' | 'completed' | 'cancelled'
  load_poster_name: string
  allocated_vehicle_id?: string
  driver_id?: string
  number_of_items?: number
  adr_required: boolean
  required_vehicle_type?: VehicleType
  max_budget?: number
  acceptable_vehicle_types?: VehicleType[]
  collection_window_minutes?: number
  created_at: string
  updated_at: string
}

export interface Quote {
  quote_id: string
  load_id: string
  quoted_price: number
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  date_created?: string
  distance_km?: number
  associated_fleet_id: string
  fleet_quoter_name: string
  requested_vehicle_type: VehicleType
  eta_to_collection?: number
  offered_vehicle_type?: VehicleType
  adr_certified?: boolean
  created_at: string
  updated_at: string
}

export interface Driver {
  driver_id: string
  name: string
  fleet_id: string
  email?: string
  phone?: string
  has_adr_certification: boolean
  created_at: string
  updated_at: string
}

export interface Vehicle {
  vehicle_id: string
  vehicle_type: VehicleType
  registration_number: string
  capacity_kg?: number
  driver_id?: string
  current_city: string
  created_at: string
  updated_at: string
}

export interface FleetProfile {
  fleet_id: string
  company_name: string
  total_jobs_completed: number
  rating: number
  driver_count: number
  vehicle_count: number
  vehicles?: Vehicle[]
  drivers?: Driver[]
  created_at: string
  updated_at: string
}

export interface PriceRecommendation {
  min: number
  mid: number
  max: number
  signals?: {
    distance_km: number
    vehicle_type: string
    adr_required: boolean
    competing_quotes: number
    fleet_rating: number
  }
}

export interface ScoreBreakdown {
  price_score: number
  eta_score: number
  fleet_rating_score: number
  vehicle_match: number
  composite_score: number
}

export interface QuoteResult {
  quote_id: string
  load_id: string
  quoted_price: number
  status: string
  eta_to_collection?: number
  offered_vehicle_type?: VehicleType
  adr_certified?: boolean
  score_breakdown?: ScoreBreakdown
}

export interface JobBoardLoad extends Load {
  quote_count?: number
  required_vehicle_type?: VehicleType
}
