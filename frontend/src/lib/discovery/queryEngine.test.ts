import { describe, it, expect } from 'vitest'
import { execute, applyFilters } from './queryEngine'
import type { TableInstruction } from './types'

const FLAT = [
  { quote_id: 'q1', load_id: 'l1', associated_fleet_id: 'f1', status: 'accepted', quoted_price: 100, load_poster_name: 'A' },
  { quote_id: 'q2', load_id: 'l2', associated_fleet_id: 'f1', status: 'rejected', quoted_price: 200, load_poster_name: 'B' },
  { quote_id: 'q3', load_id: 'l1', associated_fleet_id: 'f2', status: 'accepted', quoted_price: 150, load_poster_name: 'A' },
]

describe('queryEngine', () => {
  it('derives quotes for tenant', () => {
    const inst: TableInstruction = {
      dataSource: 'quotes',
      columns: [{ id: 'count', header: 'Count' }],
      aggregations: [{ field: 'quote_id', op: 'count', alias: 'count' }],
    }
    const r = execute(inst, FLAT)
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0]).toEqual({ count: 2 }) // f1 has q1, q2
  })

  it('applies eq filter', () => {
    const inst: TableInstruction = {
      dataSource: 'quotes',
      columns: [{ id: 'count', header: 'Count' }],
      filters: [{ field: 'status', operator: 'eq', value: 'accepted' }],
      aggregations: [{ field: 'quote_id', op: 'count', alias: 'count' }],
    }
    const r = execute(inst, FLAT)
    expect(r.rows[0]).toEqual({ count: 1 }) // f1 has 1 accepted
  })

  it('groups and aggregates', () => {
    const inst: TableInstruction = {
      dataSource: 'quotes',
      groupBy: ['load_poster_name'],
      columns: [
        { id: 'load_poster_name', header: 'Poster' },
        { id: 'total', header: 'Total' },
      ],
      aggregations: [
        { field: 'quote_id', op: 'count', alias: 'total' },
        { field: 'quoted_price', op: 'sum', alias: 'sumPrice' },
      ],
    }
    const r = execute(inst, FLAT)
    expect(r.rows.length).toBeGreaterThan(0)
  })

  it('applies limit', () => {
    const inst: TableInstruction = {
      dataSource: 'quotes',
      columns: [{ id: 'quote_id', header: 'ID' }],
      sort: [{ field: 'quoted_price', dir: 'desc' }],
      limit: 1,
    }
    const r = execute(inst, FLAT)
    expect(r.rows).toHaveLength(1)
  })

  it('pctChange first row is —', () => {
    const inst: TableInstruction = {
      dataSource: 'quotes',
      groupBy: ['load_poster_name'],
      groupByFormats: {},
      columns: [
        { id: 'load_poster_name', header: 'Poster' },
        { id: 'sumPrice', header: 'Sum' },
        { id: 'chg', header: 'Change' },
      ],
      aggregations: [{ field: 'quoted_price', op: 'sum', alias: 'sumPrice' }],
      sort: [{ field: 'load_poster_name', dir: 'asc' }],
      pctChange: { field: 'sumPrice', alias: 'chg' },
    }
    const r = execute(inst, FLAT)
    expect(r.rows[0]?.chg).toBe('—')
  })

  it('applyFilters works for client-side filtering', () => {
    const rows = [
      { a: 1, b: 'x' },
      { a: 2, b: 'y' },
      { a: 3, b: 'x' },
    ] as Record<string, unknown>[]
    const filtered = applyFilters(rows, [
      { field: 'b', operator: 'include', value: ['x'] },
    ])
    expect(filtered).toHaveLength(2)
    expect(filtered.every((r) => r.b === 'x')).toBe(true)
  })

  it('contains operator does partial string match (name search)', () => {
    const rows = [
      { name: 'Ahmed Smith', load_id: '1' },
      { name: 'John Jones', load_id: '2' },
      { name: 'Ahmad Khan', load_id: '3' },
    ] as Record<string, unknown>[]
    const filtered = applyFilters(rows, [
      { field: 'name', operator: 'contains', value: 'Ahmed' },
    ])
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('Ahmed Smith')
  })

  it('contains operator is case-insensitive', () => {
    const rows = [
      { name: 'Ahmed Smith', load_id: '1' },
      { name: 'John Jones', load_id: '2' },
    ] as Record<string, unknown>[]
    const filtered = applyFilters(rows, [
      { field: 'name', operator: 'contains', value: 'ahmed' },
    ])
    expect(filtered).toHaveLength(1)
  })
})
