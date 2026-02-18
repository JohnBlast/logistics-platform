import { Router } from 'express'
import { suggestMappings } from '../services/mappingService.js'
import { claudeMappingSuggest } from '../services/claudeService.js'
import {
  QUOTE_FIELDS,
  LOAD_FIELDS,
  DRIVER_FIELDS,
  VEHICLE_FIELDS,
} from '../models/schema.js'

export const mappingRouter = Router()

function getTargetFields(objectType: string): string[] {
  switch (objectType) {
    case 'quote':
      return QUOTE_FIELDS.map((f) => f.name)
    case 'load':
      return LOAD_FIELDS.map((f) => f.name)
    case 'driver_vehicle':
      return [...DRIVER_FIELDS, ...VEHICLE_FIELDS].map((f) => f.name)
    default:
      return []
  }
}

mappingRouter.post('/suggest', async (req, res) => {
  const { objectType, sourceHeaders, sourceRows, lockedMappings, aiMode } = req.body
  if (!objectType || !sourceHeaders?.length) {
    return res.status(400).json({ error: 'objectType and sourceHeaders required' })
  }
  let suggestions: { targetField: string; sourceColumn: string; confidence: number }[]
  if (aiMode === 'claude') {
    const targetFields = getTargetFields(objectType)
    const claudeResult = await claudeMappingSuggest(
      objectType,
      sourceHeaders,
      targetFields,
      lockedMappings
    )
    if (claudeResult.length > 0) {
      suggestions = claudeResult
    } else {
      suggestions = suggestMappings(objectType, sourceHeaders, sourceRows || [], lockedMappings)
    }
  } else {
    suggestions = suggestMappings(objectType, sourceHeaders, sourceRows || [], lockedMappings)
  }
  res.json({ suggestions })
})
