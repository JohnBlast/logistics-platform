/**
 * Competing quote generator — simulates other fleet operators bidding on loads.
 * Called after job generation to pre-populate some jobs with competing quotes.
 */

import { getHubNames, lookupHub } from '../lib/ukHubs.js'
import { haversineDistance, estimateETA } from '../lib/haversine.js'
import { addQuote } from './jobmarketStore.js'
import type { Load, VehicleType } from './jobmarketStore.js'
import { recommendPrice } from './recommenderService.js'

const FLEET_NAMES = [
  'QuickShip Logistics',
  'Northern Haulage Ltd',
  'Thames Valley Transport',
  'Midlands Express',
  'Celtic Carriers',
  'Anglia Freight',
]

const VEHICLE_TYPES: VehicleType[] = [
  'small_van', 'medium_van', 'large_van', 'luton',
  'rigid_7_5t', 'rigid_18t', 'rigid_26t', 'articulated',
]

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * For a set of generated loads, simulate at least 1 competing quote per load.
 * 1 quote for all, ~30% get a second, ~10% get a third.
 */
export function generateCompetingQuotes(loads: Load[]): number {
  const hubs = getHubNames()
  let totalQuotes = 0

  for (const load of loads) {
    const roll = Math.random()
    let quoteCount: number
    if (roll < 0.70) quoteCount = 1   // 70% — 1 competitor
    else if (roll < 0.90) quoteCount = 2  // 20% — 2 competitors
    else quoteCount = 3                    // 10% — 3 competitors

    const rec = recommendPrice(load.load_id, load.required_vehicle_type)

    for (let i = 0; i < quoteCount; i++) {
      const fleetId = `sim-fleet-${String(i + 1).padStart(3, '0')}`
      const fleetName = FLEET_NAMES[i % FLEET_NAMES.length]

      // Pick a vehicle type from acceptable types or the required type
      let offeredVehicle: VehicleType
      if (load.acceptable_vehicle_types && load.acceptable_vehicle_types.length > 0) {
        offeredVehicle = pickRandom(load.acceptable_vehicle_types)
      } else {
        // Offer required type or occasionally 1 size up
        const reqIdx = VEHICLE_TYPES.indexOf(load.required_vehicle_type ?? 'rigid_18t')
        if (Math.random() < 0.7 || reqIdx >= VEHICLE_TYPES.length - 1) {
          offeredVehicle = load.required_vehicle_type ?? 'rigid_18t'
        } else {
          offeredVehicle = VEHICLE_TYPES[reqIdx + 1]
        }
      }

      // Price: vary around recommended mid ± 30%
      let quotedPrice: number
      if (rec) {
        const variance = 0.7 + Math.random() * 0.6 // 0.7x to 1.3x of mid
        quotedPrice = Math.round(rec.mid * variance * 100) / 100
        // Clamp within ZOPA if budget exists
        if (load.max_budget !== undefined) {
          quotedPrice = Math.min(quotedPrice, load.max_budget * 0.95) // stay within budget
        }
      } else {
        quotedPrice = Math.round(load.distance_km * 2 * (0.8 + Math.random() * 0.4) * 100) / 100
      }
      quotedPrice = Math.max(10, quotedPrice) // minimum £10

      // ETA: pick a random hub as the vehicle's location
      const vehicleCity = pickRandom(hubs)
      const vehicleCoord = lookupHub(vehicleCity)
      const collectionCoord = lookupHub(load.collection_city)
      let eta = 120 // fallback
      if (vehicleCoord && collectionCoord) {
        const dist = haversineDistance(
          vehicleCoord.lat, vehicleCoord.lng,
          collectionCoord.lat, collectionCoord.lng
        )
        eta = estimateETA(dist)
      }

      // ADR: 50% chance of having it (if needed)
      const adrCertified = load.adr_required ? Math.random() < 0.5 : Math.random() < 0.3

      addQuote({
        load_id: load.load_id,
        quoted_price: quotedPrice,
        status: 'sent',
        associated_fleet_id: fleetId,
        fleet_quoter_name: fleetName,
        requested_vehicle_type: load.required_vehicle_type ?? 'rigid_18t',
        offered_vehicle_type: offeredVehicle,
        adr_certified: adrCertified,
        eta_to_collection: eta,
        distance_km: load.distance_km,
      })
      totalQuotes++
    }
  }

  console.log(`[competing] Generated ${totalQuotes} competing quotes across ${loads.length} loads`)
  return totalQuotes
}
