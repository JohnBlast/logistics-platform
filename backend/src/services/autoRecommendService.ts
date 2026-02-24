/**
 * Auto-Recommend Service — blindly recommends the best vehicle, driver, and price for a load.
 * "Blind" means it does NOT look at any existing quotes or competing bids.
 */

import { getLoad, getVehicles, getDrivers, getDriver } from './jobmarketStore.js'
import type { Vehicle, Driver } from './jobmarketStore.js'
import { lookupHub } from '../lib/ukHubs.js'
import { haversineDistance, estimateETA } from '../lib/haversine.js'
import { recommendPrice } from './recommenderService.js'

export interface AutoRecommendResult {
  vehicle_id: string
  driver_id: string
  quoted_price: number
  eta_minutes: number
  reasoning: {
    vehicle_reason: string
    driver_reason: string
    price_reason: string
  }
}

export function autoRecommend(loadId: string): AutoRecommendResult | { error: string } {
  const load = getLoad(loadId)
  if (!load) {
    console.log(`[auto-recommend] Load ${loadId} not found`)
    return { error: 'Load not found' }
  }

  const allVehicles = getVehicles()
  const allDrivers = getDrivers()
  if (allVehicles.length === 0) {
    console.log(`[auto-recommend] No vehicles in fleet for load ${loadId}`)
    return { error: 'No vehicles in fleet' }
  }
  if (allDrivers.length === 0) {
    console.log(`[auto-recommend] No drivers in fleet for load ${loadId}`)
    return { error: 'No drivers in fleet' }
  }

  const collectionCoord = lookupHub(load.collection_city)
  if (!collectionCoord) {
    console.log(`[auto-recommend] Could not resolve city: ${load.collection_city}`)
    return { error: 'Could not resolve collection city coordinates' }
  }

  // Step 1: Determine acceptable vehicle types
  const acceptableTypes =
    load.acceptable_vehicle_types && load.acceptable_vehicle_types.length > 0
      ? load.acceptable_vehicle_types
      : load.required_vehicle_type
        ? [load.required_vehicle_type]
        : null

  // Step 2: Filter vehicles to compatible types (fall back to all if none match)
  let candidates = acceptableTypes
    ? allVehicles.filter((v) => acceptableTypes.includes(v.vehicle_type))
    : allVehicles
  if (candidates.length === 0) candidates = allVehicles

  // Step 3: Score each vehicle by type match + proximity
  const scored = candidates.map((v) => {
    const coord = lookupHub(v.current_city)
    const distKm = coord
      ? haversineDistance(coord.lat, coord.lng, collectionCoord.lat, collectionCoord.lng)
      : 9999
    const exactMatch = v.vehicle_type === load.required_vehicle_type
    const inAcceptable = acceptableTypes?.includes(v.vehicle_type) ?? false
    return { vehicle: v, distKm, exactMatch, inAcceptable }
  })

  scored.sort((a, b) => {
    if (a.exactMatch !== b.exactMatch) return a.exactMatch ? -1 : 1
    if (a.inAcceptable !== b.inAcceptable) return a.inAcceptable ? -1 : 1
    return a.distKm - b.distKm
  })

  const best = scored[0]

  // Step 4: Pick driver — prefer vehicle's assigned driver if ADR-compatible
  let bestDriver: Driver | undefined
  let driverReason: string = ''

  if (best.vehicle.driver_id) {
    const assigned = getDriver(best.vehicle.driver_id)
    if (assigned && (!load.adr_required || assigned.has_adr_certification)) {
      bestDriver = assigned
      driverReason = `Assigned driver for selected vehicle${assigned.has_adr_certification ? ' (ADR certified)' : ''}`
    }
  }

  if (!bestDriver) {
    const suitable = load.adr_required
      ? allDrivers.filter((d) => d.has_adr_certification)
      : allDrivers

    if (suitable.length === 0) {
      return { error: 'No ADR-certified drivers available for this ADR-required job' }
    }

    // Prefer ADR-certified even when not required (more versatile)
    suitable.sort((a, b) => (a.has_adr_certification === b.has_adr_certification ? 0 : a.has_adr_certification ? -1 : 1))
    bestDriver = suitable[0]
    driverReason = load.adr_required
      ? 'ADR-certified driver (required for this job)'
      : `Available driver${bestDriver.has_adr_certification ? ' (ADR certified)' : ''}`
  }

  // Step 5: Price = mid from recommender (blind to competitor quotes)
  const rec = recommendPrice(loadId, best.vehicle.vehicle_type)
  const quotedPrice = rec ? Math.round(rec.mid * 100) / 100 : Math.round(load.distance_km * 2 * 100) / 100

  // Step 6: Compute ETA
  const etaMinutes = estimateETA(best.distKm)

  // Build reasoning
  const vehicleReason = [
    best.exactMatch ? 'Exact vehicle type match' : best.inAcceptable ? 'Acceptable vehicle type' : 'Best available type',
    `${best.distKm.toFixed(0)} km from collection (${best.vehicle.current_city})`,
    `~${etaMinutes} min ETA`,
  ].join('. ')

  const priceReason = rec
    ? `Recommended mid-range price for ${rec.signals.distance_km} km route`
    : 'Estimated based on distance'

  return {
    vehicle_id: best.vehicle.vehicle_id,
    driver_id: bestDriver.driver_id,
    quoted_price: quotedPrice,
    eta_minutes: etaMinutes,
    reasoning: {
      vehicle_reason: vehicleReason,
      driver_reason: driverReason,
      price_reason: priceReason,
    },
  }
}
