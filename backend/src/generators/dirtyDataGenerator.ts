import { randomUUID } from 'crypto'
import {
  QUOTE_STATUS,
  LOAD_STATUS,
  VEHICLE_TYPES,
  type QuoteStatus,
  type LoadStatus,
  type VehicleType,
} from '../models/schema.js'

const QUOTE_COUNT = 100
const LOAD_COUNT = 50
const DRIVER_VEHICLE_COUNT = 50

// Deterministic-ish seed for tests
let seed = 42
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

export function generateQuotes(loadIds: string[]): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  for (let i = 0; i < QUOTE_COUNT; i++) {
    const loadId = loadIds[i % loadIds.length]
    const now = new Date().toISOString()
    rows.push({
      'Quote Ref': randomUUID(), // FR-4.4c: similar but different column name
      'Load Reference': loadId,
      'Quoted Amount': (Math.round(rand() * 5000 * 100) / 100).toFixed(2),
      Status: pick(QUOTE_STATUS),
      'Date Created': now,
      'Distance (km)': rand() > 0.9 ? null : (rand() * 500).toFixed(2), // FR-4.4d: optional nulls
      'Collection Town': `Town${i % 20}`,
      'Collection City': `City${i % 10}`,
      'Delivery Town': `Town${(i + 5) % 20}`,
      'Delivery City': `City${(i + 3) % 10}`,
      'Fleet ID': randomUUID(),
      'Quoter Name': `User${i}`,
      'Vehicle Type': pick(VEHICLE_TYPES),
      created_at: now,
      updated_at: now,
    })
  }
  return rows
}

export function generateLoads(): { rows: Record<string, unknown>[]; loadIds: string[] } {
  const rows: Record<string, unknown>[] = []
  const loadIds: string[] = []
  for (let i = 0; i < LOAD_COUNT; i++) {
    const loadId = randomUUID()
    loadIds.push(loadId)
    const now = new Date().toISOString()
    rows.push({
      'Load Number': loadId, // FR-4.4c
      'Collection Town': `Town${i % 20}`,
      'Collection City': `City${i % 10}`,
      'Delivery Town': `Town${(i + 7) % 20}`,
      'Delivery City': `City${(i + 2) % 10}`,
      'Distance km': rand() > 0.85 ? null : (rand() * 400).toFixed(2),
      Status: pick(LOAD_STATUS),
      'Poster Name': `Poster${i}`,
      'Vehicle ID': null as string | null,
      'Driver ID': null as string | null,
      created_at: now,
      updated_at: now,
    })
  }
  return { rows, loadIds }
}

export function generateDriverVehicle(
  loadRows: Record<string, unknown>[]
): { driverVehicleRows: Record<string, unknown>[]; updatedLoadRows: Record<string, unknown>[] } {
  const driverVehicles: Record<string, unknown>[] = []

  for (let i = 0; i < DRIVER_VEHICLE_COUNT; i++) {
    const vehicleId = randomUUID()
    const driverId = randomUUID()
    const now = new Date().toISOString()
    driverVehicles.push({
      'Vehicle ID': vehicleId,
      'Type': pick(VEHICLE_TYPES),
      'Registration': `REG${1000 + i}`,
      'Capacity kg': (rand() * 5000).toFixed(2),
      'Driver ID': driverId,
      'Driver Name': `Driver ${i}`,
      'Fleet ID': randomUUID(),
      created_at: now,
      updated_at: now,
    })
  }

  const updatedLoads = loadRows.map((r) => ({ ...r }))
  const assignCount = Math.min(updatedLoads.length, driverVehicles.length)
  for (let i = 0; i < assignCount; i++) {
    const load = updatedLoads[i] as Record<string, unknown>
    const dv = driverVehicles[i % driverVehicles.length] as Record<string, unknown>
    load['Vehicle ID'] = dv['Vehicle ID']
    load['Driver ID'] = dv['Driver ID']
  }

  return { driverVehicleRows: driverVehicles, updatedLoadRows: updatedLoads }
}
