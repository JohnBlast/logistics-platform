/** Schema entity indices: Quote=0, Load=1, Driver=2, Vehicle=3 */
export const SCHEMA_KEYS: Record<string, number[]> = {
  quote: [0],
  load: [1],
  driver_vehicle: [2, 3],
}

type SchemaEntities = { fields: { name: string; required?: boolean }[] }[] | null

export function getRequiredFromSchema(entities: SchemaEntities, key: string): string[] {
  if (!entities?.length) return []
  const indices = SCHEMA_KEYS[key] || []
  const out: string[] = []
  const seen = new Set<string>()
  for (const i of indices) {
    for (const f of entities[i]?.fields || []) {
      if (f.required && !seen.has(f.name)) {
        seen.add(f.name)
        out.push(f.name)
      }
    }
  }
  return out
}

export function getFieldsFromSchema(
  schema: { entities: SchemaEntities } | null,
  objectType: 'quote' | 'load' | 'driver_vehicle'
): { all: string[]; required: string[] } {
  if (!schema?.entities) return { all: [], required: [] }
  const indices = SCHEMA_KEYS[objectType] || []
  const all: string[] = []
  const required: string[] = []
  const seen = new Set<string>()
  for (const i of indices) {
    for (const f of schema.entities[i]?.fields || []) {
      if (!seen.has(f.name)) {
        seen.add(f.name)
        all.push(f.name)
        if (f.required) required.push(f.name)
      }
    }
  }
  return { all, required }
}
