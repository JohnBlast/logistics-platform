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

  switch (s.op) {
    case '=':
      return String(val) === String(s.value)
    case '!=':
      return String(val) !== String(s.value)
    case 'contains':
      return String(val).toLowerCase().includes(String(s.value).toLowerCase())
    case 'in':
      return Array.isArray(s.value) && s.value.some((v) => String(val) === String(v))
    default:
      return false
  }
}

/**
 * Mock NL interpretation: parse simple patterns like "exclude status = cancelled"
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
  return null
}
