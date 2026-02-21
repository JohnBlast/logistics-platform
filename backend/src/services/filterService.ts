import type { FilterRule } from './profileStore.js'

/** Validate filter rules against flat table columns. Returns invalid field names (GR-5.4). */
export function validateFilterFields(
  flatColumns: string[],
  filters: FilterRule[]
): string[] {
  const cols = new Set(flatColumns)
  const invalid: string[] = []
  for (const f of filters || []) {
    const s = f.structured as { field?: string; op?: string } | undefined
    if (s?.op === 'has_any_null' || s?.op === 'has_no_nulls') continue
    if (s?.field && s.field !== '*' && !cols.has(s.field)) {
      invalid.push(s.field)
    }
  }
  return [...new Set(invalid)]
}

export interface StructuredFilter {
  field?: string
  op: '=' | '!=' | 'contains' | 'in' | 'is_null' | 'is_not_null' | 'has_any_null' | 'has_no_nulls' | '<' | '<=' | '>' | '>='
  value?: unknown
  type?: 'inclusion' | 'exclusion'
  /** When set, inclusion rules with the same orGroup are OR'd (row matches if ANY matches). Used for "London loads" = place in any location field. */
  orGroup?: number
}

/**
 * Apply filter rules to flat table. Order: inclusion first, then exclusion (C-11).
 * Inclusion rules with orGroup are OR'd within the group (place-in-any-location pattern).
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
    const { andRules, orGroups } = groupInclusionsByOrGroup(inclusions)
    result = result.filter((row) => {
      if (!andRules.every((rule) => matchesRule(row, rule))) return false
      for (const group of orGroups) {
        if (!group.some((rule) => matchesRule(row, rule))) return false
      }
      return true
    })
  }

  if (exclusions.length > 0) {
    result = result.filter((row) =>
      !exclusions.some((rule) => matchesRule(row, rule))
    )
  }

  return result
}

function groupInclusionsByOrGroup(inclusions: FilterRule[]): { andRules: FilterRule[]; orGroups: FilterRule[][] } {
  const andRules: FilterRule[] = []
  const orGroupsMap = new Map<number, FilterRule[]>()
  for (const r of inclusions) {
    const s = r.structured as StructuredFilter | undefined
    const g = s?.orGroup
    if (g != null && typeof g === 'number') {
      const arr = orGroupsMap.get(g) ?? []
      arr.push(r)
      orGroupsMap.set(g, arr)
    } else {
      andRules.push(r)
    }
  }
  const orGroups = [...orGroupsMap.values()]
  return { andRules, orGroups }
}

export interface RuleEffect {
  ruleIndex: number
  rule: string
  type: 'inclusion' | 'exclusion'
  before: number
  after: number
  excluded: number
}

export function applyFiltersWithRuleEffects(
  rows: Record<string, unknown>[],
  filters: FilterRule[]
): { result: Record<string, unknown>[]; ruleEffects: RuleEffect[] } {
  if (!filters?.length) return { result: rows, ruleEffects: [] }
  const effects: RuleEffect[] = []
  let current = rows

  const inclusions = filters.filter((f) => (f.type ?? 'exclusion') === 'inclusion')
  const exclusions = filters.filter((f) => (f.type ?? 'exclusion') === 'exclusion')
  const { andRules, orGroups } = groupInclusionsByOrGroup(inclusions)

  // Build inclusion steps: each AND rule, then each OR group
  const inclusionSteps: { rules: FilterRule[]; isOr: boolean; ruleLabel: string }[] = []
  for (const r of andRules) {
    inclusionSteps.push({ rules: [r], isOr: false, ruleLabel: r.rule })
  }
  for (const group of orGroups) {
    const first = group[0]
    const labels = group.map((r) => (r.structured as { field?: string } | undefined)?.field ?? '').filter(Boolean)
    inclusionSteps.push({ rules: group, isOr: true, ruleLabel: labels.length ? `${labels[0]} contains ... (or ${labels.join(', ')})` : first.rule })
  }

  let incStepIdx = 0
  for (const step of inclusionSteps) {
    const before = current.length
    if (step.isOr) {
      current = current.filter((row) => step.rules.some((r) => matchesRule(row, r)))
    } else {
      current = current.filter((row) => step.rules.every((r) => matchesRule(row, r)))
    }
    const effect = {
      ruleIndex: incStepIdx < andRules.length ? filters.indexOf(andRules[incStepIdx]) : filters.indexOf(step.rules[0]),
      rule: step.ruleLabel,
      type: 'inclusion' as const,
      before,
      after: current.length,
      excluded: before - current.length,
    }
    if (step.isOr && step.rules.length > 1) {
      for (const r of step.rules) effects.push({ ...effect, ruleIndex: filters.indexOf(r) })
    } else {
      effects.push(effect)
    }
    incStepIdx++
  }

  // Apply all inclusions first (already done above), then exclusions
  for (let i = 0; i < exclusions.length; i++) {
    const rule = exclusions[i]
    const before = current.length
    current = current.filter((row) => !matchesRule(row, rule))
    effects.push({
      ruleIndex: filters.indexOf(rule),
      rule: rule.rule,
      type: 'exclusion',
      before,
      after: current.length,
      excluded: before - current.length,
    })
  }

  return { result: current, ruleEffects: effects }
}

function isEmpty(val: unknown): boolean {
  return val == null || val === '' || (typeof val === 'string' && val.trim() === '')
}

function parseNumber(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  const s = String(v ?? '').replace(/,/g, '').trim()
  const n = parseFloat(s)
  return Number.isNaN(n) ? null : n
}

function hasAnyNull(row: Record<string, unknown>): boolean {
  return Object.values(row).some((v) => isEmpty(v))
}

function matchesRule(row: Record<string, unknown>, rule: FilterRule): boolean {
  const s = rule.structured as StructuredFilter | undefined
  if (!s?.op) return false

  if (s.op === 'has_any_null') {
    return hasAnyNull(row)
  }
  if (s.op === 'has_no_nulls') {
    return !hasAnyNull(row)
  }

  if (!s?.field) return false
  const val = row[s.field]

  switch (s.op) {
    case 'is_null':
      return isEmpty(val)
    case 'is_not_null':
      return !isEmpty(val)
    default:
      break
  }

  if (val == null) return false
  const valStr = String(val)
  const filterStr = String(s.value ?? '')

  switch (s.op) {
    case '<':
    case '<=':
    case '>':
    case '>=': {
      const numVal = parseNumber(val)
      const numFilter = typeof s.value === 'number' ? s.value : parseNumber(filterStr)
      if (numVal == null || numFilter == null) return false
      switch (s.op) {
        case '<': return numVal < numFilter
        case '<=': return numVal <= numFilter
        case '>': return numVal > numFilter
        case '>=': return numVal >= numFilter
        default: return false
      }
    }
    case '=':
      const isVehicleField = s.field === 'vehicle_type' || s.field === 'requested_vehicle_type'
      if (isVehicleField) {
        const norm = (x: string) => x.toLowerCase().replace(/\s+/g, '_').replace(/s$/, '')
        return norm(valStr) === norm(filterStr)
      }
      return valStr.toLowerCase() === filterStr.toLowerCase()
    case '!=':
      return valStr.toLowerCase() !== filterStr.toLowerCase()
    case 'contains':
      return valStr.toLowerCase().includes(filterStr.toLowerCase())
    case 'in': {
      if (!Array.isArray(s.value)) return false
      const isVehicleField = s.field === 'vehicle_type' || s.field === 'requested_vehicle_type'
      const norm = (x: string) => x.toLowerCase().replace(/\s+/g, '_').replace(/s$/, '')
      return s.value.some((v) => {
        const vStr = String(v)
        if (isVehicleField) return norm(valStr) === norm(vStr)
        return valStr.toLowerCase() === vStr.toLowerCase()
      })
    }
    default:
      return false
  }
}

/** Map natural-language field references to flat table column names */
const FIELD_ALIASES: Record<string, string> = {
  capacity_kg: 'capacity_kg',
  'capacity kg': 'capacity_kg',
  capacity: 'capacity_kg',
  quoted_price: 'quoted_price',
  'quoted price': 'quoted_price',
  price: 'quoted_price',
  distance_km: 'distance_km',
  'distance km': 'distance_km',
  distance: 'distance_km',
  'collection city': 'collection_city',
  collection_city: 'collection_city',
  'collection town': 'collection_town',
  'collection time': 'collection_time',
  collection_time: 'collection_time',
  'collection date': 'collection_date',
  collection_date: 'collection_date',
  'delivery city': 'delivery_city',
  'delivery town': 'delivery_town',
  'delivery time': 'delivery_time',
  'delivery date': 'delivery_date',
  'number of items': 'number_of_items',
  number_of_items: 'number_of_items',
  items: 'number_of_items',
  email: 'email',
  phone: 'phone',
  'phone numbers': 'phone',
  'phone number': 'phone',
  'registration number': 'registration_number',
  registration: 'registration_number',
  'driver name': 'name',
  'load poster name': 'load_poster_name',
  status: 'status',
  'vehicle type': 'vehicle_type',
  'requested vehicle type': 'requested_vehicle_type',
}

function resolveField(userPhrase: string): string | null {
  const normalized = userPhrase.trim().toLowerCase().replace(/\s+/g, ' ')
  if (FIELD_ALIASES[normalized]) return FIELD_ALIASES[normalized]
  const withUnderscores = normalized.replace(/\s+/g, '_')
  if (FIELD_ALIASES[withUnderscores]) return FIELD_ALIASES[withUnderscores]
  const entries = Object.entries(FIELD_ALIASES).sort((a, b) => b[0].length - a[0].length)
  for (const [alias, field] of entries) {
    const aliasNorm = alias.replace(/_/g, ' ')
    if (normalized.includes(aliasNorm) || normalized.includes(alias)) return field
  }
  return null
}

const NUMERIC_FIELDS = ['capacity_kg', 'quoted_price', 'distance_km', 'number_of_items']
const UNIT_TO_FIELD: Record<string, string> = { kg: 'capacity_kg', km: 'distance_km', '£': 'quoted_price', gbp: 'quoted_price' }

export interface InterpretedRule {
  structured: StructuredFilter
  label: string
}

const LOCATION_FIELDS = ['collection_town', 'collection_city', 'delivery_town', 'delivery_city']

/**
 * Interpret natural language into one or more filter rules. Handles compound conditions
 * e.g. "loads with capacity_kg and with more than 1000kg" -> [is_not_null, > 1000]
 */
export function interpretFilterRules(nl: string): InterpretedRule[] {
  const compound = tryCompoundWithAnd(nl)
  if (compound.length >= 2) return compound

  const compound2 = tryCompoundPatterns(nl)
  if (compound2.length >= 2) return compound2

  const multiStatus = tryExcludeMultipleStatus(nl)
  if (multiStatus.length >= 1) return multiStatus

  const placeLoads = tryRemovePlaceLoads(nl)
  if (placeLoads.length >= 1) return placeLoads

  const includePlaceLoads = tryIncludePlaceLoads(nl)
  if (includePlaceLoads.length >= 1) return includePlaceLoads

  const single = interpretFilterRule(nl)
  if (single) return [{ structured: single, label: nl }]

  return []
}

const STATUS_VALUES = ['cancelled', 'rejected', 'completed', 'pending', 'draft', 'posted', 'in_transit', 'accepted']
const VEHICLE_TYPE_NAMES = ['small_van', 'medium_van', 'large_van', 'luton', 'rigid_7_5t', 'rigid_18t', 'rigid_26t', 'articulated',
  'small van', 'medium van', 'large van', 'rigid']

function isNonPlaceValue(val: string): boolean {
  if (STATUS_VALUES.includes(val)) return true
  if (val.split(/\s+and\s+/i).every((w) => STATUS_VALUES.includes(w.trim()))) return true
  const norm = val.replace(/\s+/g, '_').replace(/s$/, '')
  return VEHICLE_TYPE_NAMES.some((vt) => norm === vt || val === vt || val === vt.replace(/_/g, ' '))
}

/** "remove London loads" / "exclude Manchester loads" -> exclude rows with place in ANY location field */
function tryRemovePlaceLoads(nl: string): InterpretedRule[] {
  const t = nl.toLowerCase().trim().replace(/\.$/, '')
  const m = t.match(/^(?:remove|exclude|drop)\s+([a-z0-9_\s]+?)\s+loads?\s*$/i)
  if (!m) return []
  const place = m[1].trim()
  if (!place || place.length < 2) return []
  if (isNonPlaceValue(place)) return []
  return LOCATION_FIELDS.map((field) => ({
    structured: { field, op: 'contains' as const, value: place, type: 'exclusion' as const },
    label: `exclude ${field} contains ${place}`,
  }))
}

/** "I only want London loads" / "include London loads" / "show London loads" -> INCLUDE rows with place in ANY location field (OR) */
function tryIncludePlaceLoads(nl: string): InterpretedRule[] {
  const t = nl.toLowerCase().trim().replace(/\.$/, '')
  const m = t.match(/^(?:i\s+)?(?:only\s+)?(?:want|include|show|keep)\s+(?:only\s+)?(?:the\s+)?([a-z0-9_\s]+?)\s+loads?\s*$/i)
  if (!m) return []
  const place = m[1].trim()
  if (!place || place.length < 2) return []
  if (isNonPlaceValue(place)) return []
  return LOCATION_FIELDS.map((field) => ({
    structured: { field, op: 'contains' as const, value: place, type: 'inclusion' as const, orGroup: 1 },
    label: `${field} contains ${place}`,
  }))
}

/** "exclude cancelled and rejected" -> multiple exclusion rules (status = X for each) */
function tryExcludeMultipleStatus(nl: string): InterpretedRule[] {
  const t = nl.toLowerCase().trim()
  const m = t.match(/^(?:remove|exclude|drop)\s+(?:all\s+)?(?:loads?|rows?|quotes?)?\s*(?:with\s+)?(?:status\s+)?(.+?)(?:\s+loads?|\s+rows?|\s*)$/i)
  if (!m) return []
  const statuses = STATUS_VALUES
  const words = m[1].split(/\s+(?:and|or|,)\s+/i).map((w) => w.trim().toLowerCase()).filter(Boolean)
  const matched = words.filter((w) => statuses.includes(w))
  if (matched.length < 2) return []
  return matched.map((val) => ({
    structured: { field: 'status', op: '=' as const, value: val, type: 'exclusion' as const },
    label: `exclude status = ${val}`,
  }))
}

function tryCompoundPatterns(nl: string): InterpretedRule[] {
  const t = nl.toLowerCase().trim()
  const rules: InterpretedRule[] = []

  if (!/(?:want|see|show|include|keep)/i.test(t) || /(?:remove|exclude|drop)/.test(t)) return []

  const andParts = t.split(/\s+and\s+/i)
  if (andParts.length < 2) return []

  let inferredField: string | null = null
  for (const part of andParts) {
    const p = part.trim()
    const fieldMatch = p.match(/with\s+(?:a\s+)?([a-z0-9_\s]+?)(?:\s+and|\s*$)/i) || p.match(/have\s+([a-z0-9_\s]+?)(?:\s+and|\s*$)/i)
    if (fieldMatch) {
      const field = resolveField(fieldMatch[1])
      if (field && NUMERIC_FIELDS.includes(field)) inferredField = field
    }
  }

  for (const part of andParts) {
    const p = part.trim()
    const rawPhrase = p.replace(/with\s+(?:a\s+)?/i, '').split(/\s+(?:more|less|greater|over|under|above|below)\s+than/i)[0]?.trim() || ''
    const field = resolveField(rawPhrase) || inferredField

    if (field && NUMERIC_FIELDS.includes(field)) {
      if (/with\s+(?:a\s+)?[a-z0-9_\s]+$/i.test(p) || /have\s+[a-z0-9_\s]+$/i.test(p)) {
        rules.push({ structured: { field, op: 'is_not_null', type: 'inclusion' }, label: `${field} present` })
      } else {
        const moreMatch = p.match(/(?:more|greater)\s+than\s+([0-9,.]+)\s*(kg|km|£|gbp)?/i)
        const lessMatch = p.match(/(?:less|under)\s+than\s+([0-9,.]+)\s*(kg|km|£|gbp)?/i)
        const overMatch = p.match(/(?:over|above)\s+([0-9,.]+)\s*(kg|km|£|gbp)?/i)
        const underMatch = p.match(/(?:under|below)\s+([0-9,.]+)\s*(kg|km|£|gbp)?/i)
        const f = moreMatch || overMatch || lessMatch || underMatch
        if (f) {
          const num = parseFloat(f[1].replace(/,/g, ''))
          const unitField = f[2] ? UNIT_TO_FIELD[f[2].toLowerCase()] : null
          const ruleField = unitField || field
          const op = (moreMatch || overMatch) ? '>' : '<'
          if (!Number.isNaN(num))
            rules.push({ structured: { field: ruleField, op, value: num, type: 'inclusion' }, label: `${ruleField} ${op} ${num}` })
        }
      }
    }
  }

  const deduped = rules.filter((r, i) => {
    const key = `${(r.structured as StructuredFilter).field}:${(r.structured as StructuredFilter).op}:${(r.structured as StructuredFilter).value}`
    return rules.findIndex((x) => `${(x.structured as StructuredFilter).field}:${(x.structured as StructuredFilter).op}:${(x.structured as StructuredFilter).value}` === key) === i
  })
  return deduped.length >= 2 ? deduped : []
}

function tryCompoundWithAnd(nl: string): InterpretedRule[] {
  const t = nl.toLowerCase().trim()
  const numFields = ['capacity_kg', 'quoted_price', 'distance_km', 'number_of_items']

  const m = t.match(/(?:want|see|show|include)\s+(?:only\s+)?(?:loads?|rows?)\s+with\s+([a-z0-9_\s]+?)\s+and\s+(?:with\s+)?(?:more\s+than|greater\s+than|over|above)\s+([0-9,.]+)\s*(kg|km)?/i)
  if (m) {
    const field = resolveField(m[1].trim())
    const numVal = parseFloat(m[2].replace(/,/g, ''))
    const unitField = m[3] ? (m[3].toLowerCase() === 'kg' ? 'capacity_kg' : 'distance_km') : field
    const ruleField = (unitField || field) as string
    if (field && numFields.includes(ruleField) && !Number.isNaN(numVal)) {
      return [
        { structured: { field: ruleField, op: 'is_not_null', type: 'inclusion' }, label: `${ruleField} present` },
        { structured: { field: ruleField, op: '>', value: numVal, type: 'inclusion' }, label: `${ruleField} > ${numVal}` },
      ]
    }
  }

  const m2 = t.match(/(?:want|see|show|include)\s+(?:only\s+)?(?:loads?|rows?)\s+with\s+([a-z0-9_\s]+?)\s+and\s+(?:with\s+)?(?:less\s+than|under|below)\s+([0-9,.]+)\s*(kg|km)?/i)
  if (m2) {
    const field = resolveField(m2[1].trim())
    const numVal = parseFloat(m2[2].replace(/,/g, ''))
    const unitField = m2[3] ? (m2[3].toLowerCase() === 'kg' ? 'capacity_kg' : 'distance_km') : field
    const ruleField = (unitField || field) as string
    if (field && numFields.includes(ruleField) && !Number.isNaN(numVal)) {
      return [
        { structured: { field: ruleField, op: 'is_not_null', type: 'inclusion' }, label: `${ruleField} present` },
        { structured: { field: ruleField, op: '<', value: numVal, type: 'inclusion' }, label: `${ruleField} < ${numVal}` },
      ]
    }
  }

  // "with X and (at least|at most|no more than) N"
  const m3 = t.match(/(?:want|see|show|include)\s+(?:only\s+)?(?:loads?|rows?)\s+with\s+([a-z0-9_\s]+?)\s+and\s+(?:at\s+least|minimum|min)\s+([0-9,.]+)\s*(kg|km)?/i)
  if (m3) {
    const field = resolveField(m3[1].trim())
    const numVal = parseFloat(m3[2].replace(/,/g, ''))
    const unitField = m3[3] ? (m3[3].toLowerCase() === 'kg' ? 'capacity_kg' : 'distance_km') : field
    const ruleField = (unitField || field) as string
    if (field && numFields.includes(ruleField) && !Number.isNaN(numVal)) {
      return [
        { structured: { field: ruleField, op: 'is_not_null', type: 'inclusion' }, label: `${ruleField} present` },
        { structured: { field: ruleField, op: '>=', value: numVal, type: 'inclusion' }, label: `${ruleField} >= ${numVal}` },
      ]
    }
  }

  const m4 = t.match(/(?:want|see|show|include)\s+(?:only\s+)?(?:loads?|rows?)\s+with\s+([a-z0-9_\s]+?)\s+and\s+(?:at\s+most|no\s+more\s+than|maximum|max)\s+([0-9,.]+)\s*(kg|km)?/i)
  if (m4) {
    const field = resolveField(m4[1].trim())
    const numVal = parseFloat(m4[2].replace(/,/g, ''))
    const unitField = m4[3] ? (m4[3].toLowerCase() === 'kg' ? 'capacity_kg' : 'distance_km') : field
    const ruleField = (unitField || field) as string
    if (field && numFields.includes(ruleField) && !Number.isNaN(numVal)) {
      return [
        { structured: { field: ruleField, op: 'is_not_null', type: 'inclusion' }, label: `${ruleField} present` },
        { structured: { field: ruleField, op: '<=', value: numVal, type: 'inclusion' }, label: `${ruleField} <= ${numVal}` },
      ]
    }
  }

  // "between N and M on capacity_kg" or "capacity_kg between 100 and 500"
  const betweenMatch = t.match(/(?:between|from)\s+([0-9,.]+)\s+and\s+([0-9,.]+)\s+(?:on|for|in)\s+([a-z0-9_\s]+)/i)
    ?? t.match(/([a-z0-9_]+)\s+between\s+([0-9,.]+)\s+and\s+([0-9,.]+)/i)
  if (betweenMatch) {
    const firstGroupIsNum = /^[0-9,.]/.test(String(betweenMatch[1]))
    const lo = parseFloat(betweenMatch[firstGroupIsNum ? 1 : 2].replace(/,/g, ''))
    const hi = parseFloat(betweenMatch[firstGroupIsNum ? 2 : 3].replace(/,/g, ''))
    const fieldPhrase = betweenMatch[firstGroupIsNum ? 3 : 1].trim()
    const field = resolveField(fieldPhrase)
    if (field && numFields.includes(field) && !Number.isNaN(lo) && !Number.isNaN(hi) && lo <= hi) {
      return [
        { structured: { field, op: '>=', value: lo, type: 'inclusion' }, label: `${field} >= ${lo}` },
        { structured: { field, op: '<=', value: hi, type: 'inclusion' }, label: `${field} <= ${hi}` },
      ]
    }
  }

  return []
}

/**
 * Mock NL interpretation: parse simple patterns when Claude is unavailable.
 * Supports: "exclude status = cancelled", "remove cancelled loads", "remove loads that don't have capacity_kg"
 */
export function interpretFilterRule(nl: string): StructuredFilter | null {
  const t = nl.toLowerCase().trim()
  const excludeMatch = t.match(/^exclude\s+(\w+)\s*=\s*(.+)$/)
  const includeMatch = t.match(/^include\s+(\w+)\s*=\s*(.+)$/)
  const excludeNeMatch = t.match(/^exclude\s+(\w+)\s*!=\s*(.+)$/)

  if (excludeMatch) {
    return { field: excludeMatch[1].trim(), op: '=', value: excludeMatch[2].trim().replace(/^["']|["']$/g, ''), type: 'exclusion' as const }
  }
  if (includeMatch) {
    return { field: includeMatch[1].trim(), op: '=', value: includeMatch[2].trim().replace(/^["']|["']$/g, ''), type: 'inclusion' as const }
  }
  if (excludeNeMatch) {
    return { field: excludeNeMatch[1].trim(), op: '!=', value: excludeNeMatch[2].trim().replace(/^["']|["']$/g, ''), type: 'exclusion' as const }
  }

  // "remove/exclude/drop X" -> exclude status = X (or similar)
  const removeMatch = t.match(/(?:remove|exclude|drop)\s+(?:all\s+)?(?:loads?|quotes?)?\s*(?:with\s+)?(?:status\s+)?([\w_]+)/)
  if (removeMatch) {
    const val = removeMatch[1].toLowerCase().replace(/\s+/g, '_')
    if (STATUS_VALUES.includes(val)) {
      return { field: 'status', op: '=', value: val, type: 'exclusion' as const }
    }
  }

  // "exclude/remove ... from Leeds" -> collection_city contains Leeds (EXCLUDE those rows)
  const fromMatch = t.match(/(?:remove|exclude|drop)\s+.+\s+from\s+([a-z0-9\s]+)/i)
  if (fromMatch) {
    const city = fromMatch[1].trim()
    if (city) return { field: 'collection_city', op: 'contains', value: city, type: 'exclusion' as const }
  }

  // "include/keep loads from London" -> INCLUDE rows where collection_city contains place
  const includeFromMatch = t.match(/(?:include|keep|show)\s+.+\s+from\s+([a-z0-9\s]+)/i)
  if (includeFromMatch && !/(?:remove|exclude|drop)/.test(t)) {
    const city = includeFromMatch[1].trim()
    if (city) return { field: 'collection_city', op: 'contains', value: city, type: 'inclusion' as const }
  }

  // "exclude London collection_town" / "exclude collection_town London" -> EXCLUDE rows where field contains value
  const excludePlaceFieldMatch = t.match(/(?:remove|exclude|drop)\s+(?:all\s+)?(?:loads?|rows?)?\s*([a-z0-9_\s]+)\s+(collection_town|collection_city|delivery_town|delivery_city)\s*$/i)
  const excludeFieldPlaceMatch = t.match(/(?:remove|exclude|drop)\s+(?:all\s+)?(?:loads?|rows?)?\s*(collection_town|collection_city|delivery_town|delivery_city)\s+([a-z0-9_\s]+)/i)
  if (excludePlaceFieldMatch) {
    const place = excludePlaceFieldMatch[1].trim()
    const field = excludePlaceFieldMatch[2].trim()
    if (place && LOCATION_FIELDS.includes(field)) return { field, op: 'contains', value: place, type: 'exclusion' as const }
  }
  if (excludeFieldPlaceMatch) {
    const field = excludeFieldPlaceMatch[1].trim()
    const place = excludeFieldPlaceMatch[2].trim()
    if (place && LOCATION_FIELDS.includes(field)) return { field, op: 'contains', value: place, type: 'exclusion' as const }
  }

  // "remove loads that don't/doesn't have X" or "remove loads without X" -> exclude rows where X is null
  // CRITICAL: field-specific is_null, NOT has_any_null. Must come before has_any_null patterns.
  const dontHaveMatch = t.match(/(?:remove|exclude|drop)\s+(?:all\s+)?(?:loads?|quotes?|rows?)\s+(?:that\s+)?(?:don't|doesn't|do\s+not|does\s+not)\s+have\s+([a-z0-9_\s]+)/i)
  if (dontHaveMatch) {
    const field = resolveField(dontHaveMatch[1])
    if (field) return { field, op: 'is_null', type: 'exclusion' as const }
  }
  const withoutMatch = t.match(/(?:remove|exclude|drop)\s+(?:all\s+)?(?:loads?|quotes?|rows?)\s+without\s+([a-z0-9_\s]+)/i)
  if (withoutMatch) {
    const field = resolveField(withoutMatch[1])
    if (field) return { field, op: 'is_null', type: 'exclusion' as const }
  }
  const missingMatch = t.match(/(?:remove|exclude|drop)\s+(?:all\s+)?(?:loads?|quotes?|rows?)\s+(?:where|with)\s+([a-z0-9_\s]+)\s+is\s+(?:missing|null|blank|empty)/i)
  if (missingMatch) {
    const field = resolveField(missingMatch[1])
    if (field) return { field, op: 'is_null', type: 'exclusion' as const }
  }

  // "include/keep loads that have X" or "include loads with X" or "only see loads with a collection time" -> include rows where X is not null
  const haveMatch = t.match(/(?:include|keep)\s+(?:only\s+)?(?:loads?|quotes?|rows?)\s+(?:that\s+)?(?:have|with)\s+([a-z0-9_\s]+)/i)
  if (haveMatch && !/(?:remove|exclude|drop)/.test(t)) {
    const field = resolveField(haveMatch[1])
    if (field) return { field, op: 'is_not_null', type: 'inclusion' as const }
  }
  const wantSeeMatch = t.match(/(?:want|like)\s+to\s+(?:only\s+)?(?:see|show)\s+(?:loads?|quotes?|rows?)\s+with\s+(?:a\s+)?([a-z0-9_\s]+)/i)
  if (wantSeeMatch && !/(?:remove|exclude|drop)/.test(t)) {
    const field = resolveField(wantSeeMatch[1])
    if (field) return { field, op: 'is_not_null', type: 'inclusion' as const }
  }

  // Numerical comparisons: "less than 500 on capacity_kg", "rows with less than 500 on capacity_kg", "capacity_kg under 500"
  const numFields = ['capacity_kg', 'quoted_price', 'distance_km', 'number_of_items']
  const ltMatch = t.match(/(?:less\s+than|under|below)\s+([0-9,.]+)\s+(?:on|for|in)\s+([a-z0-9_\s]+)/i)
  if (ltMatch) {
    const field = resolveField(ltMatch[2])
    if (field && numFields.includes(field)) {
      const v = parseFloat(ltMatch[1].replace(/,/g, ''))
      if (!Number.isNaN(v)) return { field, op: '<', value: v, type: 'inclusion' as const }
    }
  }
  const ltMatch2 = t.match(/(?:only\s+)?(?:want|see|show)\s+.*?(?:with|where)\s+(?:less\s+than|under|below)\s+([0-9,.]+)\s+(?:on|for|in)\s+([a-z0-9_\s]+)/i)
  if (ltMatch2) {
    const field = resolveField(ltMatch2[2])
    if (field && numFields.includes(field)) {
      const v = parseFloat(ltMatch2[1].replace(/,/g, ''))
      if (!Number.isNaN(v)) return { field, op: '<', value: v, type: 'inclusion' as const }
    }
  }
  const ltMatch3 = t.match(/([a-z0-9_]+)\s+(?:less\s+than|under|below)\s+([0-9,.]+)/i)
  if (ltMatch3) {
    const field = resolveField(ltMatch3[1])
    if (field && numFields.includes(field)) {
      const v = parseFloat(ltMatch3[2].replace(/,/g, ''))
      if (!Number.isNaN(v)) return { field, op: '<', value: v, type: 'inclusion' as const }
    }
  }
  const gtMatch = t.match(/(?:greater\s+than|over|above|more\s+than)\s+([0-9,.]+)\s+(?:on|for|in)\s+([a-z0-9_\s]+)/i)
  if (gtMatch) {
    const field = resolveField(gtMatch[2])
    if (field && numFields.includes(field)) {
      const v = parseFloat(gtMatch[1].replace(/,/g, ''))
      if (!Number.isNaN(v)) return { field, op: '>', value: v, type: 'inclusion' as const }
    }
  }
  const gtMatch2 = t.match(/([a-z0-9_]+)\s+(?:greater\s+than|over|above|more\s+than)\s+([0-9,.]+)/i)
  if (gtMatch2) {
    const field = resolveField(gtMatch2[1])
    if (field && numFields.includes(field)) {
      const v = parseFloat(gtMatch2[2].replace(/,/g, ''))
      if (!Number.isNaN(v)) return { field, op: '>', value: v, type: 'inclusion' as const }
    }
  }
  const lteMatch = t.match(/(?:at\s+most|no\s+more\s+than|max)\s+([0-9,.]+)\s+(?:on|for|in)\s+([a-z0-9_\s]+)/i)
  if (lteMatch) {
    const field = resolveField(lteMatch[2])
    if (field && numFields.includes(field)) {
      const v = parseFloat(lteMatch[1].replace(/,/g, ''))
      if (!Number.isNaN(v)) return { field, op: '<=', value: v, type: 'inclusion' as const }
    }
  }
  const gteMatch = t.match(/(?:at\s+least|no\s+less\s+than|min)\s+([0-9,.]+)\s+(?:on|for|in)\s+([a-z0-9_\s]+)/i)
  if (gteMatch) {
    const field = resolveField(gteMatch[2])
    if (field && numFields.includes(field)) {
      const v = parseFloat(gteMatch[1].replace(/,/g, ''))
      if (!Number.isNaN(v)) return { field, op: '>=', value: v, type: 'inclusion' as const }
    }
  }
  const excludeLtMatch = t.match(/(?:remove|exclude|drop)\s+.*?(?:less\s+than|under|below)\s+([0-9,.]+)\s+(?:on|for|in)\s+([a-z0-9_\s]+)/i)
  if (excludeLtMatch) {
    const field = resolveField(excludeLtMatch[2])
    if (field && numFields.includes(field)) {
      const v = parseFloat(excludeLtMatch[1].replace(/,/g, ''))
      if (!Number.isNaN(v)) return { field, op: '<', value: v, type: 'exclusion' as const }
    }
  }
  const excludeGtMatch = t.match(/(?:remove|exclude|drop)\s+.*?(?:greater\s+than|over|above|more\s+than)\s+([0-9,.]+)\s+(?:on|for|in)\s+([a-z0-9_\s]+)/i)
  if (excludeGtMatch) {
    const field = resolveField(excludeGtMatch[2])
    if (field && numFields.includes(field)) {
      const v = parseFloat(excludeGtMatch[1].replace(/,/g, ''))
      if (!Number.isNaN(v)) return { field, op: '>', value: v, type: 'exclusion' as const }
    }
  }

  // "I only want to see Luton and large_van vehicle types" -> vehicle_type IN [luton, large_van]
  const vehicleTypes = ['small_van', 'medium_van', 'large_van', 'luton', 'rigid_7_5t', 'rigid_18t', 'rigid_26t', 'articulated']
  const extractVehicleTypes = (str: string): string[] => {
    const result: string[] = []
    const lower = str.toLowerCase()
    for (const vt of vehicleTypes) {
      const re = new RegExp(`\\b${vt.replace(/_/g, '[\\s_]')}\\b|\\b${vt.replace(/_/g, ' ')}\\b`, 'i')
      if (re.test(str)) result.push(vt)
    }
    if (/luton/i.test(str) && !result.includes('luton')) result.push('luton')
    if (/\blarge\s*[_]?\s*van\b/i.test(str) && !result.includes('large_van')) result.push('large_van')
    if (/\bsmall\s*[_]?\s*van\b/i.test(str) && !result.includes('small_van')) result.push('small_van')
    if (/\bmedium\s*[_]?\s*van\b/i.test(str) && !result.includes('medium_van')) result.push('medium_van')
    return [...new Set(result)]
  }
  if (/luton|large_van|large\s+van|small_van|small\s+van|medium_van|rigid|articulated/i.test(t) && /(?:only\s+)?(?:want|see|show|include)/i.test(t)) {
    const vts = extractVehicleTypes(t)
    if (vts.length > 0) return { field: 'requested_vehicle_type', op: 'in', value: vts, type: 'inclusion' as const }
  }

  // "include only X" -> include status = X
  const includeOnlyMatch = t.match(/include\s+only\s+(?:completed|pending|cancelled|rejected|draft|posted|in_transit|accepted)/)
  if (includeOnlyMatch) {
    const m = t.match(/(completed|pending|cancelled|rejected|draft|posted|in_transit|accepted)/)
    if (m) return { field: 'status', op: '=', value: m[1], type: 'inclusion' as const }
  }

  // "remove/exclude all loads that are small vans" -> exclude vehicle_type or requested_vehicle_type = small_van
  // Must check BEFORE has_any_null to avoid mis-parsing vehicle-type phrases
  const vehicleTypeMatch = t.match(/(?:remove|exclude|drop)\s+(?:all\s+)?(?:loads?|quotes?)\s+(?:that\s+are|with)\s+([a-z0-9_\s]+)/i)
  if (vehicleTypeMatch) {
    const raw = vehicleTypeMatch[1].trim().toLowerCase().replace(/\s+/g, '_').replace(/s$/, '') // "small vans" -> "small_van"
    const vehicleTypes = ['small_van', 'medium_van', 'large_van', 'luton', 'rigid_7_5t', 'rigid_18t', 'rigid_26t', 'articulated']
    const matched = vehicleTypes.find((v) => v === raw || v.replace(/_/g, ' ') === raw.replace(/_/g, ' '))
    if (matched) return { field: 'requested_vehicle_type', op: '=', value: matched, type: 'exclusion' as const }
    const pluralMatch = vehicleTypes.find((v) => raw === v + 's' || raw === v.replace(/_/g, ' ') + 's')
    if (pluralMatch) return { field: 'requested_vehicle_type', op: '=', value: pluralMatch, type: 'exclusion' as const }
  }

  // "remove/exclude any row with a null value" -> exclude rows that have ANY null/empty cell
  // Must explicitly mention null/blank/empty - do NOT match vehicle-type phrases
  if (/remove\s+any\s+row\s+with\s+a\s+null\s+value/i.test(t)) {
    return { field: '*', op: 'has_any_null', type: 'exclusion' as const }
  }
  if (/\b(?:remove|exclude|drop)\b.+?\b(?:any|all)\s*(?:row|record)s?\s*(?:with|that\s+have)\s+(?:a\s+)?(?:null|blank|empty)\s+(?:value|cell)s?/i.test(t)) {
    return { field: '*', op: 'has_any_null', type: 'exclusion' as const }
  }
  if (/\b(?:null|blank|empty)\s+(?:row|record)s?\b/i.test(t) && /\b(?:remove|exclude|drop)\b.+?\b(?:any|all)\b/i.test(t)) {
    return { field: '*', op: 'has_any_null', type: 'exclusion' as const }
  }

  // "remove/exclude blank or null status" -> exclude status where is_null
  if (/\b(?:remove|exclude|drop)\b.+?\b(?:blank|null|empty|missing)\b.+?\bstatus\b/i.test(t)) {
    return { field: 'status', op: 'is_null', type: 'exclusion' as const }
  }
  if (/\b(?:remove|exclude|drop)\b.+?\bstatus\b.+?\b(?:blank|null|empty|missing)\b/i.test(t)) {
    return { field: 'status', op: 'is_null', type: 'exclusion' as const }
  }

  // "only want loads with status" / "include only loads that have status" -> inclusion, is_not_null
  if (/\b(?:only|just)\b.+?\b(?:want|loads?|with)\b.+?\bstatus\b/i.test(t) && !/\b(?:remove|exclude|drop)\b/i.test(t)) {
    return { field: 'status', op: 'is_not_null', type: 'inclusion' as const }
  }
  if (/\b(?:include|keep)\b.+?\b(?:only\s+)?(?:loads?|rows?)?\s*(?:with|that\s+have)\s+status\b/i.test(t)) {
    return { field: 'status', op: 'is_not_null', type: 'inclusion' as const }
  }

  return null
}
