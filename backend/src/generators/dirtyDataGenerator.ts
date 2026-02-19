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
const UK_CITIES_DIRTY = ['london', 'MANCHESTER', 'Birmigham', 'Leeds ', 'Glasow', 'Lverpool', 'Bristol', 'Sheffeild', 'Edinbrugh', 'CArdiff', 'Belfst', 'Newcstle', 'Nottingam', 'Southhampton', 'Bighton', 'Leicster', 'Coventy', ' Hul ', 'Bradfrord', 'Stokee']
const UK_TOWNS = ['Reading', 'Slough', 'Luton', 'Northampton', 'Derby', 'Oxford', 'Cambridge', 'Ipswich', 'Milton Keynes', 'Swindon', 'Peterborough', 'Exeter', 'Plymouth', 'Bournemouth', 'Blackpool', 'Preston', 'Burnley', 'S Blackburn', 'Bolton', 'Wigan', 'Warrington', 'Chester', 'Shrewsbury', 'Hereford', 'Gloucester', 'Salisbury', 'Portsmouth', 'Maidstone', 'Canterbury', 'Dartford']
const UK_TOWNS_DIRTY = ['Reading', 'slough', 'LUTON', 'Nothampton', 'Derby', 'Oxfrord', 'Cambrige', 'Ipswich ', 'Milton Keyes', 'Swindn', 'Peterbrough', 'Exter', 'Plymoth', 'Bournmouth', 'Black pool', 'Preston', 'Burnely', 'S. Blackburn', 'Boltn', 'Wigan', 'Warrington', 'Chestre', 'Shrewbury', 'Hereford', 'Glouster', 'Salsbury', 'Portsmouh', 'Maidston', 'Canterbry', 'Dartfourth']

const UK_FIRST_NAMES = ['James', 'John', 'David', 'Michael', 'Robert', 'Daniel', 'William', 'Thomas', 'Christopher', 'Matthew', 'Sarah', 'Emma', 'Lucy', 'Emily', 'Sophie', 'Hannah', 'Charlotte', 'Jessica', 'Laura', 'Rebecca', 'Mohammed', 'Ahmed', 'Ali', 'Omar', 'Liam', 'Noah', 'Oliver', 'George', 'Arthur', 'Harry']
const UK_FIRST_DIRTY = ['james', 'JOHN', 'Davd', 'Micheal', 'Rober', 'Danial', 'Willaim', 'Thommas', 'Christoper', 'Mathew', 'Srah', 'Ema', 'Lucy', 'Emely', 'Sofie', 'Hanna', 'Charlote', 'Jesscia', 'Laua', 'Rebeca', 'Mohamed', 'Ahmad', 'Ali', 'Omar', 'Laim', 'Noa', 'Olivar', 'Geoge', 'Arhtur', 'Hary']
const UK_LAST_NAMES = ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke', 'Patel', 'Khan', 'Lewis', 'James', 'Phillips', 'Murray', 'Scott', 'Watson', 'Campbell', 'Stewart']
const UK_LAST_DIRTY = ['Smyth', 'jones', 'Tayler', 'Browne', 'Wiliams', 'WIlson', 'Johnsson', 'Davis', 'Robinson', 'Wright', 'Thomson', 'Evnas', 'Walker', 'Whit', 'Roberts', 'Greene', 'Hal', 'Wood', 'Jakson', 'Clark', 'Patle', 'Kan', 'Lewis', 'Jams', 'Phillps', 'Murry', 'Scot', 'Watson', 'Campbel', 'Stuart']

// Status variants for "dirt" - typos, wrong case, extra spaces, mixed formats
const STATUS_DIRT = {
  draft: ['Draft', 'draft', 'DRAFT', ' Draft ', 'drft', 'DRAF', 'draf', 'DRAff', ' draft', 'Draft  '],
  sent: ['Sent', 'sent', 'SENT', ' sent ', 'snt', 'Sen', 'sent ', ' SENT'],
  accepted: ['Accepted', 'accepted', 'ACCEPTED', 'accepted ', 'Acepted', 'acceptd', 'ACEPTED', ' accepted'],
  rejected: ['Rejected', 'rejected', 'REJECTED', 'Rejectd', 'reject', 'REJCTED', ' rejected '],
  expired: ['Expired', 'expired', 'EXPIRED', 'Exired', 'expirred', 'expird', 'EXPIRES'],
  posted: ['Posted', 'posted', 'POSTED', ' posted ', 'postd', 'Post', 'poste', 'POSTD'],
  in_transit: ['In Transit', 'in_transit', 'In Transit', 'in transit', 'IN TRANSIT', 'InTransit', 'in-transit', 'IN_TRANSIT', 'in  transit', 'InTransit ', 'In Trasit'],
  completed: ['Completed', 'completed', 'COMPLETED', 'Complet', 'completd', 'COMPLETD', ' completed ', 'Completd'],
  cancelled: ['Cancelled', 'cancelled', 'CANCELED', 'Cancelled ', 'Cancled', 'canceld', 'CANCELLED', ' cancelled', 'Canceled'],
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

// Mix of formats: ISO, DD/MM/YYYY, MM-DD-YYYY, DD-MM-YYYY, with typos
function dirtyDate(iso: string): string {
  const d = new Date(iso)
  const fmt = Math.floor(rand() * 6)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  if (fmt === 0) return iso // ISO
  if (fmt === 1) return `${day}/${month}/${year}` // DD/MM/YYYY
  if (fmt === 2) return `${month}-${day}-${year}` // MM-DD-YYYY (US)
  if (fmt === 3) return `${day}-${month}-${year}` // DD-MM-YYYY
  if (fmt === 4) return `${day}.${month}.${year}` // DD.MM.YYYY
  // fmt 5: malformed - extra space, wrong separator, or typo
  if (rand() > 0.5) return `${day}/${month}/${year} ` // trailing space
  return `${day}//${month}/${year}` // double slash
}

function ukName(): string {
  return rand() > 0.35 ? `${pick(UK_FIRST_NAMES)} ${pick(UK_LAST_NAMES)}` : `${pick(UK_FIRST_DIRTY)} ${pick(UK_LAST_DIRTY)}`
}

function dirtyNumber(val: number, asString: boolean): string | number {
  if (!asString) return val
  const s = val.toFixed(2)
  if (rand() > 0.25) return s
  if (rand() > 0.5) return s.replace('.', ',') // comma decimal (e.g. 12,34)
  if (rand() > 0.5) return s + ' ' // trailing space
  return rand() > 0.5 ? s + ' GBP' : s + '£' // unit suffix
}

function dirtyTownOrCity(pool: readonly string[], dirtyPool: readonly string[]): string {
  return rand() > 0.3 ? pick(pool) : pick(dirtyPool)
}

export function generateQuotes(loadIds: string[]): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  for (let i = 0; i < QUOTE_COUNT; i++) {
    const loadId = loadIds[i % loadIds.length]
    const createdAt = randDatePast3Months()
    const status = pick(QUOTE_STATUS)
    const amount = Math.round(rand() * 5000 * 100) / 100
    const dist = rand() * 500
    rows.push({
      'Quote Ref': rand() > 0.92 ? randomUUID().slice(0, 20) + 'X' : randomUUID(), // occasional malformed UUID
      'Load Reference': loadId,
      'Quoted Amount': rand() > 0.1 ? dirtyNumber(amount, true) as string : amount.toString().replace('.', ','),
      Status: rand() > 0.12 ? pickDirty(status) : pickDirty(pick(QUOTE_STATUS)),
      'Date Created': rand() > 0.25 ? dirtyDate(createdAt) : createdAt,
      'Distance (km)': rand() > 0.9 ? null : (rand() > 0.15 ? dirtyNumber(dist, true) : (dist.toFixed(2) + ' km')),
      'Fleet ID': randomUUID(),
      'Quoter Name': ukName(),
      'Vehicle Type': rand() > 0.1 ? pick(VEHICLE_TYPES) : (pick(VEHICLE_TYPES).toUpperCase() + (rand() > 0.5 ? '' : '  ')),
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
    const dist = rand() * 400
    const collDate = dateInPastMonths(Math.floor(rand() * 2))
    const delivDate = dateInPastMonths(Math.floor(rand() * 2))
    const collDateStr = collDate.toISOString().split('T')[0]
    const delivDateStr = delivDate.toISOString().split('T')[0]
    const collIso = collDate.toISOString()
    const delivIso = delivDate.toISOString()
    rows.push({
      'Load Number': loadId,
      'Collection Town': dirtyTownOrCity(UK_TOWNS, UK_TOWNS_DIRTY),
      'Collection City': dirtyTownOrCity(UK_CITIES, UK_CITIES_DIRTY),
      'Collection Time': rand() > 0.15 ? (rand() > 0.3 ? dirtyDate(collIso) : collIso) : null,
      'Collection Date': rand() > 0.15 ? (rand() > 0.3 ? dirtyDate(collDateStr) : collDateStr) : null,
      'Delivery Town': dirtyTownOrCity(UK_TOWNS, UK_TOWNS_DIRTY),
      'Delivery City': dirtyTownOrCity(UK_CITIES, UK_CITIES_DIRTY),
      'Delivery Time': rand() > 0.15 ? (rand() > 0.3 ? dirtyDate(delivIso) : delivIso) : null,
      'Delivery Date': rand() > 0.15 ? (rand() > 0.3 ? dirtyDate(delivDateStr) : delivDateStr) : null,
      'Distance km': rand() > 0.85 ? null : (rand() > 0.2 ? dirtyNumber(dist, true) : String(Math.round(dist)) + 'km'),
      Status: rand() > 0.1 ? pickDirty(status) : pickDirty(pick(LOAD_STATUS)),
      'Poster Name': ukName(),
      'Vehicle ID': null as string | null,
      'Driver ID': null as string | null,
      'Number of Items': rand() > 0.2 ? Math.floor(rand() * 50) + 1 : (rand() > 0.5 ? null : Math.floor(rand() * 100)),
      created_at: createdAt,
      updated_at: randDatePast3Months(),
    })
  }
  return { rows, loadIds }
}

export function generateDriverVehicle(
  loadRows: Record<string, unknown>[],
  linkLoadsToVehicles = true
): { driverVehicleRows: Record<string, unknown>[]; updatedLoadRows: Record<string, unknown>[] } {
  const driverVehicles: Record<string, unknown>[] = []
  const vehicleTypes = [...VEHICLE_TYPES]

  for (let i = 0; i < DRIVER_VEHICLE_COUNT; i++) {
    const vehicleId = randomUUID()
    const driverId = randomUUID()
    const createdAt = randDatePast3Months()
    const vt = pick(vehicleTypes)
    const reg = `AB${String(10 + (i % 90)).padStart(2, '0')} ${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i + 7) % 26))} ${i % 10}${(i + 1) % 10}${(i + 2) % 10}`
    const first = pick(UK_FIRST_NAMES)
    driverVehicles.push({
      'Vehicle ID': vehicleId,
      'Type': rand() > 0.1 ? vt : (rand() > 0.33 ? vt.toUpperCase() : rand() > 0.5 ? vt + '  ' : vt.toLowerCase()),
      'Registration': rand() > 0.85 ? reg.replace(' ', '-') : rand() > 0.9 ? reg + ' ' : reg,
      'Capacity kg': rand() > 0.08 ? (rand() > 0.15 ? (Math.round(rand() * 5000)).toString() + ' kg' : (Math.round(rand() * 5000)).toString()) : null,
      'Driver ID': driverId,
      'Driver Name': ukName(),
      'Fleet ID': randomUUID(),
      'Email': rand() > 0.25 ? `${first.toLowerCase().replace(/\s/g, '')}.${pick(UK_LAST_NAMES).toLowerCase()}@example.com` : (rand() > 0.5 ? null : 'bad-email'),
      'Phone': rand() > 0.2 ? `07${Math.floor(rand() * 900000000 + 100000000)}` : (rand() > 0.5 ? null : '555-1234'),
      created_at: createdAt,
      updated_at: randDatePast3Months(),
    })
  }

  const updatedLoads = loadRows.map((r) => ({ ...r }))
  if (linkLoadsToVehicles) {
    const assignCount = Math.min(updatedLoads.length, driverVehicles.length)
    for (let i = 0; i < assignCount; i++) {
      const load = updatedLoads[i] as Record<string, unknown>
      const dv = driverVehicles[i % driverVehicles.length] as Record<string, unknown>
      load['Vehicle ID'] = dv['Vehicle ID']
      load['Driver ID'] = dv['Driver ID']
    }
  }
  return { driverVehicleRows: driverVehicles, updatedLoadRows: updatedLoads }
}
