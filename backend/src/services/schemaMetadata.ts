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

export interface TargetFieldMetadata {
  name: string
  type: string
  description?: string
  validValues?: string[]
}

const FIELD_ENUMS: Record<string, string[]> = {
  'quote.status': [...QUOTE_STATUS],
  'quote.requested_vehicle_type': [...VEHICLE_TYPES],
  'load.status': [...LOAD_STATUS],
  'driver_vehicle.vehicle_type': [...VEHICLE_TYPES],
}

export function getTargetFieldsWithMetadata(objectType: ObjectType): TargetFieldMetadata[] {
  const fields =
    objectType === 'driver_vehicle'
      ? [...DRIVER_FIELDS, ...VEHICLE_FIELDS]
      : objectType === 'quote'
        ? QUOTE_FIELDS
        : objectType === 'load'
          ? LOAD_FIELDS
          : []
  return fields.map((f) => {
    const meta: TargetFieldMetadata = {
      name: f.name,
      type: f.type,
      description: f.description,
    }
    const enumKey = objectType === 'driver_vehicle' ? 'driver_vehicle' : objectType
    const valid = FIELD_ENUMS[`${enumKey}.${f.name}`]
    if (valid) meta.validValues = valid
    return meta
  })
}

export function getTargetFieldMetadataMap(
  objectType: ObjectType
): Record<string, TargetFieldMetadata> {
  const list = getTargetFieldsWithMetadata(objectType)
  return Object.fromEntries(list.map((f) => [f.name, f]))
}
