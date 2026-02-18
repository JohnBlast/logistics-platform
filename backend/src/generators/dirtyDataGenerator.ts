import { randomUUID } from 'crypto'
import {
  QUOTE_STATUS,
  LOAD_STATUS,
  VEHICLE_TYPES,
} from '../models/schema.js'

const QUOTE_COUNT = 100
const LOAD_COUNT = 50
const DRIVER_VEHICLE_COUNT = 50

const UK_CITIES = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Bristol', 'Sheffield', 'Edinburgh', 'Cardiff', 'Belfast', 'Newcastle', 'Nottingham', 'Southampton', 'Brighton', 'Leicester', 'Coventry', 'Hull', 'Bradford', 'Stoke']
const UK_TOWNS = ['Reading', 'Slough', 'Luton', 'Northampton', 'Derby', 'Oxford', 'Cambridge', 'Ipswich', 'Milton Keynes', 'Swindon', 'Peterborough', 'Exeter', 'Plymouth', 'Bournemouth', 'Blackpool', 'Preston', 'Burnley', 'S Blackburn', 'Bolton', 'Wigan', 'Warrington', 'Chester', 'Shrewsbury', 'Hereford', 'Gloucester', 'Salisbury', 'Portsmouth', 'Maidstone', 'Canterbury', 'Dartford']

const UK_FIRST_NAMES = ['James', 'John', 'David', 'Michael', 'Robert', 'Daniel', 'William', 'Thomas', 'Christopher', 'Matthew', 'Sarah', 'Emma', 'Lucy', 'Emily', 'Sophie', 'Hannah', 'Charlotte', 'Jessica', 'Laura', 'Rebecca', 'Mohammed', 'Ahmed', 'Ali', 'Omar', 'Liam', 'Noah', 'Oliver', 'George', 'Arthur', 'Harry']
const UK_LAST_NAMES = ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke', 'Patel', 'Khan', 'Lewis', 'James', 'Phillips', 'Murray', 'Scott', 'Watson', 'Campbell', 'Stewart']

// Status variants for "dirt" - typos, wrong case, extra spaces
const STATUS_DIRT = {
  draft: ['Draft', 'draft', 'DRAFT', ' Draft ', 'drft'],
  sent: ['Sent', 'sent', 'SENT', ' sent '],
  accepted: ['Accepted', 'accepted', 'ACCEPTED', 'accepted '],
  rejected: ['Rejected', 'rejected', 'REJECTED'],
  expired: ['Expired', 'expired', 'EXPIRED'],
  posted: ['Posted', 'posted', 'POSTED', ' posted '],
  in_transit: ['In Transit', 'in_transit', 'In Transit', 'in transit', 'IN TRANSIT'],
  completed: ['Completed', 'completed', 'COMPLETED'],
  cancelled: ['Cancelled', 'cancelled', 'CANCELED', 'Cancelled '],
}

let seed = 42
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

function pickDirty(status: string): string {
  const variants = STATUS_DIRT[status as keyof typeof STATUS_DIRT]
  if (variants) return pick(variants)
  return status
}

function dateInPastMonths(monthsBack: number): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsBack)
  const range = 30 * 24 * 60 * 60 * 1000
  return new Date(d.getTime() + rand() * range - range / 2)
}

function randDatePast3Months(): string {
  return dateInPastMonths(Math.floor(rand() * 3)).toISOString()
}

function ukName(): string {
  return `${pick(UK_FIRST_NAMES)} ${pick(UK_LAST_NAMES)}`
}

export function generateQuotes(loadIds: string[]): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  for (let i = 0; i < QUOTE_COUNT; i++) {
    const loadId = loadIds[i % loadIds.length]
    const createdAt = randDatePast3Months()
    const status = pick(QUOTE_STATUS)
    rows.push({
      'Quote Ref': randomUUID(),
      'Load Reference': loadId,
      'Quoted Amount': (Math.round(rand() * 5000 * 100) / 100).toFixed(2),
      Status: rand() > 0.15 ? pickDirty(status) : pickDirty(pick(QUOTE_STATUS)),
      'Date Created': createdAt,
      'Distance (km)': rand() > 0.9 ? null : (rand() * 500).toFixed(2),
      'Collection Town': pick(UK_TOWNS),
      'Collection City': pick(UK_CITIES),
      'Delivery Town': pick(UK_TOWNS),
      'Delivery City': pick(UK_CITIES),
      'Fleet ID': randomUUID(),
      'Quoter Name': ukName(),
      'Vehicle Type': pick(VEHICLE_TYPES),
      created_at: createdAt,
      updated_at: randDatePast3Months(),
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
    const createdAt = randDatePast3Months()
    const status = pick(LOAD_STATUS)
    rows.push({
      'Load Number': loadId,
      'Collection Town': pick(UK_TOWNS),
      'Collection City': pick(UK_CITIES),
      'Delivery Town': pick(UK_TOWNS),
      'Delivery City': pick(UK_CITIES),
      'Distance km': rand() > 0.85 ? null : (rand() * 400).toFixed(2),
      Status: rand() > 0.12 ? pickDirty(status) : pickDirty(pick(LOAD_STATUS)),
      'Poster Name': ukName(),
      'Vehicle ID': null as string | null,
      'Driver ID': null as string | null,
      created_at: createdAt,
      updated_at: randDatePast3Months(),
    })
  }
  return { rows, loadIds }
}

export function generateDriverVehicle(
  loadRows: Record<string, unknown>[]
): { driverVehicleRows: Record<string, unknown>[]; updatedLoadRows: Record<string, unknown>[] } {
  const driverVehicles: Record<string, unknown>[] = []
  const vehicleTypes = [...VEHICLE_TYPES]

  for (let i = 0; i < DRIVER_VEHICLE_COUNT; i++) {
    const vehicleId = randomUUID()
    const driverId = randomUUID()
    const createdAt = randDatePast3Months()
    const vt = pick(vehicleTypes)
    driverVehicles.push({
      'Vehicle ID': vehicleId,
      'Type': rand() > 0.1 ? vt : (vt.toUpperCase() + (rand() > 0.5 ? '' : ' ')),
      'Registration': `AB${String(10 + (i % 90)).padStart(2, '0')} ${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i + 7) % 26))} ${i % 10}${(i + 1) % 10}${(i + 2) % 10}`,
      'Capacity kg': rand() > 0.08 ? (Math.round(rand() * 5000)).toString() : null,
      'Driver ID': driverId,
      'Driver Name': ukName(),
      'Fleet ID': randomUUID(),
      created_at: createdAt,
      updated_at: randDatePast3Months(),
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
