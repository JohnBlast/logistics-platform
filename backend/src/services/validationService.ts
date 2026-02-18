import { getProfile } from '../services/profileStore.js'
import { deduplicate } from './deduplicationService.js'
import { runJoins } from './joinService.js'
import { applyFilters, validateFilterFields } from './filterService.js'
import { validateEnumsInRows } from './enumValidation.js'
import { applyEnumMappings } from './enumMappingService.js'

export interface ValidationSummary {
  rowsSuccessful: number
  rowsDropped: number
  fieldsWithWarnings: string[]
  dedupWarnings: string[]
  filterFieldWarnings: string[]
  flatRows: Record<string, unknown>[]
}

function applyMappings(
  rows: Record<string, unknown>[],
  mappings: Record<string, string>
): Record<string, unknown>[] {
  if (!mappings || Object.keys(mappings).length === 0) return []
  return rows.map((row) => {
    const out: Record<string, unknown> = {}
    for (const [target, source] of Object.entries(mappings)) {
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
  options?: { joinOnly?: boolean; filtersOverride?: { type: 'inclusion' | 'exclusion'; rule: string; structured?: unknown }[] }
): ValidationSummary {
  const profile = getProfile(profileId)
  if (!profile) throw new Error('Profile not found')

  const mappings = (profile.mappings || {}) as Record<string, Record<string, string>>
  const filtersToUse = options?.filtersOverride ?? profile.filters ?? []
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

  let flat = runJoins(quoteRows, loadRows, dvRows)

  const enumResult = validateEnumsInRows(flat)
  flat = enumResult.rows
  const fieldsWithWarnings = enumResult.fieldsWithWarnings

  let filterFieldWarnings: string[] = []
  if (!options?.joinOnly && filtersToUse.length > 0) {
    const flatCols = flat.length > 0 ? Object.keys(flat[0]) : []
    const invalidFields = validateFilterFields(flatCols, filtersToUse)
    if (invalidFields.length > 0) {
      filterFieldWarnings = invalidFields
      const validFilters = filtersToUse.filter((f) => {
        const s = f.structured as { field?: string } | undefined
        return s?.field && !invalidFields.includes(s.field)
      })
      flat = applyFilters(flat, validFilters)
    } else {
      flat = applyFilters(flat, filtersToUse)
    }
  }

  return {
    rowsSuccessful: flat.length,
    rowsDropped: Math.max(0, totalBefore - flat.length),
    fieldsWithWarnings,
    dedupWarnings,
    filterFieldWarnings,
    flatRows: flat,
  }
}
