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
import { scoreAndEvaluate } from './acceptanceService.js'

describe('acceptanceService', () => {
  const fleetId = getDefaultFleetId()

  beforeEach(() => {
    resetForTesting({ rating: 4.2 })
  })

  it('EVAL-02: 15 test quotes, composite matches manual calculation', () => {
    const results: { composite: number; accepted: boolean }[] = []

    for (let i = 0; i < 15; i++) {
      resetForTesting({ rating: 3.0 + (i % 3) * 0.5 })
      const load = addLoad({
        collection_city: 'Birmingham',
        delivery_city: 'London',
        distance_km: 200 + i * 20,
        status: 'posted',
        load_poster_name: 'Test',
        adr_required: i % 4 === 0,
        required_vehicle_type: 'rigid_18t',
      })
      addDriver({
        name: `Driver ${i}`,
        fleet_id: fleetId,
        has_adr_certification: true,
      })
      addVehicle({
        vehicle_type: 'rigid_18t',
        registration_number: `REG${i}`,
        current_city: 'Birmingham',
      })
      const quote = addQuote({
        load_id: load.load_id,
        quoted_price: 400 + i * 30,
        status: 'sent',
        associated_fleet_id: fleetId,
        fleet_quoter_name: 'Test',
        requested_vehicle_type: 'rigid_18t',
        offered_vehicle_type: 'rigid_18t',
        adr_certified: true,
        eta_to_collection: 60 + i * 10,
        distance_km: load.distance_km,
      })
      const result = scoreAndEvaluate(quote.quote_id)
      expect(result).not.toBeNull()
      results.push({
        composite: result!.breakdown.composite_score,
        accepted: result!.accepted,
      })
      // Weights: price 0.40, eta 0.25, rating 0.15, vehicle 0.20
      const manual =
        result!.breakdown.price_score * 0.4 +
        result!.breakdown.eta_score * 0.25 +
        result!.breakdown.fleet_rating_score * 0.15 +
        result!.breakdown.vehicle_match * 0.20
      expect(result!.breakdown.composite_score).toBeCloseTo(manual, 2)
    }
    expect(results.length).toBe(15)
  })

  it('E2E-02: single quote near mid-price accepted (sole bidder benchmark scoring)', () => {
    resetForTesting({ rating: 4.2 })
    const load = addLoad({
      collection_city: 'Leeds',
      delivery_city: 'Southampton',
      distance_km: 370.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
    })
    const quote = addQuote({
      load_id: load.load_id,
      quoted_price: 741,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Express',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_18t',
      adr_certified: true,
      eta_to_collection: 160,
      distance_km: 370.5,
    })
    const result = scoreAndEvaluate(quote.quote_id)
    expect(result).not.toBeNull()
    expect(result!.accepted).toBe(true)
    expect(result!.breakdown.price_score).toBeLessThan(1.0)
    expect(result!.breakdown.price_score).toBeGreaterThan(0.8)
    expect(result!.breakdown.eta_score).toBe(1)
    expect(result!.breakdown.vehicle_match).toBe(1) // exact match
    expect(result!.breakdown.composite_score).toBeGreaterThan(0.6)
    expect(getQuote(quote.quote_id)?.status).toBe('accepted')
    expect(getLoad(load.load_id)?.status).toBe('in_transit')
  })

  it('sole bidder with overpriced quote and long ETA is rejected', () => {
    resetForTesting({ rating: 2.0 })
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
    })
    // Recommended mid ≈ £310. Quote at £900 with 400 min ETA and low rating.
    const quote = addQuote({
      load_id: load.load_id,
      quoted_price: 900,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Bad Fleet',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_18t',
      adr_certified: false,
      eta_to_collection: 400,
      distance_km: 163.5,
    })
    const result = scoreAndEvaluate(quote.quote_id)
    expect(result).not.toBeNull()
    expect(result!.accepted).toBe(false)
    expect(result!.breakdown.price_score).toBeLessThan(0.1)
    expect(result!.breakdown.eta_score).toBeLessThan(0.5)
    expect(getQuote(quote.quote_id)?.status).toBe('rejected')
  })

  // --- Vehicle match gradient tests ---

  it('undersized vehicle gets vehicle_match = 0', () => {
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'Felixstowe',
      distance_km: 220.8,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'articulated',
    })
    const quote = addQuote({
      load_id: load.load_id,
      quoted_price: 700,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Fleet1',
      requested_vehicle_type: 'articulated',
      offered_vehicle_type: 'small_van', // way too small
      adr_certified: false,
      eta_to_collection: 60,
      distance_km: 220.8,
    })
    const result = scoreAndEvaluate(quote.quote_id)
    expect(result).not.toBeNull()
    expect(result!.breakdown.vehicle_match).toBe(0) // hard fail
  })

  it('exact vehicle match gets 1.0', () => {
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
    })
    const quote = addQuote({
      load_id: load.load_id,
      quoted_price: 350,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Fleet1',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_18t',
      adr_certified: false,
      eta_to_collection: 60,
      distance_km: 163.5,
    })
    const result = scoreAndEvaluate(quote.quote_id)
    expect(result).not.toBeNull()
    expect(result!.breakdown.vehicle_match).toBe(1.0)
  })

  it('1 size up vehicle gets 0.9', () => {
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
    })
    const quote = addQuote({
      load_id: load.load_id,
      quoted_price: 350,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Fleet1',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_26t', // 1 size up
      adr_certified: false,
      eta_to_collection: 60,
      distance_km: 163.5,
    })
    const result = scoreAndEvaluate(quote.quote_id)
    expect(result).not.toBeNull()
    expect(result!.breakdown.vehicle_match).toBe(0.9)
  })

  it('3+ sizes up vehicle gets 0.6', () => {
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'small_van',
    })
    const quote = addQuote({
      load_id: load.load_id,
      quoted_price: 150,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Fleet1',
      requested_vehicle_type: 'small_van',
      offered_vehicle_type: 'rigid_18t', // 5 sizes up
      adr_certified: false,
      eta_to_collection: 60,
      distance_km: 163.5,
    })
    const result = scoreAndEvaluate(quote.quote_id)
    expect(result).not.toBeNull()
    expect(result!.breakdown.vehicle_match).toBe(0.6)
  })

  // --- ETA with collection_time tests ---

  it('ETA arriving on time for collection gets score 1.0', () => {
    const collectionTime = new Date(Date.now() + 120 * 60_000).toISOString() // 2 hours from now
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
      collection_time: collectionTime,
    })
    const quote = addQuote({
      load_id: load.load_id,
      quoted_price: 350,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Fleet1',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_18t',
      adr_certified: false,
      eta_to_collection: 90, // 90 min ETA, collection in 120 min → 30 min early
      distance_km: 163.5,
    })
    const result = scoreAndEvaluate(quote.quote_id)
    expect(result).not.toBeNull()
    expect(result!.breakdown.eta_score).toBe(1.0)
  })

  it('ETA arriving 10 min late still gets score 1.0 (grace period)', () => {
    const collectionTime = new Date(Date.now() + 60 * 60_000).toISOString() // 1 hour from now
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
      collection_time: collectionTime,
    })
    const quote = addQuote({
      load_id: load.load_id,
      quoted_price: 350,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Fleet1',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_18t',
      adr_certified: false,
      eta_to_collection: 70, // 70 min ETA, collection in 60 min → 10 min late
      distance_km: 163.5,
    })
    const result = scoreAndEvaluate(quote.quote_id)
    expect(result).not.toBeNull()
    expect(result!.breakdown.eta_score).toBe(1.0)
  })

  it('ETA arriving 45 min late gets heavily penalised', () => {
    const collectionTime = new Date(Date.now() + 60 * 60_000).toISOString() // 1 hour from now
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
      collection_time: collectionTime,
    })
    const quote = addQuote({
      load_id: load.load_id,
      quoted_price: 350,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Fleet1',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_18t',
      adr_certified: false,
      eta_to_collection: 105, // 105 min ETA, collection in 60 min → 45 min late
      distance_km: 163.5,
    })
    const result = scoreAndEvaluate(quote.quote_id)
    expect(result).not.toBeNull()
    expect(result!.breakdown.eta_score).toBeLessThan(0.3)
    expect(result!.breakdown.eta_score).toBeGreaterThan(0.0)
  })

  it('ETA arriving 60+ min late gets score 0', () => {
    const collectionTime = new Date(Date.now() + 60 * 60_000).toISOString() // 1 hour from now
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
      collection_time: collectionTime,
    })
    const quote = addQuote({
      load_id: load.load_id,
      quoted_price: 350,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Fleet1',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_18t',
      adr_certified: false,
      eta_to_collection: 180, // 180 min ETA, collection in 60 min → 120 min late
      distance_km: 163.5,
    })
    const result = scoreAndEvaluate(quote.quote_id)
    expect(result).not.toBeNull()
    expect(result!.breakdown.eta_score).toBe(0)
  })

  // --- Competitive scoring ---

  it('REC-EC-03: poor quote in competitive pool is rejected', () => {
    resetForTesting({ rating: 1.0 })
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'Felixstowe',
      distance_km: 220.8,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: true,
      required_vehicle_type: 'articulated',
    })
    addQuote({
      load_id: load.load_id,
      quoted_price: 100,
      status: 'sent',
      associated_fleet_id: 'other-fleet',
      fleet_quoter_name: 'Other',
      requested_vehicle_type: 'articulated',
      offered_vehicle_type: 'articulated',
      adr_certified: true,
      eta_to_collection: 10,
      distance_km: 220.8,
    })
    const poorQuote = addQuote({
      load_id: load.load_id,
      quoted_price: 9999,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Test',
      requested_vehicle_type: 'articulated',
      offered_vehicle_type: 'rigid_18t', // undersized
      adr_certified: true,
      eta_to_collection: 480,
      distance_km: 220.8,
    })
    const result = scoreAndEvaluate(poorQuote.quote_id)
    expect(result).not.toBeNull()
    expect(result!.accepted).toBe(false)
    expect(result!.breakdown.vehicle_match).toBe(0) // undersized
    expect(result!.breakdown.composite_score).toBeLessThan(0.5)
    expect(getQuote(poorQuote.quote_id)?.status).toBe('rejected')
  })

  it('REC-EC-04: two quotes, better quote wins', () => {
    resetForTesting({ rating: 4.2 })
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
    })
    const q1 = addQuote({
      load_id: load.load_id,
      quoted_price: 350,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Fleet1',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_18t',
      adr_certified: true,
      eta_to_collection: 90,
      distance_km: 163.5,
    })
    const q2 = addQuote({
      load_id: load.load_id,
      quoted_price: 400,
      status: 'sent',
      associated_fleet_id: 'fleet-002',
      fleet_quoter_name: 'Fleet2',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_18t',
      adr_certified: true,
      eta_to_collection: 120,
      distance_km: 163.5,
    })
    scoreAndEvaluate(q1.quote_id)
    const status1 = getQuote(q1.quote_id)?.status
    const status2 = getQuote(q2.quote_id)?.status
    expect([status1, status2].sort()).toEqual(['accepted', 'rejected'])
  })

  // --- ZOPA gate tests ---

  it('ZOPA: quote exceeding max_budget is instantly rejected', () => {
    resetForTesting({ rating: 4.2 })
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
      max_budget: 400,
    })
    const quote = addQuote({
      load_id: load.load_id,
      quoted_price: 500, // exceeds budget of £400
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Fleet1',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_18t',
      adr_certified: false,
      eta_to_collection: 60,
      distance_km: 163.5,
    })
    const result = scoreAndEvaluate(quote.quote_id)
    expect(result).not.toBeNull()
    expect(result!.accepted).toBe(false)
    expect(result!.feedback).toContain('exceeds the poster')
    expect(result!.breakdown.composite_score).toBe(0)
    expect(getQuote(quote.quote_id)?.status).toBe('rejected')
  })

  it('ZOPA: quote within max_budget proceeds to scoring', () => {
    resetForTesting({ rating: 4.2 })
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
      max_budget: 500,
    })
    const quote = addQuote({
      load_id: load.load_id,
      quoted_price: 350, // within budget
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Fleet1',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_18t',
      adr_certified: false,
      eta_to_collection: 60,
      distance_km: 163.5,
    })
    const result = scoreAndEvaluate(quote.quote_id)
    expect(result).not.toBeNull()
    expect(result!.breakdown.composite_score).toBeGreaterThan(0)
    // Should proceed to normal scoring, not instant rejection
    expect(result!.breakdown.price_score).toBeGreaterThan(0)
  })

  it('ZOPA: vehicle not in acceptable_vehicle_types is instantly rejected', () => {
    resetForTesting({ rating: 4.2 })
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
      acceptable_vehicle_types: ['rigid_18t', 'rigid_26t', 'articulated'],
    })
    const quote = addQuote({
      load_id: load.load_id,
      quoted_price: 350,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Fleet1',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'small_van', // not in acceptable list
      adr_certified: false,
      eta_to_collection: 60,
      distance_km: 163.5,
    })
    const result = scoreAndEvaluate(quote.quote_id)
    expect(result).not.toBeNull()
    expect(result!.accepted).toBe(false)
    expect(result!.feedback).toContain('not accepted for this job')
    expect(result!.breakdown.composite_score).toBe(0)
  })

  it('ZOPA: vehicle in acceptable_vehicle_types gets gradient score', () => {
    resetForTesting({ rating: 4.2 })
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
      acceptable_vehicle_types: ['rigid_18t', 'rigid_26t', 'articulated'],
    })
    // First in list (ideal) = 1.0
    const q1 = addQuote({
      load_id: load.load_id,
      quoted_price: 350,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Fleet1',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_18t', // first in acceptable list
      adr_certified: false,
      eta_to_collection: 60,
      distance_km: 163.5,
    })
    const r1 = scoreAndEvaluate(q1.quote_id)
    expect(r1).not.toBeNull()
    expect(r1!.breakdown.vehicle_match).toBe(1.0)
  })

  it('ZOPA: second acceptable vehicle gets 0.85', () => {
    resetForTesting({ rating: 4.2 })
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
      acceptable_vehicle_types: ['rigid_18t', 'rigid_26t', 'articulated'],
    })
    const q = addQuote({
      load_id: load.load_id,
      quoted_price: 350,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Fleet1',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_26t', // second in acceptable list
      adr_certified: false,
      eta_to_collection: 60,
      distance_km: 163.5,
    })
    const result = scoreAndEvaluate(q.quote_id)
    expect(result).not.toBeNull()
    expect(result!.breakdown.vehicle_match).toBe(0.85)
  })

  it('ZOPA: collection_window_minutes extends grace period', () => {
    resetForTesting({ rating: 4.2 })
    // 30 min window — arriving 25 min late should still be 1.0
    const collectionTime = new Date(Date.now() + 60 * 60_000).toISOString()
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
      collection_time: collectionTime,
      collection_window_minutes: 30,
    })
    const quote = addQuote({
      load_id: load.load_id,
      quoted_price: 350,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Fleet1',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_18t',
      adr_certified: false,
      eta_to_collection: 85, // 85 min ETA, collection in 60 min → 25 min late, within 30 min window
      distance_km: 163.5,
    })
    const result = scoreAndEvaluate(quote.quote_id)
    expect(result).not.toBeNull()
    expect(result!.breakdown.eta_score).toBe(1.0) // within 30 min window
  })

  it('ZOPA: budget-aware price scoring tapers to 0.5 at max_budget', () => {
    resetForTesting({ rating: 4.2 })
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
      max_budget: 600, // high budget
    })
    // Quote at exactly max_budget should get price_score ≈ 0.5
    const quote = addQuote({
      load_id: load.load_id,
      quoted_price: 600,
      status: 'sent',
      associated_fleet_id: fleetId,
      fleet_quoter_name: 'Fleet1',
      requested_vehicle_type: 'rigid_18t',
      offered_vehicle_type: 'rigid_18t',
      adr_certified: false,
      eta_to_collection: 60,
      distance_km: 163.5,
    })
    const result = scoreAndEvaluate(quote.quote_id)
    expect(result).not.toBeNull()
    expect(result!.breakdown.price_score).toBeCloseTo(0.5, 1)
  })
})
