import { SCHEMA, type ObjectType } from '../models/schema.js'

const ENTITY_KEYS: Record<string, string> = {
  quote: 'quote_id',
  load: 'load_id',
  driver: 'driver_id',
  vehicle: 'vehicle_id',
  driver_vehicle: 'vehicle_id',
}

function getKeyField(objectType: ObjectType): string {
  return ENTITY_KEYS[objectType] || 'id'
}

export interface DedupeResult {
  rows: Record<string, unknown>[]
  warnings: string[]
}

export function deduplicate(
  rows: Record<string, unknown>[],
  objectType: ObjectType,
  idField?: string,
  updatedAtField: string = 'updated_at'
): DedupeResult {
  const key = idField || getKeyField(objectType)
  const byId = new Map<string, Record<string, unknown>>()
  const warnings: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const id = row[key]
    const updatedAt = row[updatedAtField]

    if (id == null || id === '') {
      warnings.push(`${objectType}: row ${i + 1} missing ${key}`)
      continue
    }
    if (updatedAt == null || updatedAt === '') {
      warnings.push(`${objectType}: row ${i + 1} missing ${updatedAtField}, kept as-is (C-3)`)
      byId.set(String(id), row as Record<string, unknown>) // keep first if no updated_at
      continue
    }

    const existing = byId.get(String(id))
    if (!existing) {
      byId.set(String(id), row as Record<string, unknown>)
      continue
    }
    {
      const existingTime = new Date(existing[updatedAtField] as string).getTime()
      const currentTime = new Date(updatedAt as string).getTime()
      if (currentTime >= existingTime) {
        byId.set(String(id), row as Record<string, unknown>)
      }
    }
  }

  return { rows: Array.from(byId.values()), warnings }
}
