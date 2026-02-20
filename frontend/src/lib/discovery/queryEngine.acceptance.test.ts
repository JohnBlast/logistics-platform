/**
 * Acceptance tests for Data Discovery query engine.
 * These tests verify that the query engine produces correct output for common natural-language query patterns.
 * Each test uses a TableInstruction that matches what the Chat API would return for the corresponding prompt.
 */

import { describe, it, expect } from 'vitest'
import { execute } from './queryEngine'
import type { TableInstruction } from './types'

/** Rich sample flat data with driver, route, date, and vehicle info (loads_and_quotes shape) */
const SAMPLE_FLAT = [
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
  {
    load_id: 'l4',
    quote_id: 'q4',
    associated_fleet_id: 'f1',
    quote_status: 'accepted',
    quoted_price: 600,
    collection_town: 'Derby',
    collection_city: 'Manchester',
    delivery_town: 'Oxford',
    delivery_city: 'London',
    collection_date: '2025-01-17',
    driver_name: 'Alice Smith',
    vehicle_type: 'large_van',
  },
  {
    load_id: 'l5',
    quote_id: 'q5',
    associated_fleet_id: 'f1',
    quote_status: 'rejected',
    quoted_price: 500,
    collection_town: 'Cambridge',
    collection_city: 'Birmingham',
    delivery_town: 'Ipswich',
    delivery_city: 'London',
    collection_date: '2025-01-18',
    driver_name: 'Charlie Brown',
    vehicle_type: 'small_van',
  },
] as Record<string, unknown>[]

describe('Discovery query engine – acceptance', () => {
  it('1. Which drivers are the most active', () => {
    const inst: TableInstruction = {
      dataSource: 'loads_and_quotes',
      columns: [
        { id: 'driver_name', header: 'Driver' },
        { id: 'jobCount', header: 'Jobs' },
      ],
      groupBy: ['driver_name'],
      aggregations: [{ field: 'load_id', op: 'count', alias: 'jobCount' }],
      sort: [{ field: 'jobCount', dir: 'desc' }],
      limit: 5,
    }
    const r = execute(inst, SAMPLE_FLAT)
    expect(r.rows.length).toBeGreaterThan(0)
    expect(r.rows[0]).toHaveProperty('driver_name')
    expect(r.rows[0]).toHaveProperty('jobCount')
    expect(r.rows[0]!.jobCount).toBeGreaterThan(0)
    expect(r.rows[0]!.driver_name).toBe('Alice Smith')
    expect((r.rows[0]!.jobCount as number)).toBeGreaterThanOrEqual((r.rows[1]?.jobCount as number) ?? 0)
  })

  it('2. Which routes are the most profitable', () => {
    const inst: TableInstruction = {
      dataSource: 'loads_and_quotes',
      columns: [
        { id: 'collection_town', header: 'From' },
        { id: 'delivery_town', header: 'To' },
        { id: 'totalRevenue', header: 'Revenue' },
      ],
      groupBy: ['collection_town', 'delivery_town'],
      aggregations: [{ field: 'quoted_price', op: 'sum', alias: 'totalRevenue' }],
      sort: [{ field: 'totalRevenue', dir: 'desc' }],
      limit: 5,
    }
    const r = execute(inst, SAMPLE_FLAT)
    expect(r.rows.length).toBeGreaterThan(0)
    expect(r.rows[0]).toHaveProperty('collection_town')
    expect(r.rows[0]).toHaveProperty('delivery_town')
    expect(r.rows[0]).toHaveProperty('totalRevenue')
    expect((r.rows[0]!.totalRevenue as number)).toBeGreaterThan(0)
  })

  it('3. Can I see all jobs from this city', () => {
    const inst: TableInstruction = {
      dataSource: 'loads_and_quotes',
      columns: [
        { id: 'load_id', header: 'Load' },
        { id: 'collection_city', header: 'From City' },
        { id: 'delivery_city', header: 'To City' },
      ],
      filters: [{ field: 'collection_city', operator: 'eq', value: 'London' }],
    }
    const r = execute(inst, SAMPLE_FLAT)
    expect(r.rows.length).toBeGreaterThan(0)
    expect(r.rows.every((row) => row.collection_city === 'London')).toBe(true)
  })

  it('4. Find me all jobs starting from this date', () => {
    const inst: TableInstruction = {
      dataSource: 'loads_and_quotes',
      columns: [
        { id: 'load_id', header: 'Load' },
        { id: 'collection_date', header: 'Start Date' },
      ],
      filters: [{ field: 'collection_date', operator: 'gte', value: '2025-01-15' }],
    }
    const r = execute(inst, SAMPLE_FLAT)
    expect(r.rows.length).toBeGreaterThan(0)
    expect(r.rows.every((row) => (row.collection_date as string) >= '2025-01-15')).toBe(true)
  })

  it('5. Show me all jobs by this driver', () => {
    const inst: TableInstruction = {
      dataSource: 'loads_and_quotes',
      columns: [
        { id: 'load_id', header: 'Load' },
        { id: 'driver_name', header: 'Driver' },
        { id: 'collection_town', header: 'From' },
        { id: 'delivery_town', header: 'To' },
      ],
      filters: [{ field: 'driver_name', operator: 'eq', value: 'Alice Smith' }],
    }
    const r = execute(inst, SAMPLE_FLAT)
    expect(r.rows.length).toBe(3)
    expect(r.rows.every((row) => row.driver_name === 'Alice Smith')).toBe(true)
  })

  it('6. Top 5 profitable routes (regression)', () => {
    const inst: TableInstruction = {
      dataSource: 'loads_and_quotes',
      groupBy: ['collection_town', 'delivery_town'],
      aggregations: [{ field: 'quoted_price', op: 'sum', alias: 'totalRevenue' }],
      sort: [{ field: 'totalRevenue', dir: 'desc' }],
      limit: 5,
      columns: [],
    }
    const r = execute(inst, SAMPLE_FLAT)
    expect(r.rows.length).toBeGreaterThan(0)
    expect(r.rows[0]).toHaveProperty('collection_town')
    expect(r.rows[0]).toHaveProperty('delivery_town')
    expect(r.rows[0]).toHaveProperty('totalRevenue')
  })

  it('7. How many jobs between London and Birmingham (orFilters)', () => {
    const inst: TableInstruction = {
      dataSource: 'loads_and_quotes',
      columns: [{ id: 'count', header: 'Count' }],
      orFilters: [
        [
          { field: 'collection_city', operator: 'eq', value: 'London' },
          { field: 'delivery_city', operator: 'eq', value: 'Birmingham' },
        ],
        [
          { field: 'collection_city', operator: 'eq', value: 'Birmingham' },
          { field: 'delivery_city', operator: 'eq', value: 'London' },
        ],
      ],
      aggregations: [{ field: 'load_id', op: 'count', alias: 'count' }],
    }
    const r = execute(inst, SAMPLE_FLAT)
    expect(r.rows.length).toBe(1)
    expect(r.rows[0]!.count).toBe(3)
  })

  it('8. Show me all loads that are small vans', () => {
    const inst: TableInstruction = {
      dataSource: 'loads_and_quotes',
      columns: [
        { id: 'load_id', header: 'Load' },
        { id: 'vehicle_type', header: 'Vehicle' },
      ],
      filters: [{ field: 'vehicle_type', operator: 'eq', value: 'small_van' }],
    }
    const r = execute(inst, SAMPLE_FLAT)
    expect(r.rows.length).toBeGreaterThan(0)
    expect(r.rows.every((row) => row.vehicle_type === 'small_van')).toBe(true)
  })

  it('9. Handles raw column names (Collection Town, Quoted Amount)', () => {
    const rawFlat = [
      {
        'Load Number': 'l1',
        'Fleet ID': 'f1',
        Status: 'accepted',
        'Collection Town': 'Reading',
        'Delivery Town': 'Slough',
        'Quoted Amount': 1500,
      },
    ] as Record<string, unknown>[]
    const inst: TableInstruction = {
      dataSource: 'loads_and_quotes',
      groupBy: ['collection_town', 'delivery_town'],
      aggregations: [{ field: 'quoted_price', op: 'sum', alias: 'totalRevenue' }],
      columns: [],
    }
    const r = execute(inst, rawFlat)
    expect(r.rows.length).toBe(1)
    expect(r.rows[0]).toHaveProperty('totalRevenue')
    expect(r.rows[0]!.totalRevenue).toBe(1500)
  })
})
