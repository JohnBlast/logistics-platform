import { Router } from 'express'
import {
  QUOTE_FIELDS,
  LOAD_FIELDS,
  DRIVER_FIELDS,
  VEHICLE_FIELDS,
  QUOTE_STATUS,
  LOAD_STATUS,
  VEHICLE_TYPES,
} from '../models/schema.js'
import { suggestEnumMappings } from '../services/enumMappingService.js'
import { claudeSuggestEnumMappings } from '../services/claudeService.js'

export const schemaRouter = Router()

const ENTITY_DESCRIPTIONS: Record<string, string> = {
  Quote: 'Price offered by fleet for a load',
  Load: 'Shipping job',
  Driver: 'Person operating vehicle; belongs to fleet',
  Vehicle: 'Truck/van',
}

const FLAT_TABLE_ENUMS: Record<string, string[]> = {
  status: [...new Set([...QUOTE_STATUS, ...LOAD_STATUS])],
  vehicle_type: [...VEHICLE_TYPES],
  requested_vehicle_type: [...VEHICLE_TYPES],
}

schemaRouter.get('/', (_req, res) => {
  res.json({
    entities: [
      { name: 'Quote', description: ENTITY_DESCRIPTIONS.Quote, fields: QUOTE_FIELDS, enums: { status: QUOTE_STATUS, requested_vehicle_type: VEHICLE_TYPES } },
      { name: 'Load', description: ENTITY_DESCRIPTIONS.Load, fields: LOAD_FIELDS, enums: { status: LOAD_STATUS } },
      { name: 'Driver', description: ENTITY_DESCRIPTIONS.Driver, fields: DRIVER_FIELDS },
      { name: 'Vehicle', description: ENTITY_DESCRIPTIONS.Vehicle, fields: VEHICLE_FIELDS, enums: { vehicle_type: VEHICLE_TYPES } },
    ],
    flatTableEnums: FLAT_TABLE_ENUMS,
  })
})

schemaRouter.get('/enum/:field', (req, res) => {
  const vals = FLAT_TABLE_ENUMS[req.params.field]
  if (!vals) return res.status(404).json({ error: 'Unknown enum field' })
  res.json({ validValues: vals })
})

const ENTITY_ENUM_FIELDS: Record<string, { field: string; validValues: string[] }[]> = {
  quote: [
    { field: 'status', validValues: [...QUOTE_STATUS] },
    { field: 'requested_vehicle_type', validValues: [...VEHICLE_TYPES] },
  ],
  load: [{ field: 'status', validValues: [...LOAD_STATUS] }],
  driver_vehicle: [{ field: 'vehicle_type', validValues: [...VEHICLE_TYPES] }],
}

schemaRouter.get('/enum-fields/:entity', (req, res) => {
  const fields = ENTITY_ENUM_FIELDS[req.params.entity]
  if (!fields) return res.status(404).json({ error: 'Unknown entity' })
  res.json({ enumFields: fields })
})

schemaRouter.post('/suggest-enum-mappings', async (req, res) => {
  const { sourceValues, validValues, aiMode } = req.body
  if (!Array.isArray(sourceValues) || !Array.isArray(validValues)) {
    return res.status(400).json({ error: 'sourceValues and validValues arrays required' })
  }
  const src = sourceValues.map(String)
  const valid = validValues.map(String)

  let suggestions: Record<string, string>
  if (aiMode === 'claude') {
    const claudeResult = await claudeSuggestEnumMappings(src, valid)
    suggestions = Object.keys(claudeResult).length > 0 ? claudeResult : suggestEnumMappings(src, valid)
  } else {
    suggestions = suggestEnumMappings(src, valid)
  }
  res.json({ suggestions })
})
