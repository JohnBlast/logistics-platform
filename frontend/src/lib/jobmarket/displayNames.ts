/**
 * Display names for Job Market UI — aligned with platform-data-model.md
 * Reuses ETL Mapping conventions for consistency across the platform.
 */

/** Field labels from platform data model (aligned with Mapping.tsx FIELD_LABELS) */
export const FIELD_LABELS: Record<string, string> = {
  // Load
  load_id: 'Load reference',
  collection_town: 'Collection town',
  collection_city: 'Collection city',
  collection_time: 'Collection time',
  collection_date: 'Collection date',
  delivery_town: 'Delivery town',
  delivery_city: 'Delivery city',
  delivery_time: 'Delivery time',
  delivery_date: 'Delivery date',
  distance_km: 'Distance (km)',
  status: 'Status',
  load_poster_name: 'Posted by',
  adr_required: 'ADR required',
  required_vehicle_type: 'Vehicle type required',
  max_budget: 'Max budget (£)',
  quote_count: 'Quotes',
  // Quote
  quote_id: 'Quote reference',
  quoted_price: 'Quoted price (£)',
  requested_vehicle_type: 'Vehicle type requested',
  offered_vehicle_type: 'Vehicle type offered',
  eta_to_collection: 'ETA to collection (min)',
  adr_certified: 'ADR certified',
  // Vehicle
  vehicle_type: 'Vehicle type',
  registration_number: 'Registration',
  capacity_kg: 'Capacity (kg)',
  current_city: 'Current location',
  // Driver
  name: 'Driver name',
  has_adr_certification: 'ADR certified',
  // Fleet Profile
  company_name: 'Company name',
  total_jobs_completed: 'Jobs completed',
  rating: 'Rating',
  driver_count: 'Drivers',
  vehicle_count: 'Vehicles',
  // Score breakdown
  price_score: 'Price',
  eta_score: 'ETA',
  fleet_rating_score: 'Fleet rating',
  vehicle_match: 'Vehicle fit',
  composite_score: 'Composite score',
  acceptable_vehicle_types: 'Acceptable vehicles',
  collection_window_minutes: 'Collection window (min)',
}

/** Vehicle type enum → display name (platform-data-model Vehicle schema) */
export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  small_van: 'Small van',
  medium_van: 'Medium van',
  large_van: 'Large van',
  luton: 'Luton',
  rigid_7_5t: 'Rigid 7.5t',
  rigid_18t: 'Rigid 18t',
  rigid_26t: 'Rigid 26t',
  articulated: 'Articulated',
}

export function getFieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] ?? fieldName.replace(/_/g, ' ')
}

export function getVehicleTypeLabel(type: string): string {
  return VEHICLE_TYPE_LABELS[type] ?? type
}
