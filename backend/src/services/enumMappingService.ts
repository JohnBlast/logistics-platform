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
        out[field] = null // unmapped invalid -> null
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
    const best = validValues.find(
      (v) =>
        srcNorm === normalize(v) ||
        srcNorm.includes(normalize(v)) ||
        normalize(v).includes(srcNorm)
    )
    if (best) result[src] = best
  }
  return result
}
