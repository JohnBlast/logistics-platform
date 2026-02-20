import { describe, it, expect } from 'vitest'
import { getTenantId, deriveQuotes, deriveLoads, deriveLoadsAndQuotes } from './deriveViews'

const FLAT = [
  { quote_id: 'q1', load_id: 'l1', associated_fleet_id: 'f1', status: 'accepted', quoted_price: 100 },
  { quote_id: 'q2', load_id: 'l2', associated_fleet_id: 'f1', status: 'rejected', quoted_price: 200 },
  { quote_id: 'q3', load_id: 'l1', associated_fleet_id: 'f2', status: 'accepted', quoted_price: 150 },
  { quote_id: 'q4', load_id: 'l3', associated_fleet_id: 'f1', status: 'accepted', quoted_price: 80 },
]

describe('deriveViews', () => {
  it('getTenantId returns first distinct associated_fleet_id', () => {
    expect(getTenantId(FLAT)).toBe('f1')
    expect(getTenantId([])).toBe(null)
  })

  it('deriveQuotes filters by tenant', () => {
    const q = deriveQuotes(FLAT, 'f1')
    expect(q).toHaveLength(3)
    expect(q.every((r) => r.associated_fleet_id === 'f1')).toBe(true)
  })

  it('deriveQuotes returns all rows when tenant is null (demo/single-tenant)', () => {
    expect(deriveQuotes(FLAT, null)).toHaveLength(4)
  })

  it('deriveLoads returns awarded loads only (accepted quotes, tenant match)', () => {
    const loads = deriveLoads(FLAT, 'f1')
    expect(loads.length).toBeGreaterThanOrEqual(1)
    expect(loads.every((r) => r.associated_fleet_id === 'f1')).toBe(true)
    expect(loads.every((r) => (r.quote_status ?? r.status) === 'accepted')).toBe(true)
  })

  it('deriveLoadsAndQuotes filters by accepted quote and tenant', () => {
    const lq = deriveLoadsAndQuotes(FLAT, 'f1')
    expect(lq.length).toBeGreaterThanOrEqual(1)
    expect(lq.every((r) => (r.quote_status ?? r.status) === 'accepted')).toBe(true)
  })
})
