import type { TableInstruction, TableFilter } from './types'
import { formatMonthName, formatPercent, formatCurrency } from './formatters'
import { deriveQuotes, deriveLoads, deriveLoadsAndQuotes, getTenantId } from './deriveViews'

const MAX_ROWS = 2000

/** Parse numeric value, handling European comma-decimal format (e.g. '781,68' → 781.68). */
function parseNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (v == null) return NaN
  const s = String(v).trim()
  // If contains exactly one comma and no period, treat comma as decimal separator
  if (/^\d[\d\s]*,\d+$/.test(s)) return Number(s.replace(/\s/g, '').replace(',', '.'))
  // If contains comma as thousands sep (e.g. '1,234.56'), remove commas
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, ''))
  return Number(s)
}

/** Resolve field value from row; tries common aliases when flat has raw column names. */
function getRowValue(row: Record<string, unknown>, field: string): unknown {
  if (row[field] !== undefined && row[field] !== null) return row[field]
  const aliases: Record<string, string[]> = {
    quoted_price: ['Quoted Amount', 'Quoted price', 'price'],
    collection_town: ['Collection Town', 'collection town'],
    delivery_town: ['Delivery Town', 'delivery town'],
    collection_city: ['Collection City', 'collection city'],
    delivery_city: ['Delivery City', 'delivery city'],
    vehicle_type: ['Type', 'Vehicle Type', 'vehicle type'],
    requested_vehicle_type: ['Vehicle Type', 'Type', 'requested_vehicle_type'],
    driver_name: ['Driver Name', 'driver name', 'name'],
    load_poster_name: ['Poster Name', 'poster name', 'load_poster_name'],
    collection_date: ['Collection Date', 'collection date', 'Collection Time'],
    load_status: ['status', 'Status', 'load_status'],
    quote_status: ['quote_status', 'Quote Status'],
  }
  for (const a of aliases[field] ?? []) {
    if (row[a] !== undefined && row[a] !== null) return row[a]
  }
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '_').replace(/_+/g, '_')
  const fieldNorm = norm(field)
  for (const k of Object.keys(row)) {
    if (norm(k) === fieldNorm) return row[k]
  }
  return row[field]
}

export interface QueryResult {
  rows: Record<string, unknown>[]
  validationRows: Record<string, unknown>[]
  truncated: boolean
  totalRows: number
}

/** Defense-in-depth: ETL transformation pre-cleans locations to canonical UK names; keep case variants for external data. */
const LOCATION_ALIASES: Record<string, string[]> = {
  london: ['london', 'London', 'LONDON'],
  birmingham: ['birmingham', 'Birmingham', 'BIRMINGHAM'],
  manchester: ['manchester', 'Manchester', 'MANCHESTER'],
  leeds: ['leeds', 'Leeds'],
  glasgow: ['glasgow', 'Glasgow'],
  liverpool: ['liverpool', 'Liverpool'],
  edinburgh: ['edinburgh', 'Edinburgh'],
  cardiff: ['cardiff', 'Cardiff'],
  newcastle: ['newcastle', 'Newcastle'],
  sheffield: ['sheffield', 'Sheffield'],
  bristol: ['bristol', 'Bristol'],
  nottingham: ['nottingham', 'Nottingham'],
  southampton: ['southampton', 'Southampton'],
  brighton: ['brighton', 'Brighton'],
  coventry: ['coventry', 'Coventry'],
  hull: ['hull', 'Hull'],
  bradford: ['bradford', 'Bradford'],
  stoke: ['stoke', 'Stoke'],
}

function compareNumericOrDate(
  v: unknown,
  x: unknown,
  cmp: (a: number, b: number) => boolean
): boolean {
  const vn = parseNum(v)
  const xn = parseNum(x)
  if (!Number.isNaN(vn) && !Number.isNaN(xn)) return cmp(vn, xn)
  const vs = String(v ?? '').trim().slice(0, 10)
  const xs = String(x ?? '').trim().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(vs) && /^\d{4}-\d{2}-\d{2}$/.test(xs)) return cmp(vs.localeCompare(xs), 0)
  return cmp(vn, xn)
}

function matchesValue(v: unknown, x: unknown): boolean {
  if (v == null) return false
  const vn = parseNum(v)
  const xn = parseNum(x)
  if (!Number.isNaN(vn) && !Number.isNaN(xn) && vn === xn) return true
  const vs = String(v).trim().toLowerCase()
  const xs = String(x).trim().toLowerCase()
  if (vs === xs) return true
  // Check location aliases for both values
  for (const [, aliases] of Object.entries(LOCATION_ALIASES)) {
    const aLower = aliases.map((a) => a.trim().toLowerCase())
    if (aLower.includes(vs) && aLower.includes(xs)) return true
  }
  // Also check if the canonical key matches
  const xAliases = LOCATION_ALIASES[xs]
  if (xAliases?.some((a) => a.trim().toLowerCase() === vs)) return true
  const vAliases = LOCATION_ALIASES[vs]
  if (vAliases?.some((a) => a.trim().toLowerCase() === xs)) return true
  return false
}

function applyFilter(rows: Record<string, unknown>[], filter: TableFilter): Record<string, unknown>[] {
  const { field, operator, value, topBottomN } = filter
  return rows.filter((row) => {
    const v = getRowValue(row, field)
    switch (operator) {
      case 'include':
        return Array.isArray(value) && value.some((x) => matchesValue(v, x))
      case 'exclude':
        return !(Array.isArray(value) && value.some((x) => v != null && matchesValue(v, x)))
      case 'eq':
        return v != null && matchesValue(v, value)
      case 'ne':
        return v == null || !matchesValue(v, value)
      case 'contains':
        if (v == null) return false
        return String(v).toLowerCase().includes(String(value ?? '').toLowerCase())
      case 'lt':
        return compareNumericOrDate(v, value, (a, b) => a < b)
      case 'lte':
        return compareNumericOrDate(v, value, (a, b) => a <= b)
      case 'gt':
        return compareNumericOrDate(v, value, (a, b) => a > b)
      case 'gte':
        return compareNumericOrDate(v, value, (a, b) => a >= b)
      case 'between':
        if (!Array.isArray(value) || value.length < 2) return false
        const [lo, hi] = value as number[]
        const n = parseNum(v)
        return n >= parseNum(lo) && n <= parseNum(hi)
      default:
        return true
    }
  })
}

/** Apply TableFilters to rows (exported for client-side filtering) */
export function applyFilters(rows: Record<string, unknown>[], filters: TableFilter[]): Record<string, unknown>[] {
  let result = rows
  for (const f of filters) {
    if (f.operator === 'top' && typeof f.topBottomN === 'number') {
      const sorted = [...result].sort((a, b) => {
        const va = parseNum(getRowValue(a, f.field))
        const vb = parseNum(getRowValue(b, f.field))
        return (vb || 0) - (va || 0)
      })
      result = sorted.slice(0, f.topBottomN)
    } else if (f.operator === 'bottom' && typeof f.topBottomN === 'number') {
      const sorted = [...result].sort((a, b) => {
        const va = parseNum(getRowValue(a, f.field))
        const vb = parseNum(getRowValue(b, f.field))
        return (va || 0) - (vb || 0)
      })
      result = sorted.slice(0, f.topBottomN)
    } else {
      result = applyFilter(result, f)
    }
  }
  return result
}

function truncateDate(val: unknown, format: 'day' | 'week' | 'month' | 'year'): string {
  const s = String(val ?? '')
  if (!s || s.length < 10) return s
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  if (format === 'year') return String(y ?? s)
  if (format === 'month') return `${y}-${String(m).padStart(2, '0')}`
  if (format === 'day') return s.slice(0, 10)
  if (format === 'week') {
    if (!y || !m || !d) return s
    const date = new Date(y, (m ?? 1) - 1, d ?? 1)
    const start = new Date(date)
    start.setDate(date.getDate() - date.getDay() + 1)
    const wy = start.getFullYear()
    const w = Math.ceil((start.getDate() + new Date(wy, start.getMonth(), 0).getDate()) / 7)
    return `${wy}-W${String(w).padStart(2, '0')}`
  }
  return s
}

function aggregate(
  rows: Record<string, unknown>[],
  groupBy: string[],
  groupByFormats: Record<string, 'day' | 'week' | 'month' | 'year'> | undefined,
  aggregations: NonNullable<TableInstruction['aggregations']>
): Record<string, unknown>[] {
  if (aggregations.length === 0) return rows

  const groups = new Map<string, Record<string, unknown>[]>()
  for (const row of rows) {
    const keyParts = groupBy.length === 0 ? [''] : groupBy.map((f) => {
      const v = getRowValue(row, f)
      const fmt = groupByFormats?.[f]
      return fmt ? truncateDate(v, fmt) : String(v ?? '')
    })
    const key = keyParts.join('::')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  const result: Record<string, unknown>[] = []
  for (const [key, groupRows] of groups) {
    const out: Record<string, unknown> = {}
    if (groupBy.length > 0) {
      const parts = key.split('::')
      groupBy.forEach((f, i) => { out[f] = parts[i] || null })
    }
    for (const agg of aggregations) {
      const alias = agg.alias
      if (agg.op === 'count') {
        out[alias] = groupRows.length
      } else if (agg.op === 'count_match' && agg.field && agg.matchValue != null) {
        const count = groupRows.filter((r) => String(getRowValue(r, agg.field!) ?? '') === String(agg.matchValue)).length
        out[alias] = count
      } else if (agg.op === 'sum' && agg.field) {
        const sum = groupRows.reduce((s, r) => s + (parseNum(getRowValue(r, agg.field!)) || 0), 0)
        out[alias] = Math.round(sum * 100) / 100
      } else if (agg.op === 'avg' && agg.field) {
        const sum = groupRows.reduce((s, r) => s + (parseNum(getRowValue(r, agg.field!)) || 0), 0)
        out[alias] = groupRows.length ? Math.round((sum / groupRows.length) * 100) / 100 : 0
      } else if (agg.op === 'mode' && agg.field) {
        const counts = new Map<string, number>()
        for (const r of groupRows) {
          const v = String(getRowValue(r, agg.field!) ?? '')
          counts.set(v, (counts.get(v) ?? 0) + 1)
        }
        let max = 0
        let modeVal = ''
        for (const [k, c] of counts) {
          if (c > max) { max = c; modeVal = k }
        }
        out[alias] = modeVal || null
      } else if (agg.op === 'win_rate' && agg.field && agg.matchValue != null) {
        const match = groupRows.filter((r) => String(getRowValue(r, agg.field!) ?? '') === String(agg.matchValue)).length
        out[alias] = groupRows.length ? (match / groupRows.length) * 100 : 0
      } else if (agg.op === 'ratio' && agg.fieldA && agg.fieldB) {
        const sumA = groupRows.reduce((s, r) => s + (parseNum(getRowValue(r, agg.fieldA!)) || 0), 0)
        const sumB = groupRows.reduce((s, r) => s + (parseNum(getRowValue(r, agg.fieldB!)) || 0), 0)
        out[alias] = sumB !== 0 ? sumA / sumB : 0
      }
    }
    result.push(out)
  }
  return result
}

function formatCell(val: unknown, format?: string): string {
  if (val == null) return ''
  if (format === 'month_name') return formatMonthName(String(val))
  if (format === 'percent') return formatPercent(Number(val))
  if (format === 'currency') return formatCurrency(Number(val))
  return String(val)
}

/** Resolve logical field to actual key from row; handles raw column names. */
function resolveFieldKey(row: Record<string, unknown>, logical: string): string | null {
  if (row[logical] !== undefined && row[logical] !== null) return logical
  const aliases: Record<string, string[]> = {
    associated_fleet_id: ['Fleet ID', 'fleet_id', 'fleetid'],
    quote_status: ['Quote Status', 'quote status'],
    load_id: ['Load Number', 'Load Reference', 'load_number'],
    quoted_price: ['Quoted Amount', 'Quoted price', 'price'],
  }
  for (const a of aliases[logical] ?? []) {
    if (row[a] !== undefined && row[a] !== null) return a
  }
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '_').replace(/_+/g, '_')
  const logicalNorm = norm(logical)
  for (const k of Object.keys(row)) {
    if (norm(k) === logicalNorm) return k
  }
  return null
}

/** Fallback: when deriveLoadsAndQuotes is empty, use flatRows with flexible status/tenant detection. */
function fallbackLoadsAndQuotes(flatRows: Record<string, unknown>[]): Record<string, unknown>[] {
  if (flatRows.length === 0) return []
  const first = flatRows[0] as Record<string, unknown>
  const statusKey = resolveFieldKey(first, 'quote_status') ?? resolveFieldKey(first, 'status') ?? 'status'
  const loadIdKey = resolveFieldKey(first, 'load_id') ?? 'load_id'
  const seen = new Set<string>()
  const result: Record<string, unknown>[] = []
  for (const row of flatRows) {
    const qStatus = row[statusKey] ?? row.status
    if (String(qStatus).toLowerCase() !== 'accepted') continue
    const loadId = row[loadIdKey] ?? row.load_id
    if (loadId == null) continue
    const key = String(loadId)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(row)
  }
  return result
}

export function execute(
  instruction: TableInstruction,
  flatRows: Record<string, unknown>[]
): QueryResult {
  const tenantId = getTenantId(flatRows)

  let baseRows: Record<string, unknown>[]
  switch (instruction.dataSource) {
    case 'quotes':
      baseRows = deriveQuotes(flatRows, tenantId)
      break
    case 'loads':
      baseRows = deriveLoads(flatRows, tenantId)
      break
    case 'loads_and_quotes': {
      baseRows = deriveLoadsAndQuotes(flatRows, tenantId)
      if (baseRows.length === 0 && flatRows.length > 0) baseRows = fallbackLoadsAndQuotes(flatRows)
      break
    }
    default:
      baseRows = []
  }

  console.log('[Discovery] baseRows:', baseRows.length, 'from', flatRows.length, 'flat rows (tenant:', tenantId?.slice(0, 8) + '...)')

  let filtered: Record<string, unknown>[]
  if (instruction.orFilters?.length) {
    const seen = new Set<string>()
    filtered = []
    for (const group of instruction.orFilters) {
      let groupRows = baseRows
      for (const f of group) {
        groupRows = applyFilter(groupRows, f)
      }
      for (const r of groupRows) {
        const key = JSON.stringify(r)
        if (!seen.has(key)) {
          seen.add(key)
          filtered.push(r)
        }
      }
    }
  } else if (instruction.filters?.length) {
    filtered = applyFilters(baseRows, instruction.filters)
  } else {
    filtered = baseRows
  }

  console.log('[Discovery] filtered:', filtered.length, '→ aggregation:', instruction.aggregations?.length ?? 0)

  const validationRows = filtered

  if (instruction.aggregations?.length) {
    filtered = aggregate(
      filtered,
      instruction.groupBy ?? [],
      instruction.groupByFormats,
      instruction.aggregations
    )
  }

  console.log('[Discovery] result rows:', filtered.length)

  if (instruction.sort?.length) {
    filtered = [...filtered].sort((a, b) => {
      for (const s of instruction.sort!) {
        const va = a[s.field]
        const vb = b[s.field]
        const na = parseNum(va)
        const nb = parseNum(vb)
        const cmp = (!Number.isNaN(na) && !Number.isNaN(nb))
          ? (na < nb ? -1 : na > nb ? 1 : 0)
          : (va < vb ? -1 : va > vb ? 1 : 0)
        if (cmp !== 0) return s.dir === 'asc' ? cmp : -cmp
      }
      return 0
    })
  }

  if (instruction.limit != null) {
    filtered = filtered.slice(0, instruction.limit)
  }

  const totalRows = filtered.length
  let truncated = false
  if (filtered.length > MAX_ROWS) {
    filtered = filtered.slice(0, MAX_ROWS)
    truncated = true
  }

  if (instruction.pctChange && instruction.aggregations?.length) {
    const { field: aggAlias, alias: changeAlias } = instruction.pctChange
    for (let i = 0; i < filtered.length; i++) {
      const row = filtered[i] as Record<string, unknown>
      if (i === 0) {
        row[changeAlias] = '—'
      } else {
        const prev = filtered[i - 1] as Record<string, unknown>
        const curr = parseNum(row[aggAlias] ?? 0)
        const prevVal = parseNum(prev[aggAlias] ?? 0)
        row[changeAlias] = prevVal ? ((curr - prevVal) / prevVal) * 100 : '—'
      }
    }
  }

  return {
    rows: filtered,
    validationRows,
    truncated: truncated || filtered.length < totalRows,
    totalRows,
  }
}

export function formatRow(row: Record<string, unknown>, columns: { id: string; format?: string }[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const col of columns) {
    out[col.id] = formatCell(row[col.id], col.format)
  }
  return out
}
