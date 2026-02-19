import {
  QUOTE_FIELDS,
  LOAD_FIELDS,
  DRIVER_FIELDS,
  VEHICLE_FIELDS,
  QUOTE_STATUS,
  LOAD_STATUS,
  VEHICLE_TYPES,
  type ObjectType,
} from '../models/schema.js'
import { getTargetFieldsWithMetadata, type TargetFieldMetadata } from './schemaMetadata.js'

export interface MappingSuggestion {
  targetField: string
  sourceColumn: string
  confidence: number
}

// Fuzzy match: "Quote Ref" -> quote_id, "Load Number" -> load_id, etc.
const ALIASES: Record<string, string[]> = {
  quote_id: ['quote ref', 'quote id', 'quoteref'],
  load_id: ['load number', 'load id', 'load reference'],
  quoted_price: ['quoted amount', 'price', 'amount'],
  status: ['status'],
  date_created: ['date created', 'date created'],
  created_at: ['created_at', 'created'],
  updated_at: ['updated_at', 'updated'],
  distance_km: ['distance', 'distance km', 'distance (km)'],
  associated_fleet_id: ['fleet id', 'fleetid', 'associated fleet'],
  fleet_quoter_name: ['quoter name', 'quoter', 'fleet quoter'],
  requested_vehicle_type: ['vehicle type', 'requested vehicle', 'vehicle type requested'],
  collection_town: ['collection town', 'collection town'],
  collection_city: ['collection city', 'collection city'],
  collection_time: ['collection time', 'collection time'],
  collection_date: ['collection date', 'collection date'],
  delivery_town: ['delivery town', 'delivery town'],
  delivery_city: ['delivery city', 'delivery city'],
  delivery_time: ['delivery time', 'delivery time'],
  delivery_date: ['delivery date', 'delivery date'],
  completion_date: ['completion date', 'completion'],
  load_poster_name: ['poster name', 'load poster', 'poster'],
  allocated_vehicle_id: ['vehicle id', 'vehicleid', 'allocated vehicle'],
  driver_id: ['driver id', 'driverid'],
  vehicle_id: ['vehicle id', 'vehicleid'],
  name: ['driver name', 'name'],
  fleet_id: ['fleet id', 'fleetid'],
  vehicle_type: ['type', 'vehicle type'],
  registration_number: ['registration', 'reg'],
  number_of_items: ['number of items', 'items', 'item count'],
  email: ['email'],
  phone: ['phone'],
  capacity_kg: ['capacity', 'capacity kg', 'capacity (kg)'],
}

const ENUM_BY_FIELD: Record<string, readonly string[]> = {
  'quote.status': QUOTE_STATUS,
  'quote.requested_vehicle_type': VEHICLE_TYPES,
  'load.status': LOAD_STATUS,
  'driver_vehicle.vehicle_type': VEHICLE_TYPES,
}

function scoreNameMatch(target: string, source: string): number {
  const t = target.toLowerCase().replace(/_/g, ' ')
  const s = source.toLowerCase().replace(/_/g, ' ')
  if (t === s) return 1
  if (s.includes(t) || t.includes(s)) return 0.9
  const aliases = ALIASES[target]
  if (aliases?.some((a) => s.includes(a) || a.includes(s))) return 0.85
  const tWords = new Set(t.split(/\s+/))
  const sWords = new Set(s.split(/\s+/))
  const overlap = [...tWords].filter((w) => sWords.has(w)).length
  return (overlap / Math.max(tWords.size, sWords.size)) * 0.7
}

function scoreValueFit(
  values: unknown[],
  targetType: string,
  validEnums?: readonly string[]
): number {
  if (values.length === 0) return 0.5
  const strs = values.map((v) => String(v).trim()).filter(Boolean)
  if (strs.length === 0) return 0.5

  let typeScore = 0.5
  if (targetType === 'UUID') {
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const matches = strs.filter((s) => uuidLike.test(s)).length
    typeScore = matches / strs.length * 0.7 + 0.3
  } else if (targetType === 'DECIMAL' || targetType === 'INTEGER') {
    const numLike = strs.filter((s) => /^-?\d+([.]\d+)?$/.test(s)).length
    typeScore = numLike / strs.length * 0.7 + 0.3
  } else if (targetType === 'TIMESTAMP' || targetType === 'DATE') {
    const dateLike = strs.some((s) => /\d{4}-\d{2}-\d{2}/.test(s) || /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s))
    typeScore = dateLike ? 0.8 : 0.4
  } else if (targetType === 'enum' && validEnums) {
    const lowerValid = new Set(validEnums.map((e) => e.toLowerCase()))
    const matchCount = strs.filter((s) => lowerValid.has(s.toLowerCase()) || lowerValid.has(s.replace(/[\s-]/g, '_'))).length
    typeScore = matchCount / strs.length * 0.8 + 0.2
  }
  return typeScore
}

/**
 * Phase 1: Generate mapping candidates (no confidence).
 * Uses column names AND sample values for better matching.
 */
export function suggestMappingCandidates(
  objectType: ObjectType,
  sourceHeaders: string[],
  sourceRows: Record<string, unknown>[],
  targetFieldsWithMeta: TargetFieldMetadata[],
  lockedMappings?: Record<string, string>
): { targetField: string; sourceColumn: string }[] {
  const candidates: { targetField: string; sourceColumn: string }[] = []

  for (const field of targetFieldsWithMeta) {
    if (lockedMappings?.[field.name]) {
      candidates.push({ targetField: field.name, sourceColumn: lockedMappings[field.name] })
      continue
    }
    let bestCol = ''
    let bestNameScore = 0
    for (const col of sourceHeaders) {
      const score = scoreNameMatch(field.name, col)
      if (score > bestNameScore) {
        bestNameScore = score
        bestCol = col
      }
    }
    if (bestCol && bestNameScore > 0.3) {
      candidates.push({ targetField: field.name, sourceColumn: bestCol })
    }
  }
  return candidates
}

/**
 * Phase 2: Decoupled confidence scorer (mocked).
 * Scores how well source column (name + values) fits target field.
 */
export function scoreMappingConfidence(
  sourceColumn: string,
  sourceRows: Record<string, unknown>[],
  targetFieldMeta: TargetFieldMetadata,
  objectType: ObjectType
): number {
  const values = sourceRows.map((r) => r[sourceColumn]).filter((v) => v != null && v !== '')
  const nameScore = scoreNameMatch(targetFieldMeta.name, sourceColumn)
  const enumKey = objectType === 'driver_vehicle' ? 'driver_vehicle' : objectType
  const validEnums = ENUM_BY_FIELD[`${enumKey}.${targetFieldMeta.name}`]
  const valueScore = scoreValueFit(values, targetFieldMeta.type, validEnums)
  const combined = nameScore * 0.6 + valueScore * 0.4
  return Math.round(Math.min(1, Math.max(0.3, combined)) * 100) / 100
}

/**
 * Full suggest: candidates + decoupled confidence.
 */
export function suggestMappings(
  objectType: ObjectType,
  sourceHeaders: string[],
  sourceRows: Record<string, unknown>[],
  lockedMappings?: Record<string, string>
): MappingSuggestion[] {
  const meta = getTargetFieldsWithMetadata(objectType)
  const candidates = suggestMappingCandidates(objectType, sourceHeaders, sourceRows, meta, lockedMappings)

  return candidates.map((c) => {
    const fieldMeta = meta.find((f) => f.name === c.targetField)
    const confidence = fieldMeta
      ? scoreMappingConfidence(c.sourceColumn, sourceRows, fieldMeta, objectType)
      : 0.5
    return {
      targetField: c.targetField,
      sourceColumn: c.sourceColumn,
      confidence: c.sourceColumn === lockedMappings?.[c.targetField] ? 1 : confidence,
    }
  })
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
