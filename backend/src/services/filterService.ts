import type { FilterRule } from './profileStore.js'

/** Validate filter rules against flat table columns. Returns invalid field names (GR-5.4). */
export function validateFilterFields(
  flatColumns: string[],
  filters: FilterRule[]
): string[] {
  const cols = new Set(flatColumns)
  const invalid: string[] = []
  for (const f of filters || []) {
    const s = f.structured as { field?: string } | undefined
    if (s?.field && !cols.has(s.field)) {
      invalid.push(s.field)
    }
  }
  return [...new Set(invalid)]
}

export interface StructuredFilter {
  field: string
  op: '=' | '!=' | 'contains' | 'in'
  value: unknown
}

/**
 * Apply filter rules to flat table. Order: inclusion first, then exclusion (C-11).
 */
export function applyFilters(
  rows: Record<string, unknown>[],
  filters: FilterRule[]
): Record<string, unknown>[] {
  if (!filters?.length) return rows

  const inclusions = filters.filter((f) => f.type === 'inclusion')
  const exclusions = filters.filter((f) => f.type === 'exclusion')

  let result = rows

  if (inclusions.length > 0) {
    result = result.filter((row) =>
      inclusions.some((rule) => matchesRule(row, rule))
    )
  }

  if (exclusions.length > 0) {
    result = result.filter((row) =>
      !exclusions.some((rule) => matchesRule(row, rule))
    )
  }

  return result
}

function matchesRule(row: Record<string, unknown>, rule: FilterRule): boolean {
  const s = rule.structured as StructuredFilter | undefined
  if (!s?.field) return false
  const val = row[s.field]
  if (val === undefined) return false

  const valStr = String(val)
  const filterStr = String(s.value)

  switch (s.op) {
    case '=':
      return valStr.toLowerCase() === filterStr.toLowerCase()
    case '!=':
      return valStr.toLowerCase() !== filterStr.toLowerCase()
    case 'contains':
      return valStr.toLowerCase().includes(filterStr.toLowerCase())
    case 'in':
      return Array.isArray(s.value) && s.value.some((v) => valStr.toLowerCase() === String(v).toLowerCase())
    default:
      return false
  }
}

/**
 * Mock NL interpretation: parse simple patterns when Claude is unavailable.
 * Supports: "exclude status = cancelled", "remove cancelled loads", "exclude collection from Leeds"
 */
export function interpretFilterRule(nl: string): StructuredFilter | null {
  const t = nl.toLowerCase().trim()
  const excludeMatch = t.match(/^exclude\s+(\w+)\s*=\s*(.+)$/)
  const includeMatch = t.match(/^include\s+(\w+)\s*=\s*(.+)$/)
  const excludeNeMatch = t.match(/^exclude\s+(\w+)\s*!=\s*(.+)$/)

  if (excludeMatch) {
    return { field: excludeMatch[1].trim(), op: '=', value: excludeMatch[2].trim().replace(/^["']|["']$/g, '') }
  }
  if (includeMatch) {
    return { field: includeMatch[1].trim(), op: '=', value: includeMatch[2].trim().replace(/^["']|["']$/g, '') }
  }
  if (excludeNeMatch) {
    return { field: excludeNeMatch[1].trim(), op: '!=', value: excludeNeMatch[2].trim().replace(/^["']|["']$/g, '') }
  }

  // "remove/exclude/drop X" -> exclude status = X (or similar)
  const removeMatch = t.match(/(?:remove|exclude|drop)\s+(?:all\s+)?(?:loads?|quotes?)?\s*(?:with\s+)?(?:status\s+)?(\w+)/)
  if (removeMatch) {
    const val = removeMatch[1]
    if (['cancelled', 'rejected', 'completed', 'pending', 'draft'].includes(val)) {
      return { field: 'status', op: '=', value: val }
    }
  }

  // "exclude/remove ... from Leeds" -> collection_city contains Leeds
  const fromMatch = t.match(/(?:remove|exclude)\s+.+\s+from\s+([a-z0-9\s]+)/i)
  if (fromMatch) {
    const city = fromMatch[1].trim()
    if (city) return { field: 'collection_city', op: 'contains', value: city }
  }

  // "include only X" -> include status = X
  const includeOnlyMatch = t.match(/include\s+only\s+(?:completed|pending|cancelled|rejected|draft)/)
  if (includeOnlyMatch) {
    const m = t.match(/(completed|pending|cancelled|rejected|draft)/)
    if (m) return { field: 'status', op: '=', value: m[1] }
  }

  return null
}
