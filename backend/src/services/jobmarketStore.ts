/**
 * Job Market in-memory data store (PRD §5, C-5)
 * All simulation data resets on server restart.
 */

import { randomUUID } from 'crypto'
import { getHubNames } from '../lib/ukHubs.js'

export type VehicleType =
  | 'small_van'
  | 'medium_van'
  | 'large_van'
  | 'luton'
  | 'rigid_7_5t'
  | 'rigid_18t'
  | 'rigid_26t'
  | 'articulated'

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
  created_at: string
  updated_at: string
}

const DEFAULT_FLEET_ID = 'fleet-001'

const loads = new Map<string, Load>()
const quotes = new Map<string, Quote>()
const quoteScores = new Map<string, { price_score: number; eta_score: number; fleet_rating_score: number; vehicle_match: number; composite_score: number }>()
const quoteFeedback = new Map<string, string>()
const vehicles = new Map<string, Vehicle>()
const drivers = new Map<string, Driver>()

const fleetProfile: FleetProfile = {
  fleet_id: DEFAULT_FLEET_ID,
  company_name: 'My Fleet',
  total_jobs_completed: 0,
  rating: 3.0,
  driver_count: 0,
  vehicle_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function now() {
  return new Date().toISOString()
}

// ─── Loads ─────────────────────────────────────────────────────────────────

export function addLoad(load: Omit<Load, 'load_id' | 'created_at' | 'updated_at'>): Load {
  const id = randomUUID()
  const ts = now()
  const record: Load = {
    ...load,
    load_id: id,
    created_at: ts,
    updated_at: ts,
  }
  loads.set(id, record)
  return record
}

export function getLoad(loadId: string): Load | undefined {
  return loads.get(loadId)
}

export function getLoadsByStatus(status?: string): Load[] {
  const all = Array.from(loads.values())
  if (!status) return all
  return all.filter((l) => l.status === status)
}

export function updateLoadStatus(loadId: string, status: Load['status']): void {
  const load = loads.get(loadId)
  if (load) {
    load.status = status
    load.updated_at = now()
  }
}

// ─── Quotes ─────────────────────────────────────────────────────────────────

export function addQuote(quote: Omit<Quote, 'quote_id' | 'created_at' | 'updated_at'>): Quote {
  const id = randomUUID()
  const ts = now()
  const record: Quote = {
    ...quote,
    quote_id: id,
    created_at: ts,
    updated_at: ts,
  }
  quotes.set(id, record)
  return record
}

export function getQuote(quoteId: string): Quote | undefined {
  return quotes.get(quoteId)
}

export function getQuotesByLoad(loadId: string): Quote[] {
  return Array.from(quotes.values()).filter((q) => q.load_id === loadId)
}

export function getQuotesByFleet(fleetId: string): Quote[] {
  return Array.from(quotes.values())
    .filter((q) => q.associated_fleet_id === fleetId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function updateQuoteStatus(quoteId: string, status: Quote['status']): void {
  const quote = quotes.get(quoteId)
  if (quote) {
    quote.status = status
    quote.updated_at = now()
  }
}

export function setQuoteScoreBreakdown(
  quoteId: string,
  breakdown: { price_score: number; eta_score: number; fleet_rating_score: number; vehicle_match: number; composite_score: number }
): void {
  quoteScores.set(quoteId, breakdown)
}

export function getQuoteScoreBreakdown(quoteId: string) {
  return quoteScores.get(quoteId)
}

export function setQuoteFeedback(quoteId: string, feedback: string): void {
  quoteFeedback.set(quoteId, feedback)
}

export function getQuoteFeedback(quoteId: string): string | undefined {
  return quoteFeedback.get(quoteId)
}

export function deleteQuote(quoteId: string): boolean {
  if (!quotes.has(quoteId)) return false
  quotes.delete(quoteId)
  quoteScores.delete(quoteId)
  quoteFeedback.delete(quoteId)
  return true
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getQuoteCountForLoad(loadId: string): number {
  return getQuotesByLoad(loadId).length
}

/** Active quote = status "sent". Blocks duplicate submission (GR-3). */
export function hasActiveQuote(fleetId: string, loadId: string): boolean {
  return getQuotesByLoad(loadId).some(
    (q) => q.associated_fleet_id === fleetId && q.status === 'sent'
  )
}

// ─── Vehicles ───────────────────────────────────────────────────────────────

export function addVehicle(
  vehicle: Omit<Vehicle, 'vehicle_id' | 'created_at' | 'updated_at'>
): Vehicle {
  const id = randomUUID()
  const ts = now()
  const record: Vehicle = {
    ...vehicle,
    vehicle_id: id,
    created_at: ts,
    updated_at: ts,
  }
  vehicles.set(id, record)
  updateFleetCounts()
  return record
}

export function getVehicle(vehicleId: string): Vehicle | undefined {
  return vehicles.get(vehicleId)
}

export function getVehicles(): Vehicle[] {
  return Array.from(vehicles.values()).filter((v) => {
    // All vehicles belong to the single fleet in MVP
    return true
  })
}

export function deleteVehicle(vehicleId: string): void {
  vehicles.delete(vehicleId)
  updateFleetCounts()
}

export function getVehicleByDriver(driverId: string): Vehicle | undefined {
  return Array.from(vehicles.values()).find((v) => v.driver_id === driverId)
}

// ─── Drivers ────────────────────────────────────────────────────────────────

export function addDriver(
  driver: Omit<Driver, 'driver_id' | 'created_at' | 'updated_at'>
): Driver {
  const id = randomUUID()
  const ts = now()
  const record: Driver = {
    ...driver,
    driver_id: id,
    fleet_id: driver.fleet_id ?? DEFAULT_FLEET_ID,
    created_at: ts,
    updated_at: ts,
  }
  drivers.set(id, record)
  updateFleetCounts()
  return record
}

export function getDriver(driverId: string): Driver | undefined {
  return drivers.get(driverId)
}

export function getDrivers(): Driver[] {
  return Array.from(drivers.values()).filter((d) => d.fleet_id === DEFAULT_FLEET_ID)
}

export function deleteDriver(driverId: string): void {
  drivers.delete(driverId)
  updateFleetCounts()
}

// ─── Fleet profile ──────────────────────────────────────────────────────────

export function getFleetProfile(): FleetProfile {
  return { ...fleetProfile }
}

export function updateFleetProfile(updates: Partial<Pick<FleetProfile, 'company_name' | 'rating'>>): void {
  if (updates.company_name !== undefined) {
    fleetProfile.company_name = updates.company_name
  }
  if (updates.rating !== undefined) {
    const r = Number(updates.rating)
    fleetProfile.rating = Math.max(0, Math.min(5, r))
  }
  fleetProfile.updated_at = now()
}

export function incrementFleetJobsCompleted(): void {
  fleetProfile.total_jobs_completed += 1
  fleetProfile.updated_at = now()
}

function updateFleetCounts(): void {
  fleetProfile.driver_count = getDrivers().length
  fleetProfile.vehicle_count = getVehicles().length
  fleetProfile.updated_at = now()
}

// ─── IDs ────────────────────────────────────────────────────────────────────

export function getDefaultFleetId(): string {
  return DEFAULT_FLEET_ID
}

export function validateCityInHubs(city: string): boolean {
  const hubs = getHubNames()
  return hubs.includes(city.trim())
}

/** Reset all store data for testing. Not for production use. */
export function resetForTesting(opts?: { rating?: number; companyName?: string }): void {
  loads.clear()
  quotes.clear()
  quoteScores.clear()
  quoteFeedback.clear()
  vehicles.clear()
  drivers.clear()
  fleetProfile.company_name = opts?.companyName ?? 'My Fleet'
  fleetProfile.total_jobs_completed = 0
  fleetProfile.rating = opts?.rating ?? 3.0
  fleetProfile.driver_count = 0
  fleetProfile.vehicle_count = 0
  fleetProfile.updated_at = now()
}
