import { QUOTE_STATUS, LOAD_STATUS, VEHICLE_TYPES } from '../models/schema.js'
import type { EnumMappings } from './profileStore.js'

const ENTITY_ENUM_FIELDS: Record<string, Record<string, readonly string[]>> = {
  quote: { status: QUOTE_STATUS, requested_vehicle_type: VEHICLE_TYPES },
  load: { status: LOAD_STATUS },
  driver_vehicle: { vehicle_type: VEHICLE_TYPES },
}

/**
 * Apply enum mappings to mapped rows. Transforms source values to target enum values.
 * Runs after applyMappings, before dedup/joins.
 */
export function applyEnumMappings(
  rows: Record<string, unknown>[],
  objectType: string,
  enumMappings: EnumMappings | undefined
): Record<string, unknown>[] {
  const entityMaps = enumMappings?.[objectType]
  if (!entityMaps) return rows

  const validByField = ENTITY_ENUM_FIELDS[objectType]
  if (!validByField) return rows

  return rows.map((row) => {
    const out = { ...row }
    for (const [field, validValues] of Object.entries(validByField)) {
      const val = row[field]
      if (val == null || val === '') continue
      const str = String(val)
      const fieldMap = entityMaps[field] as Record<string, string> | undefined
      if (fieldMap?.[str] !== undefined) {
        out[field] = fieldMap[str]
      } else if (validValues.includes(str.trim().toLowerCase() as never)) {
        out[field] = str.trim().toLowerCase()
      } else {
        const fuzzy = fuzzyMatchEnum(str, [...validValues])
        out[field] = fuzzy // null only if truly unmatchable
      }
    }
    return out
  })
}

export function getEnumFieldsForEntity(objectType: string): { field: string; validValues: string[] }[] {
  const fields = ENTITY_ENUM_FIELDS[objectType]
  if (!fields) return []
  return Object.entries(fields).map(([field, vals]) => ({
    field,
    validValues: [...vals],
  }))
}

/** Normalize for matching: lowercase, spaces/underscores interchangeable */
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, '_').replace(/_+/g, '_')
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
  return dp[m][n]
}

/** Fuzzy match a dirty value to the closest valid enum using normalize, partial, and edit distance. */
function fuzzyMatchEnum(dirty: string, validValues: string[]): string | null {
  const n = normalize(dirty)
  for (const v of validValues) {
    if (normalize(v) === n) return v
  }
  for (const v of validValues) {
    if (n.includes(normalize(v)) || normalize(v).includes(n)) return v
  }
  let bestMatch: string | null = null
  let bestDist = Infinity
  for (const v of validValues) {
    const d = levenshteinDistance(n, normalize(v))
    if (d < bestDist) { bestDist = d; bestMatch = v }
  }
  const threshold = Math.max(2, Math.floor(n.length * 0.3))
  return bestDist <= threshold ? bestMatch : null
}

/** Levenshtein-based fuzzy match for suggesting enum mappings (dirty values like "Small Van") */
function fuzzyMatchForSuggestion(dirty: string, validValues: string[]): string | null {
  const n = normalize(dirty)
  let bestMatch: string | null = null
  let bestDist = Infinity
  for (const v of validValues) {
    const d = levenshteinDistance(n, normalize(v))
    if (d < bestDist) {
      bestDist = d
      bestMatch = v
    }
  }
  const threshold = Math.max(2, Math.floor(n.length * 0.35))
  return bestDist <= threshold ? bestMatch : null
}

/**
 * Suggest enum mappings from source values to target valid values.
 * Uses exact match, normalized match, and partial match.
 */
export function suggestEnumMappings(
  sourceValues: string[],
  validValues: string[]
): Record<string, string> {
  const validSet = new Set(validValues)
  const validNormalized = new Map(validValues.map((v) => [normalize(v), v]))
  const result: Record<string, string> = {}

  for (const src of sourceValues) {
    const srcNorm = normalize(src)
    if (validSet.has(src)) {
      result[src] = src
      continue
    }
    if (validNormalized.has(srcNorm)) {
      result[src] = validNormalized.get(srcNorm)!
      continue
    }
    let best = validValues.find(
      (v) =>
        srcNorm === normalize(v) ||
        srcNorm.includes(normalize(v)) ||
        normalize(v).includes(srcNorm)
    )
    if (!best) {
      best = fuzzyMatchForSuggestion(src, validValues) ?? undefined
    }
    if (best) result[src] = best
  }
  return result
}
