import { describe, it, expect, beforeEach } from 'vitest'
import { recommendPrice } from './recommenderService.js'
import {
  addLoad,
  addQuote,
  getDefaultFleetId,
  resetForTesting,
} from './jobmarketStore.js'

const RATE_PER_KM: Record<string, number> = {
  small_van: 0.8,
  medium_van: 1.0,
  large_van: 1.2,
  luton: 1.4,
  rigid_7_5t: 1.6,
  rigid_18t: 2.0,
  rigid_26t: 2.4,
  articulated: 3.0,
}

function expectedMid(
  distanceKm: number,
  vehicleType: string,
  adrRequired: boolean,
  competingQuotes: number,
  fleetRating: number
): number {
  const rate = RATE_PER_KM[vehicleType] ?? 2.0
  const base = distanceKm * rate
  const adrMult = adrRequired ? 1.15 : 1.0
  const compFactor = Math.max(0.7, 1.0 - competingQuotes * 0.05)
  const ratingFactor = 0.95 + (fleetRating / 5.0) * 0.1
  return base * adrMult * compFactor * ratingFactor
}

describe('recommenderService', () => {
  beforeEach(() => {
    resetForTesting()
  })

  it('EVAL-01: formula correctness across 20 test loads', () => {
    const vehicleTypes = ['small_van', 'medium_van', 'large_van', 'rigid_18t', 'articulated']
    const distances = [50, 100, 200, 300, 500]
    const adrFlags = [false, true]
    const ratings = [2.0, 3.0, 4.0, 5.0]
    const competingCounts = [0, 1, 2, 3, 5]

    let count = 0
    for (const vt of vehicleTypes) {
      for (const dist of distances) {
        if (count >= 20) break
        const load = addLoad({
          collection_city: 'London',
          delivery_city: 'Birmingham',
          distance_km: dist,
          status: 'posted',
          load_poster_name: 'Test',
          adr_required: count % 2 === 0,
          required_vehicle_type: vt as any,
        })
        const competing = competingCounts[count % 5]
        for (let i = 0; i < competing; i++) {
          addQuote({
            load_id: load.load_id,
            quoted_price: 100,
            status: 'sent',
            associated_fleet_id: getDefaultFleetId(),
            fleet_quoter_name: 'T',
            requested_vehicle_type: vt as any,
          })
        }
        const rating = ratings[count % 4]
        const rec = recommendPrice(load.load_id, vt as any, rating)
        expect(rec).not.toBeNull()
        const expected = expectedMid(dist, vt, count % 2 === 0, competing, rating)
        expect(rec!.mid).toBeCloseTo(expected, 1)
        expect(rec!.min).toBeCloseTo(rec!.mid * 0.85, 1)
        expect(rec!.max).toBeCloseTo(rec!.mid * 1.15, 1)
        expect(rec!.min).toBeGreaterThan(0)
        expect(rec!.max).toBeGreaterThan(0)
        count++
      }
      if (count >= 20) break
    }
    expect(count).toBe(20)
  })

  it('EVAL-03: competition factor monotonic decrease, clamped at 0.70', () => {
    const load = addLoad({
      collection_city: 'Leeds',
      delivery_city: 'Southampton',
      distance_km: 370.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
    })

    const mids: number[] = []
    for (let n = 0; n <= 10; n++) {
      if (n > 0) {
        addQuote({
          load_id: load.load_id,
          quoted_price: 100 + n,
          status: 'sent',
          associated_fleet_id: getDefaultFleetId(),
          fleet_quoter_name: 'T',
          requested_vehicle_type: 'rigid_18t',
        })
      }
      const rec = recommendPrice(load.load_id, 'rigid_18t', 4.2)
      expect(rec).not.toBeNull()
      mids.push(rec!.mid)
    }

    for (let i = 1; i < mids.length; i++) {
      expect(mids[i]).toBeLessThanOrEqual(mids[i - 1])
    }
    expect(mids[6]).toBeCloseTo(mids[10], 0)
  })

  it('computes price range for load', () => {
    const load = addLoad({
      collection_city: 'Leeds',
      delivery_city: 'Southampton',
      distance_km: 370.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
    })
    const rec = recommendPrice(load.load_id, 'rigid_18t', 4.2)
    expect(rec).not.toBeNull()
    expect(rec!.min).toBeLessThan(rec!.mid)
    expect(rec!.mid).toBeLessThan(rec!.max)
    expect(rec!.min).toBeCloseTo(rec!.mid * 0.85, 1)
    expect(rec!.max).toBeCloseTo(rec!.mid * 1.15, 1)
    expect(rec!.mid).toBeGreaterThan(700)
    expect(rec!.mid).toBeLessThan(850)
  })

  it('REC-EC-01: default rating 3.0 for new fleet', () => {
    resetForTesting()
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 163.5,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
    })
    const rec = recommendPrice(load.load_id)
    expect(rec).not.toBeNull()
    expect(rec!.signals.fleet_rating).toBe(3.0)
    const expected = 163.5 * 2.0 * 1.0 * 1.0 * (0.95 + (3.0 / 5.0) * 0.1)
    expect(rec!.mid).toBeCloseTo(expected, 1)
  })

  it('REC-EC-02: 6+ quotes, competition factor clamped at 0.70', () => {
    const load = addLoad({
      collection_city: 'Birmingham',
      delivery_city: 'London',
      distance_km: 200,
      status: 'posted',
      load_poster_name: 'Test',
      adr_required: false,
      required_vehicle_type: 'rigid_18t',
    })
    for (let i = 0; i < 6; i++) {
      addQuote({
        load_id: load.load_id,
        quoted_price: 100,
        status: 'sent',
        associated_fleet_id: getDefaultFleetId(),
        fleet_quoter_name: 'T',
        requested_vehicle_type: 'rigid_18t',
      })
    }
    const rec6 = recommendPrice(load.load_id, 'rigid_18t', 3.0)
    addQuote({
      load_id: load.load_id,
      quoted_price: 100,
      status: 'sent',
      associated_fleet_id: getDefaultFleetId(),
      fleet_quoter_name: 'T',
      requested_vehicle_type: 'rigid_18t',
    })
    const rec7 = recommendPrice(load.load_id, 'rigid_18t', 3.0)
    expect(rec6!.mid).toBeCloseTo(rec7!.mid, 1)
  })
})
