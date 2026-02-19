import { Router } from 'express'
import { suggestMappings } from '../services/mappingService.js'
import {
  claudeMappingSuggest,
  claudeScoreMappingConfidenceBatch,
  isClaudeAvailable,
} from '../services/claudeService.js'
import { getTargetFieldsWithMetadata, getTargetFieldMetadataMap } from '../services/schemaMetadata.js'
import type { ObjectType } from '../models/schema.js'

export const mappingRouter = Router()

mappingRouter.post('/suggest', async (req, res) => {
  const { objectType, sourceHeaders, sourceRows, lockedMappings, aiMode } = req.body
  if (!objectType || !sourceHeaders?.length) {
    return res.status(400).json({ error: 'objectType and sourceHeaders required' })
  }

  const rows = Array.isArray(sourceRows) ? sourceRows : []
  const targetMeta = getTargetFieldsWithMetadata(objectType as ObjectType)
  const metaMap = getTargetFieldMetadataMap(objectType as ObjectType)

  let suggestions: { targetField: string; sourceColumn: string; confidence: number }[]

  // Mocked mode always uses mock; Claude mode uses Claude when API key is available
  if (aiMode === 'claude' && isClaudeAvailable()) {
    const candidates = await claudeMappingSuggest(
      objectType,
      sourceHeaders,
      targetMeta,
      rows,
      lockedMappings
    )
    if (candidates.length === 0) {
      console.warn('[mapping] Claude returned no candidates, falling back to mock')
      suggestions = suggestMappings(objectType, sourceHeaders, rows, lockedMappings)
    } else {
      const withValues = candidates.map((c) => ({
        ...c,
        sourceValues: rows
          .map((r) => r[c.sourceColumn])
          .filter((v) => v != null && v !== '')
          .slice(0, 8)
          .map((v) => String(v).slice(0, 80)),
      }))
      const confidenceScores = await claudeScoreMappingConfidenceBatch(withValues, metaMap)
      suggestions = candidates.map((c) => ({
        targetField: c.targetField,
        sourceColumn: c.sourceColumn,
        confidence:
          confidenceScores[`${c.targetField}:${c.sourceColumn}`] ??
          (lockedMappings?.[c.targetField] === c.sourceColumn ? 1 : 0.5),
      }))
      const locked = lockedMappings || {}
      suggestions = suggestions.map((s) =>
        locked[s.targetField] === s.sourceColumn ? { ...s, confidence: 1 } : s
      )
    }
  } else {
    suggestions = suggestMappings(objectType, sourceHeaders, rows, lockedMappings)
  }

  res.json({ suggestions })
})
