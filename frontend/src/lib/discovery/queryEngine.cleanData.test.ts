/**
 * Tests that Discovery query engine works correctly with clean data
 * (pre-cleaned by ETL transformation step).
 */

import { describe, it, expect } from 'vitest'
import { execute } from './queryEngine'
import type { TableInstruction } from './types'

/** Clean flat data - canonical locations, ISO dates, numeric values (as from ETL transformation) */
const CLEAN_FLAT = [
  {
    load_id: 'l1',
    quote_id: 'q1',
    associated_fleet_id: 'f1',
    quote_status: 'accepted',
    quoted_price: 1200,
    collection_town: 'Reading',
    collection_city: 'London',
    delivery_town: 'Slough',
    delivery_city: 'Birmingham',
    collection_date: '2025-01-15',
    driver_name: 'Alice Smith',
    vehicle_type: 'small_van',
  },
  {
    load_id: 'l2',
    quote_id: 'q2',
    associated_fleet_id: 'f1',
    quote_status: 'accepted',
    quoted_price: 800,
    collection_town: 'Luton',
    collection_city: 'London',
    delivery_town: 'Northampton',
    delivery_city: 'Birmingham',
    collection_date: '2025-01-16',
    driver_name: 'Bob Jones',
    vehicle_type: 'medium_van',
  },
  {
    load_id: 'l3',
    quote_id: 'q3',
    associated_fleet_id: 'f1',
    quote_status: 'accepted',
    quoted_price: 2000,
    collection_town: 'Reading',
    collection_city: 'London',
    delivery_town: 'Slough',
    delivery_city: 'Birmingham',
    collection_date: '2025-01-14',
    driver_name: 'Alice Smith',
    vehicle_type: 'small_van',
  },
]

describe('queryEngine with clean data', () => {
  it('location grouping produces exactly one group per canonical city', () => {
    const inst: TableInstruction = {
      dataSource: 'loads_and_quotes',
      groupBy: ['collection_city'],
      columns: [
        { id: 'collection_city', header: 'City' },
        { id: 'job_count', header: 'Jobs' },
      ],
      aggregations: [{ op: 'count', alias: 'job_count' }],
    }
    const r = execute(inst, CLEAN_FLAT)
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0]).toEqual({ collection_city: 'London', job_count: 3 })
  })

  it('numeric aggregation returns exact sum (no NaN from unit suffixes)', () => {
    const inst: TableInstruction = {
      dataSource: 'loads_and_quotes',
      columns: [{ id: 'total_revenue', header: 'Total' }],
      aggregations: [{ field: 'quoted_price', op: 'sum', alias: 'total_revenue' }],
    }
    const r = execute(inst, CLEAN_FLAT)
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0]?.total_revenue).toBe(4000)
  })

  it('numeric aggregation returns exact avg', () => {
    const inst: TableInstruction = {
      dataSource: 'loads_and_quotes',
      columns: [{ id: 'avg_price', header: 'Avg' }],
      aggregations: [{ field: 'quoted_price', op: 'avg', alias: 'avg_price' }],
    }
    const r = execute(inst, CLEAN_FLAT)
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0]?.avg_price).toBe(1333.33)
  })

  it('date filter gte works with ISO dates', () => {
    const inst: TableInstruction = {
      dataSource: 'loads_and_quotes',
      filters: [{ field: 'collection_date', operator: 'gte', value: '2025-01-15' }],
      columns: [{ id: 'load_id', header: 'Load' }],
    }
    const r = execute(inst, CLEAN_FLAT)
    expect(r.rows).toHaveLength(2)
  })

  it('location eq filter matches clean canonical value', () => {
    const inst: TableInstruction = {
      dataSource: 'loads_and_quotes',
      filters: [{ field: 'collection_city', operator: 'eq', value: 'Birmingham' }],
      columns: [{ id: 'load_id', header: 'Load' }],
    }
    const r = execute(inst, CLEAN_FLAT)
    expect(r.rows).toHaveLength(0)
  })

  it('location eq filter matches when collection is London', () => {
    const inst: TableInstruction = {
      dataSource: 'loads_and_quotes',
      filters: [{ field: 'collection_city', operator: 'eq', value: 'London' }],
      columns: [{ id: 'load_id', header: 'Load' }],
    }
    const r = execute(inst, CLEAN_FLAT)
    expect(r.rows).toHaveLength(3)
  })
})
