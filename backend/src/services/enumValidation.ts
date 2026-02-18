import { QUOTE_STATUS, LOAD_STATUS, VEHICLE_TYPES } from '../models/schema.js'

/** Flat table enum fields: status (Quote or Load), vehicle_type, requested_vehicle_type */
const VALID_VALUES: Record<string, readonly string[]> = {
  status: [...new Set([...QUOTE_STATUS, ...LOAD_STATUS])],
  vehicle_type: [...VEHICLE_TYPES],
  requested_vehicle_type: [...VEHICLE_TYPES],
}

export function validateEnumsInRows(
  rows: Record<string, unknown>[],
  enumFieldNames: string[] = ['status', 'vehicle_type', 'requested_vehicle_type']
): { rows: Record<string, unknown>[]; fieldsWithWarnings: string[] } {
  const warned = new Set<string>()
  const result = rows.map((row) => {
    const out = { ...row }
    for (const name of enumFieldNames) {
      const val = row[name]
      if (val == null || val === '') continue
      const str = String(val).trim().toLowerCase()
      const valid = VALID_VALUES[name]
      if (valid && !valid.includes(str)) {
        out[name] = null // invalid → null per GR-7.2
        warned.add(name)
      }
    }
    return out
  })
  return { rows: result, fieldsWithWarnings: [...warned] }
}

export function getValidEnumValues(fieldName: string): string[] {
  return [...(VALID_VALUES[fieldName] || [])]
}
