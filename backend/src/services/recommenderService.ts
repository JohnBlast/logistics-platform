/**
 * Price recommender — rule-based formula (PRD §16.2, C-24)
 * adr_multiplier = adr_required ? 1.15 : 1.0
 */

import { getLoad, getQuoteCountForLoad } from './jobmarketStore.js'
import { getFleetProfile } from './jobmarketStore.js'
import type { VehicleType } from './jobmarketStore.js'

const RATE_PER_KM: Record<VehicleType, number> = {
  small_van: 0.8,
  medium_van: 1.0,
  large_van: 1.2,
  luton: 1.4,
  rigid_7_5t: 1.6,
  rigid_18t: 2.0,
  rigid_26t: 2.4,
  articulated: 3.0,
}

export interface RecommendationResult {
  min: number
  mid: number
  max: number
  signals: {
    distance_km: number
    vehicle_type: string
    adr_required: boolean
    competing_quotes: number
    fleet_rating: number
  }
}

export function recommendPrice(
  loadId: string,
  vehicleType?: VehicleType,
  fleetRating?: number
): RecommendationResult | null {
  const load = getLoad(loadId)
  if (!load) return null

  const vt = vehicleType ?? load.required_vehicle_type ?? 'rigid_18t'
  const rate = RATE_PER_KM[vt] ?? 2.0
  const profile = getFleetProfile()
  const rating = fleetRating ?? profile.rating ?? 3.0

  const basePrice = load.distance_km * rate
  const adrMultiplier = load.adr_required ? 1.15 : 1.0
  const competingQuotes = getQuoteCountForLoad(loadId)
  const competitionFactor = Math.max(0.7, 1.0 - competingQuotes * 0.05)
  const ratingFactor = 0.95 + (rating / 5.0) * 0.1

  const recommendedMid = basePrice * adrMultiplier * competitionFactor * ratingFactor
  const recommendedMin = recommendedMid * 0.85
  const recommendedMax = recommendedMid * 1.15

  console.log(
    `[recommender] Price recommendation for load ${loadId}: base=${basePrice.toFixed(2)} adr_mult=${adrMultiplier} comp_factor=${competitionFactor.toFixed(2)} rating_factor=${ratingFactor.toFixed(2)} → range £${recommendedMin.toFixed(2)}–£${recommendedMax.toFixed(2)}`
  )

  return {
    min: Math.round(recommendedMin * 100) / 100,
    mid: Math.round(recommendedMid * 100) / 100,
    max: Math.round(recommendedMax * 100) / 100,
    signals: {
      distance_km: load.distance_km,
      vehicle_type: vt,
      adr_required: load.adr_required,
      competing_quotes: competingQuotes,
      fleet_rating: rating,
    },
  }
}
