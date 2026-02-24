/**
 * Quote submission — validation, ETA, acceptance trigger (PRD §4, C-1, C-17, C-18, C-22)
 */

import { lookupHub } from '../lib/ukHubs.js'
import { haversineDistance, estimateETA } from '../lib/haversine.js'
import {
  getLoad,
  getVehicle,
  getDriver,
  getVehicles,
  getDrivers,
  addQuote,
  hasActiveQuote,
  getFleetProfile,
  getDefaultFleetId,
  getQuoteCountForLoad,
} from './jobmarketStore.js'
import { recommendPrice } from './recommenderService.js'
import { scoreAndEvaluate } from './acceptanceService.js'

const MAX_ETA_MINUTES = 480

export interface SubmitQuoteInput {
  load_id: string
  quoted_price: number
  vehicle_id: string
  driver_id: string
  quote_source?: 'manual' | 'algorithmic' | 'ai'
}

export interface SubmitQuoteResult {
  quote_id: string
  load_id: string
  status: 'sent' | 'accepted' | 'rejected'
  eta_to_collection: number
  offered_vehicle_type: string
  adr_certified: boolean
  recommended_price?: { min: number; max: number }
  score_breakdown?: { price_score: number; eta_score: number; fleet_rating_score: number; vehicle_match: number; composite_score: number }
  feedback?: string
  competing_quotes: number
}

export type SubmitQuoteError =
  | { code: 'LOAD_NOT_FOUND'; message: string }
  | { code: 'NO_FLEET'; message: string }
  | { code: 'ADR_REQUIRED'; message: string }
  | { code: 'DUPLICATE_QUOTE'; message: string }
  | { code: 'PRICE_INVALID'; message: string }
  | { code: 'ETA_EXCESSIVE'; message: string }
  | { code: 'VEHICLE_NOT_FOUND'; message: string }
  | { code: 'DRIVER_NOT_FOUND'; message: string }

export function submitQuote(input: SubmitQuoteInput): SubmitQuoteResult | SubmitQuoteError {
  const fleetId = getDefaultFleetId()
  const vehicles = getVehicles()
  const drivers = getDrivers()

  if (vehicles.length === 0 || drivers.length === 0) {
    return {
      code: 'NO_FLEET',
      message: 'Add vehicles and drivers to your fleet before quoting.',
    }
  }

  const load = getLoad(input.load_id)
  if (!load) {
    return { code: 'LOAD_NOT_FOUND', message: 'Job not found.' }
  }

  const vehicle = getVehicle(input.vehicle_id)
  const driver = getDriver(input.driver_id)
  if (!vehicle) {
    return { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found.' }
  }
  if (!driver) {
    return { code: 'DRIVER_NOT_FOUND', message: 'Driver not found.' }
  }

  if (load.adr_required && !driver.has_adr_certification) {
    console.log(
      `[acceptance] Quote blocked: load ${input.load_id} requires ADR, driver ${input.driver_id} not certified`
    )
    return {
      code: 'ADR_REQUIRED',
      message: 'This job requires ADR certification. Select an ADR-certified driver to quote.',
    }
  }

  if (hasActiveQuote(fleetId, input.load_id)) {
    return {
      code: 'DUPLICATE_QUOTE',
      message: 'You have already quoted on this job.',
    }
  }

  const vehicleCoord = lookupHub(vehicle.current_city)
  const collectionCoord = lookupHub(load.collection_city)
  if (!vehicleCoord || !collectionCoord) {
    return { code: 'ETA_EXCESSIVE', message: 'Could not resolve coordinates for ETA.' }
  }

  const distanceKm = haversineDistance(
    vehicleCoord.lat,
    vehicleCoord.lng,
    collectionCoord.lat,
    collectionCoord.lng
  )
  const etaToCollection = estimateETA(distanceKm)

  if (etaToCollection > MAX_ETA_MINUTES) {
    return {
      code: 'ETA_EXCESSIVE',
      message: `ETA to collection (${etaToCollection} min) exceeds maximum 480 minutes.`,
    }
  }

  const recommendation = recommendPrice(input.load_id, vehicle.vehicle_type)
  if (recommendation) {
    if (input.quoted_price <= 0) {
      return {
        code: 'PRICE_INVALID',
        message: 'Price must be greater than zero.',
      }
    }
    if (input.quoted_price < recommendation.min * 0.5) {
      const threshold = (recommendation.min * 0.5).toFixed(2)
      console.log(
        `[acceptance] Quote rejected: price £${input.quoted_price} below minimum (rec_min × 0.50 = £${threshold})`
      )
      return {
        code: 'PRICE_INVALID',
        message: `Price £${input.quoted_price} is below the minimum (recommended min × 0.50 = £${threshold}).`,
      }
    }
    if (input.quoted_price > recommendation.max * 3) {
      return {
        code: 'PRICE_INVALID',
        message: `Price £${input.quoted_price} exceeds the maximum (recommended max × 3.0 = £${(recommendation.max * 3).toFixed(2)}).`,
      }
    }
  }

  const profile = getFleetProfile()
  const quote = addQuote({
    load_id: input.load_id,
    quoted_price: input.quoted_price,
    status: 'sent',
    associated_fleet_id: fleetId,
    fleet_quoter_name: profile.company_name,
    requested_vehicle_type: load.required_vehicle_type ?? 'rigid_18t',
    offered_vehicle_type: vehicle.vehicle_type,
    adr_certified: driver.has_adr_certification,
    eta_to_collection: etaToCollection,
    distance_km: load.distance_km,
    quote_source: input.quote_source ?? 'manual',
  })

  const evalResult = scoreAndEvaluate(quote.quote_id)
  const competingQuotes = getQuoteCountForLoad(input.load_id) - 1 // exclude this quote

  return {
    quote_id: quote.quote_id,
    load_id: input.load_id,
    status: evalResult?.accepted ? 'accepted' : 'rejected',
    eta_to_collection: etaToCollection,
    offered_vehicle_type: quote.offered_vehicle_type ?? vehicle.vehicle_type,
    adr_certified: quote.adr_certified ?? driver.has_adr_certification,
    recommended_price: recommendation ? { min: recommendation.min, max: recommendation.max } : undefined,
    score_breakdown: evalResult?.breakdown,
    feedback: evalResult?.feedback,
    competing_quotes: competingQuotes,
  }
}
