import { describe, it, expect } from 'vitest'
import { haversineDistance, estimateETA } from './haversine.js'

describe('haversine', () => {
  it('Birmingham to Leeds ≈ 148-160km', () => {
    const d = haversineDistance(52.486, -1.89, 53.801, -1.549)
    expect(d).toBeGreaterThan(140)
    expect(d).toBeLessThan(170)
  })

  it('London to Glasgow ≈ 555km', () => {
    const d = haversineDistance(51.507, -0.128, 55.864, -4.252)
    expect(d).toBeGreaterThan(540)
    expect(d).toBeLessThan(570)
  })

  it('ETA at 60 km/h: 160km → 160 min', () => {
    expect(estimateETA(160)).toBe(160)
  })
})
