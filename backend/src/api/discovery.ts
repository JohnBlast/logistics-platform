import { Router } from 'express'
import { getDiscoveryData, clearDiscoveryData } from '../services/discoveryStore.js'

export const discoveryRouter = Router()

/** Debug: returns pipeline structure to help diagnose empty Discovery results. */
discoveryRouter.get('/debug', (_req, res) => {
  const data = getDiscoveryData()
  if (!data?.flatRows?.length) {
    return res.json({ rowCount: 0, columnNames: [], sampleRow: null })
  }
  const flat = data.flatRows
  const sample = flat[0] as Record<string, unknown>
  res.json({
    rowCount: flat.length,
    columnNames: Object.keys(sample),
    sampleRow: sample,
  })
})

discoveryRouter.get('/data', (_req, res) => {
  const data = getDiscoveryData()
  if (!data) {
    return res.status(200).json(null)
  }
  res.json(data)
})

discoveryRouter.delete('/data', (_req, res) => {
  clearDiscoveryData()
  res.status(204).send()
})
