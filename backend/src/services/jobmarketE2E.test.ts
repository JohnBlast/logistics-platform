/**
 * Job Market E2E and edge case tests (T051, T052, T053)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  addLoad,
  addQuote,
  addDriver,
  addVehicle,
  getDefaultFleetId,
  resetForTesting,
  getLoad,
  getQuote,
} from './jobmarketStore.js'
import { generateJobs } from './jobGeneratorService.js'
import { generateFleet } from './fleetGeneratorService.js'
import { submitQuote } from './quoteSubmissionService.js'
import { haversineDistance } from '../lib/haversine.js'
import { lookupHub } from '../lib/ukHubs.js'

describe('Job Market E2E', () => {
  beforeEach(() => {
    resetForTesting({ rating: 4.2, companyName: 'Express Logistics Ltd' })
  })

  it('E2E-01: submit quote happy path, ETA ~160min, recommender range ~£651–£881', async () => {
    const load = addLoad({
      collection_city: 'Leeds',
      delivery_city: 'Southampton',
      distance_km: 370.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
    })
    const driver = addDriver({
      name: 'Alice Smith',
      fleet_id: getDefaultFleetId(),
      has_adr_certification: true,
    })
    const vehicle = addVehicle({
      vehicle_type: 'rigid_18t',
      registration_number: 'AB12 CDE',
      capacity_kg: 18000,
      current_city: 'Birmingham',
    })

    const bham = lookupHub('Birmingham')!
    const leeds = lookupHub('Leeds')!
    const distKm = haversineDistance(bham.lat, bham.lng, leeds.lat, leeds.lng)
    const etaMin = Math.round((distKm / 60) * 60)
    expect(etaMin).toBeGreaterThan(140)
    expect(etaMin).toBeLessThan(180)

    const result = submitQuote({
      load_id: load.load_id,
      quoted_price: 741,
      vehicle_id: vehicle.vehicle_id,
      driver_id: driver.driver_id,
    })

    expect('code' in result).toBe(false)
    expect(result.eta_to_collection).toBeGreaterThan(140)
    expect(result.eta_to_collection).toBeLessThan(180)
    expect(result.recommended_price?.min).toBeLessThan(700)
    expect(result.recommended_price?.max).toBeGreaterThan(850)
    expect(result.status).toBe('accepted')
  })

  it('E2E-04: job generation - 3 jobs, all posted, valid fields', () => {
    const jobs = generateJobs(3)
    expect(jobs).toHaveLength(3)
    for (const j of jobs) {
      expect(j.status).toBe('posted')
      expect(j.distance_km).toBeGreaterThan(0)
      expect(j.collection_city).not.toBe(j.delivery_city)
      expect(['small_van', 'medium_van', 'large_van', 'luton', 'rigid_7_5t', 'rigid_18t', 'rigid_26t', 'articulated']).toContain(j.required_vehicle_type)
      expect(typeof j.adr_required).toBe('boolean')
    }
  })

  it('E2E-06: fleet generation - 3 drivers, 3 vehicles, profile updated', () => {
    resetForTesting()
    const { drivers, vehicles } = generateFleet(3, 3)
    expect(drivers).toHaveLength(3)
    expect(vehicles).toHaveLength(3)
    for (const d of drivers) {
      expect(d.fleet_id).toBeDefined()
      expect(typeof d.has_adr_certification).toBe('boolean')
    }
    for (const v of vehicles) {
      expect(['small_van', 'medium_van', 'large_van', 'luton', 'rigid_7_5t', 'rigid_18t', 'rigid_26t', 'articulated']).toContain(v.vehicle_type)
      expect(v.current_city).toBeDefined()
    }
  })
})

describe('Job Market Edge Cases', () => {
  beforeEach(() => {
    resetForTesting()
  })

  it('E2E-EC-02: ADR hard gate - submission blocked (422)', () => {
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'Felixstowe',
      distance_km: 220.8,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: true,
      required_vehicle_type: 'articulated',
    })
    const driver = addDriver({
      name: 'Bob',
      fleet_id: getDefaultFleetId(),
      has_adr_certification: false,
    })
    const vehicle = addVehicle({
      vehicle_type: 'articulated',
      registration_number: 'XY99',
      current_city: 'Birmingham',
    })

    const result = submitQuote({
      load_id: load.load_id,
      quoted_price: 700,
      vehicle_id: vehicle.vehicle_id,
      driver_id: driver.driver_id,
    })

    expect('code' in result).toBe(true)
    expect((result as any).code).toBe('ADR_REQUIRED')
    expect((result as any).message).toContain('ADR')
  })

  it('E2E-EC-03: duplicate quote prevention - rejected (409)', () => {
    const load = addLoad({
      collection_city: 'Leeds',
      delivery_city: 'London',
      distance_km: 300,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
    })
    const driver = addDriver({
      name: 'Alice',
      fleet_id: getDefaultFleetId(),
      has_adr_certification: true,
    })
    const vehicle = addVehicle({
      vehicle_type: 'rigid_18t',
      registration_number: 'AB12',
      current_city: 'Leeds',
    })
    addQuote({
      load_id: load.load_id,
      quoted_price: 500,
      status: 'sent',
      associated_fleet_id: getDefaultFleetId(),
      fleet_quoter_name: 'Test',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_18t',
      adr_certified: true,
      eta_to_collection: 60,
      distance_km: 300,
    })
    const second = submitQuote({
      load_id: load.load_id,
      quoted_price: 550,
      vehicle_id: vehicle.vehicle_id,
      driver_id: driver.driver_id,
    })
    expect('code' in second).toBe(true)
    expect((second as any).code).toBe('DUPLICATE_QUOTE')
  })

  it('E2E-EC-05: vehicle type mismatch - offered smaller than requested, vehicle_match=0', () => {
    resetForTesting({ rating: 4.2 })
    const load = addLoad({
      collection_city: 'Glasgow',
      delivery_city: 'London',
      distance_km: 555,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'articulated',
    })
    const driver = addDriver({
      name: 'Carol',
      fleet_id: getDefaultFleetId(),
      has_adr_certification: true,
    })
    const vehicle = addVehicle({
      vehicle_type: 'small_van',
      registration_number: 'JK56',
      current_city: 'Glasgow',
    })

    const result = submitQuote({
      load_id: load.load_id,
      quoted_price: 600,
      vehicle_id: vehicle.vehicle_id,
      driver_id: driver.driver_id,
    })

    expect('code' in result).toBe(false)
    expect(result.score_breakdown?.vehicle_match).toBe(0)
  })

  it('E2E-EC-01: no vehicles/drivers - quote submission blocked', () => {
    resetForTesting()
    const load = addLoad({
      collection_city: 'London',
      delivery_city: 'Manchester',
      distance_km: 300,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
    })

    const result = submitQuote({
      load_id: load.load_id,
      quoted_price: 500,
      vehicle_id: 'any',
      driver_id: 'any',
    })

    expect('code' in result).toBe(true)
    expect((result as any).code).toBe('NO_FLEET')
    expect((result as any).message).toContain('vehicles')
  })
})
