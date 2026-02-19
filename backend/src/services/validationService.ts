import { getProfile } from '../services/profileStore.js'
import { deduplicate } from './deduplicationService.js'
import { runJoinsWithSteps } from './joinService.js'
import { applyFilters, applyFiltersWithRuleEffects, validateFilterFields } from './filterService.js'
import { validateEnumsInRows } from './enumValidation.js'
import { applyEnumMappings } from './enumMappingService.js'

export interface ValidationSummary {
  rowsSuccessful: number
  rowsDropped: number
  fieldsWithWarnings: string[]
  dedupWarnings: string[]
  filterFieldWarnings: string[]
  flatRows: Record<string, unknown>[]
  excludedByFilter?: Record<string, unknown>[]
  excludedByFilterCount?: number
  ruleEffects?: { ruleIndex: number; rule: string; type: string; before: number; after: number; excluded: number }[]
  cellsWithWarnings?: number
  nullOrErrorFields?: string[]
  nullOrEmptyCells?: number
  joinSteps?: { name: string; leftEntity: string; rightEntity: string; leftKey: string; rightKey: string; fallbackKey?: string; rowsBefore: number; rowsAfter: number }[]
}

const DEPRECATED_FIELDS = new Set(['license_number'])

function applyMappings(
  rows: Record<string, unknown>[],
  mappings: Record<string, string>
): Record<string, unknown>[] {
  if (!mappings || Object.keys(mappings).length === 0) return []
  return rows.map((row) => {
    const out: Record<string, unknown> = {}
    for (const [target, source] of Object.entries(mappings)) {
      if (DEPRECATED_FIELDS.has(target)) continue
      out[target] = row[source] ?? null
    }
    return out
  })
}

export function runValidation(
  profileId: string,
  sessionData: {
    quote: { headers: string[]; rows: Record<string, unknown>[] }
    load: { headers: string[]; rows: Record<string, unknown>[] }
    driver_vehicle: { headers: string[]; rows: Record<string, unknown>[] }
  },
  options?: { joinOnly?: boolean; filtersOverride?: { type: 'inclusion' | 'exclusion'; rule: string; structured?: unknown }[]; joinsOverride?: { name: string; leftEntity: string; rightEntity: string; leftKey: string; rightKey: string; fallbackKey?: string }[] }
): ValidationSummary {
  const profile = getProfile(profileId)
  if (!profile) throw new Error('Profile not found')

  const mappings = (profile.mappings || {}) as Record<string, Record<string, string>>
  const filtersToUse = options?.filtersOverride ?? profile.filters ?? []
  const joinsToUse = options?.joinsOverride ?? profile.joins ?? []
  const quoteMappings = mappings.quote || {}
  const loadMappings = mappings.load || {}
  const dvMappings = mappings.driver_vehicle || {}

  let quoteRows = applyMappings(sessionData.quote.rows, quoteMappings)
  let loadRows = applyMappings(sessionData.load.rows, loadMappings)
  let dvRows = applyMappings(sessionData.driver_vehicle.rows, dvMappings)

  const enumMappings = profile.enumMappings
  quoteRows = applyEnumMappings(quoteRows, 'quote', enumMappings)
  loadRows = applyEnumMappings(loadRows, 'load', enumMappings)
  dvRows = applyEnumMappings(dvRows, 'driver_vehicle', enumMappings)

  const totalBefore = quoteRows.length + loadRows.length + dvRows.length

  const qDedup = deduplicate(quoteRows, 'quote', 'quote_id', 'updated_at')
  const lDedup = deduplicate(loadRows, 'load', 'load_id', 'updated_at')
  const dDedup = deduplicate(dvRows, 'driver_vehicle', 'vehicle_id', 'updated_at')
  quoteRows = qDedup.rows
  loadRows = lDedup.rows
  dvRows = dDedup.rows
  const dedupWarnings = [...qDedup.warnings, ...lDedup.warnings, ...dDedup.warnings]

  const profileJoins = joinsToUse as { name: string; leftEntity: string; rightEntity: string; leftKey: string; rightKey: string; fallbackKey?: string }[]
  const joinResult = runJoinsWithSteps(quoteRows, loadRows, dvRows, profileJoins)
  let flat = joinResult.rows
  const joinSteps = joinResult.steps

  const allFlatCols = [...new Set(flat.flatMap((r) => Object.keys(r)))].filter((c) => !DEPRECATED_FIELDS.has(c))
  flat = flat.map((row) => {
    const out: Record<string, unknown> = {}
    for (const col of allFlatCols) {
      out[col] = col in row ? row[col] : null
    }
    return out
  })

  const enumResult = validateEnumsInRows(flat)
  flat = enumResult.rows
  const fieldsWithWarnings = enumResult.fieldsWithWarnings

  let filterFieldWarnings: string[] = []
  let excludedByFilter: Record<string, unknown>[] = []
  let excludedByFilterCount = 0
  let ruleEffects: { ruleIndex: number; rule: string; type: string; before: number; after: number; excluded: number }[] = []
  if (!options?.joinOnly && filtersToUse.length > 0) {
    const flatBeforeFilters = [...flat]
    const flatCols = flat.length > 0 ? Object.keys(flat[0]) : []
    const invalidFields = validateFilterFields(flatCols, filtersToUse)
    const validFilters =
      invalidFields.length > 0
        ? filtersToUse.filter((f) => {
            const s = f.structured as { field?: string; op?: string } | undefined
            if (s?.op === 'has_any_null' || s?.op === 'has_no_nulls') return true
            return s?.field && !invalidFields.includes(s.field)
          })
        : filtersToUse
    if (invalidFields.length > 0) filterFieldWarnings = invalidFields
    const { result, ruleEffects: effects } = applyFiltersWithRuleEffects(flat, validFilters)
    flat = result
    ruleEffects = effects
    const includedSet = new Set(flat.map((r) => JSON.stringify(r)))
    excludedByFilter = flatBeforeFilters.filter((r) => !includedSet.has(JSON.stringify(r)))
    excludedByFilterCount = excludedByFilter.length
    excludedByFilter = excludedByFilter.slice(0, 100)
  }

  let cellsWithWarnings = 0
  const nullOrErrorFields = new Set<string>()
  let nullOrEmptyCells = 0
  if (flat.length > 0) {
    const cols = Object.keys(flat[0])
    for (const row of flat) {
      for (const col of cols) {
        if (row[col] == null || row[col] === '') {
          nullOrEmptyCells++
          nullOrErrorFields.add(col)
        }
      }
    }
    if (fieldsWithWarnings.length > 0) {
      for (const row of flat) {
        for (const col of fieldsWithWarnings) {
          if (row[col] == null || row[col] === '') cellsWithWarnings++
        }
      }
    }
  }

  return {
    rowsSuccessful: flat.length,
    rowsDropped: Math.max(0, totalBefore - flat.length),
    fieldsWithWarnings,
    dedupWarnings,
    filterFieldWarnings,
    flatRows: flat,
    excludedByFilter: excludedByFilter.length > 0 ? excludedByFilter : undefined,
    excludedByFilterCount,
    ruleEffects: ruleEffects.length > 0 ? ruleEffects : undefined,
    cellsWithWarnings: cellsWithWarnings > 0 ? cellsWithWarnings : undefined,
    nullOrErrorFields: nullOrErrorFields.size > 0 ? [...nullOrErrorFields] : undefined,
    nullOrEmptyCells: nullOrEmptyCells > 0 ? nullOrEmptyCells : undefined,
    joinSteps,
  }
}
