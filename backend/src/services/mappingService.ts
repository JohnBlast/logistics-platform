import {
  QUOTE_FIELDS,
  LOAD_FIELDS,
  DRIVER_FIELDS,
  VEHICLE_FIELDS,
  type ObjectType,
} from '../models/schema.js'

export interface MappingSuggestion {
  targetField: string
  sourceColumn: string
  confidence: number
}

const SCHEMA_MAP: Record<string, { quote: string[]; load: string[]; driver: string[]; vehicle: string[] }> = {
  quote: { quote: QUOTE_FIELDS.map((f) => f.name), load: [], driver: [], vehicle: [] },
  load: { quote: [], load: LOAD_FIELDS.map((f) => f.name), driver: [], vehicle: [] },
  driver_vehicle: {
    quote: [],
    load: [],
    driver: DRIVER_FIELDS.map((f) => f.name),
    vehicle: VEHICLE_FIELDS.map((f) => f.name),
  },
}

// Fuzzy match: "Quote Ref" -> quote_id, "Load Number" -> load_id, etc.
const ALIASES: Record<string, string[]> = {
  quote_id: ['quote ref', 'quote id', 'quoteref'],
  load_id: ['load number', 'load id', 'load reference'],
  quoted_price: ['quoted amount', 'price', 'amount'],
  status: ['status'],
  created_at: ['created_at', 'created'],
  updated_at: ['updated_at', 'updated'],
  driver_id: ['driver id', 'driverid'],
  vehicle_id: ['vehicle id', 'vehicleid'],
  name: ['driver name', 'name'],
  fleet_id: ['fleet id', 'fleetid'],
  vehicle_type: ['type', 'vehicle type'],
  registration_number: ['registration', 'reg'],
  load_poster_name: ['poster name'],
  allocated_vehicle_id: ['vehicle id'],
  allocated_fleet_id: ['fleet id'],
}

function scoreMatch(target: string, source: string): number {
  const t = target.toLowerCase().replace(/_/g, ' ')
  const s = source.toLowerCase().replace(/_/g, ' ')
  if (t === s) return 1
  if (s.includes(t) || t.includes(s)) return 0.9
  const aliases = ALIASES[target]
  if (aliases?.some((a) => s.includes(a) || a.includes(s))) return 0.85
  const tWords = new Set(t.split(/\s+/))
  const sWords = new Set(s.split(/\s+/))
  const overlap = [...tWords].filter((w) => sWords.has(w)).length
  return overlap / Math.max(tWords.size, sWords.size) * 0.7
}

export function suggestMappings(
  objectType: ObjectType,
  sourceHeaders: string[],
  _sourceRows: Record<string, unknown>[],
  lockedMappings?: Record<string, string>
): MappingSuggestion[] {
  const fields =
    objectType === 'driver_vehicle'
      ? [...DRIVER_FIELDS, ...VEHICLE_FIELDS]
      : objectType === 'quote'
        ? QUOTE_FIELDS
        : objectType === 'load'
          ? LOAD_FIELDS
          : []
  const suggestions: MappingSuggestion[] = []
  for (const field of fields) {
    if (lockedMappings?.[field.name]) {
      suggestions.push({
        targetField: field.name,
        sourceColumn: lockedMappings[field.name],
        confidence: 1,
      })
      continue
    }
    let bestCol = ''
    let bestScore = 0
    for (const col of sourceHeaders) {
      const score = scoreMatch(field.name, col)
      if (score > bestScore) {
        bestScore = score
        bestCol = col
      }
    }
    if (bestCol && bestScore > 0.3) {
      suggestions.push({
        targetField: field.name,
        sourceColumn: bestCol,
        confidence: Math.round(bestScore * 100) / 100,
      })
    }
  }
  return suggestions
}

export function applyMappings(
  rows: Record<string, unknown>[],
  mappings: Record<string, string>,
  targetFields: { name: string }[]
): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {}
    for (const field of targetFields) {
      const sourceCol = mappings[field.name]
      out[field.name] = sourceCol ? row[sourceCol] : null
    }
    return out
  })
}
