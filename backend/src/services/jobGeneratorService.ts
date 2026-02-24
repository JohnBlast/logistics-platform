/**
 * Job generation service — creates randomised loads from UK hubs (PRD §4, C-12, C-21)
 */

import { getHubNames, lookupHub } from '../lib/ukHubs.js'
import { haversineDistance } from '../lib/haversine.js'
import { addLoad } from './jobmarketStore.js'
import type { Load, VehicleType } from './jobmarketStore.js'

const VEHICLE_TYPES: readonly VehicleType[] = [
  'small_van',
  'medium_van',
  'large_van',
  'luton',
  'rigid_7_5t',
  'rigid_18t',
  'rigid_26t',
  'articulated',
]

/** Rate per km by vehicle type — mirrors recommenderService for budget calculation */
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

const LOAD_POSTER_NAMES = [
  'Tesco Distribution',
  'Amazon Logistics',
  'DPD UK',
  'Royal Mail Parcels',
  'DHL Supply Chain',
]

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickTwoDifferent<T>(arr: readonly T[]): [T, T] {
  const a = pickRandom(arr)
  let b = pickRandom(arr)
  while (b === a) {
    b = pickRandom(arr)
  }
  return [a, b]
}

/** Generate N jobs with randomised parameters. Count 1-20 (C-12). */
export function generateJobs(count: number): Load[] {
  const validatedCount = Math.max(1, Math.min(20, Math.floor(count)))
  if (validatedCount === 0) {
    console.warn('[job-market] 0 jobs generated (warning)')
  }
  const hubs = getHubNames()
  const created: Load[] = []

  for (let i = 0; i < validatedCount; i++) {
    const [collectionCity, deliveryCity] = pickTwoDifferent(hubs)
    const collectionCoord = lookupHub(collectionCity)!
    const deliveryCoord = lookupHub(deliveryCity)!
    const distance_km = Math.round(
      haversineDistance(
        collectionCoord.lat,
        collectionCoord.lng,
        deliveryCoord.lat,
        deliveryCoord.lng
      ) * 10
    ) / 10

    const collectionTime = new Date()
    collectionTime.setDate(collectionTime.getDate() + 1)
    collectionTime.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0)

    const adr_required = Math.random() < 0.3
    const requiredVehicleType = pickRandom(VEHICLE_TYPES)

    // ZOPA: poster's budget — base price × ADR × random multiplier (1.0–1.5)
    const basePrice = distance_km * RATE_PER_KM[requiredVehicleType]
    const adrMult = adr_required ? 1.15 : 1.0
    const max_budget = Math.round(basePrice * adrMult * (1.0 + Math.random() * 0.5) * 100) / 100

    // ZOPA: acceptable vehicle types — required + 1-2 larger alternatives
    const reqIdx = VEHICLE_TYPES.indexOf(requiredVehicleType)
    const extraCount = 1 + Math.floor(Math.random() * 2) // 1 or 2 extras
    const acceptable_vehicle_types: VehicleType[] = [requiredVehicleType]
    for (let j = 1; j <= extraCount && reqIdx + j < VEHICLE_TYPES.length; j++) {
      acceptable_vehicle_types.push(VEHICLE_TYPES[reqIdx + j])
    }

    // ZOPA: collection window — 15, 30, 45, or 60 minutes
    const collection_window_minutes = 15 + Math.floor(Math.random() * 4) * 15

    const load = addLoad({
      collection_city: collectionCity,
      delivery_city: deliveryCity,
      distance_km,
      status: 'posted',
      load_poster_name: pickRandom(LOAD_POSTER_NAMES),
      adr_required,
      required_vehicle_type: requiredVehicleType,
      collection_time: collectionTime.toISOString(),
      max_budget,
      acceptable_vehicle_types,
      collection_window_minutes,
    })
    created.push(load)
    console.log(
      `[job-market] Job ${load.load_id}: ${load.collection_city} → ${load.delivery_city}, ${load.distance_km}km, ${load.required_vehicle_type}, ADR=${load.adr_required}, budget=£${load.max_budget}, vehicles=[${load.acceptable_vehicle_types?.join(',')}], window=${load.collection_window_minutes}min`
    )
  }
  console.log(`[job-market] Generated ${created.length} jobs`)

  return created
}
