/**
 * Orchestrates transform config generation.
 * Calls Claude when aiMode is 'claude' and API is available; otherwise uses mocked fallback.
 */

import { UK_CITIES, UK_TOWNS } from '../constants/ukLocations.js'
import {
  QUOTE_FIELDS,
  LOAD_FIELDS,
  DRIVER_FIELDS,
  VEHICLE_FIELDS,
} from '../models/schema.js'
import type { FieldDef } from '../models/schema.js'
import { claudeGenerateTransformConfig, isClaudeAvailable } from './claudeService.js'
import type { TransformConfig, TransformRule } from '../types/transformConfig.js'

const LOCATION_CITY_FIELDS = ['collection_city', 'delivery_city']
const LOCATION_TOWN_FIELDS = ['collection_town', 'delivery_town']
const PERSON_NAME_FIELDS = ['fleet_quoter_name', 'load_poster_name', 'name']

function fieldToRule(field: FieldDef, entity: string): TransformRule {
  if (field.type === 'enum') {
    return { type: 'skip' }
  }
  if (field.type === 'UUID') {
    return { type: 'uuid' }
  }
  if (field.type === 'INTEGER') {
    return { type: 'integer' }
  }
  if (field.type === 'DECIMAL') {
    if (field.name === 'quoted_price') {
      return { type: 'number', stripSuffixes: ['£', 'GBP'] }
    }
    if (field.name === 'distance_km') {
      return { type: 'number', stripSuffixes: ['km', 'KM'] }
    }
    if (field.name === 'capacity_kg') {
      return { type: 'number', stripSuffixes: ['kg', 'KG'] }
    }
    return { type: 'number' }
  }
  if (field.type === 'DATE' || (field.name === 'date_created' && field.type === 'TIMESTAMP')) {
    return { type: 'date' }
  }
  if (field.type === 'TIMESTAMP' && field.name !== 'date_created') {
    return { type: 'datetime' }
  }
  if (field.type === 'VARCHAR') {
    if (LOCATION_CITY_FIELDS.includes(field.name)) {
      return { type: 'location_city', referenceList: [...UK_CITIES] }
    }
    if (LOCATION_TOWN_FIELDS.includes(field.name)) {
      return { type: 'location_town', referenceList: [...UK_TOWNS] }
    }
    if (PERSON_NAME_FIELDS.includes(field.name)) {
      return { type: 'person_name' }
    }
    if (field.name === 'email') {
      return { type: 'email' }
    }
    if (field.name === 'phone') {
      return { type: 'phone' }
    }
    if (field.name === 'registration_number') {
      return { type: 'registration' }
    }
  }
  return { type: 'uuid' }
}

/** Infer stripSuffixes from sample values (e.g. "100 EUR", "£100", "50 km" -> add EUR, £, km) */
function inferSuffixesFromSamples(
  rows: Record<string, unknown>[],
  fieldName: string,
  baseSuffixes: string[]
): string[] {
  const seen = new Set(baseSuffixes.map((s) => s.toLowerCase()))
  const sampleSize = Math.min(20, rows.length)
  for (let i = 0; i < sampleSize; i++) {
    const val = rows[i]?.[fieldName]
    if (val == null) continue
    const s = String(val).trim()
    // Prefix: £100, €50, $75
    const prefixMatch = s.match(/^([£€$])\s*\d/)
    if (prefixMatch && !seen.has(prefixMatch[1].toLowerCase())) {
      seen.add(prefixMatch[1].toLowerCase())
      baseSuffixes = [...baseSuffixes, prefixMatch[1]]
    }
    // Suffix: 100 EUR, 50 km, 25 kg
    const suffixMatch = s.match(/\d\s*([a-zA-Z]{2,4})$/i)
    if (suffixMatch && !seen.has(suffixMatch[1].toLowerCase())) {
      seen.add(suffixMatch[1].toLowerCase())
      baseSuffixes = [...baseSuffixes, suffixMatch[1]]
    }
  }
  return baseSuffixes
}

/** Build mocked config from schema. When mappedData is provided, inspects samples to infer formats. */
export function buildMockedTransformConfig(mappedData?: {
  quote: Record<string, unknown>[]
  load: Record<string, unknown>[]
  driver_vehicle: Record<string, unknown>[]
}): TransformConfig {
  const config: TransformConfig = {}

  const quoteConfig: Record<string, TransformRule> = {}
  for (const f of QUOTE_FIELDS) {
    let rule = fieldToRule(f, 'quote')
    if (mappedData?.quote?.length && f.type === 'DECIMAL' && f.name === 'quoted_price') {
      const suffixes = inferSuffixesFromSamples(mappedData.quote, f.name, ['£', 'GBP'])
      if (suffixes.length > 2) rule = { ...rule, stripSuffixes: suffixes }
    }
    quoteConfig[f.name] = rule
  }
  config.quote = quoteConfig

  const loadConfig: Record<string, TransformRule> = {}
  for (const f of LOAD_FIELDS) {
    let rule = fieldToRule(f, 'load')
    if (mappedData?.load?.length && f.type === 'DECIMAL') {
      if (f.name === 'distance_km') {
        const suffixes = inferSuffixesFromSamples(mappedData.load, f.name, ['km', 'KM'])
        if (suffixes.length > 2) rule = { ...rule, stripSuffixes: suffixes }
      }
    }
    loadConfig[f.name] = rule
  }
  config.load = loadConfig

  const driverVehicleConfig: Record<string, TransformRule> = {}
  for (const f of [...DRIVER_FIELDS, ...VEHICLE_FIELDS]) {
    if (!driverVehicleConfig[f.name]) {
      let rule = fieldToRule(f, 'driver_vehicle')
      if (mappedData?.driver_vehicle?.length && f.type === 'DECIMAL' && f.name === 'capacity_kg') {
        const suffixes = inferSuffixesFromSamples(mappedData.driver_vehicle, f.name, ['kg', 'KG'])
        if (suffixes.length > 2) rule = { ...rule, stripSuffixes: suffixes }
      }
      driverVehicleConfig[f.name] = rule
    }
  }
  config.driver_vehicle = driverVehicleConfig

  return config
}

export interface GenerateTransformConfigInput {
  aiMode: 'claude' | 'mocked'
  mappedData?: {
    quote: Record<string, unknown>[]
    load: Record<string, unknown>[]
    driver_vehicle: Record<string, unknown>[]
  }
}

/**
 * Generate TransformConfig. Uses Claude when aiMode is 'claude' and API key is set; otherwise mocked.
 */
export async function generateTransformConfig(
  input: GenerateTransformConfigInput
): Promise<TransformConfig> {
  if (input.aiMode === 'claude' && isClaudeAvailable() && input.mappedData) {
    const schemaMetadata = [
      { entity: 'quote', fields: QUOTE_FIELDS.map((f) => ({ name: f.name, type: f.type, description: f.description })) },
      { entity: 'load', fields: LOAD_FIELDS.map((f) => ({ name: f.name, type: f.type, description: f.description })) },
      {
        entity: 'driver_vehicle',
        fields: [...DRIVER_FIELDS, ...VEHICLE_FIELDS].map((f) => ({ name: f.name, type: f.type, description: f.description })),
      },
    ]
    const sampleData = input.mappedData
    const fromClaude = await claudeGenerateTransformConfig(schemaMetadata, sampleData)
    if (Object.keys(fromClaude).length > 0) {
      return fromClaude
    }
  }
  return buildMockedTransformConfig(input.mappedData)
}
