import { Router } from 'express'
import { listProfiles } from '../services/profileStore.js'
import { runValidation } from '../services/validationService.js'
import { setDiscoveryData } from '../services/discoveryStore.js'

export const pipelineRouter = Router()

pipelineRouter.post('/validate', (req, res) => {
  const { profileId, sessionData, joinOnly, filtersOverride, joinsOverride } = req.body
  if (!profileId || !sessionData) {
    return res.status(400).json({ error: 'profileId and sessionData required' })
  }
  try {
    const summary = runValidation(profileId, sessionData, { joinOnly, filtersOverride, joinsOverride })
    res.json(summary)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

const MAX_FLAT_ROWS = 2000

pipelineRouter.post('/run', (req, res) => {
  const profiles = listProfiles()
  const active = profiles.find((p) => p.status === 'active')
  if (!active) {
    return res.status(400).json({ error: 'No Active profile. Save a configuration first.' })
  }
  const { sessionData } = req.body
  if (!sessionData) {
    return res.status(400).json({ error: 'sessionData required' })
  }
  try {
    const summary = runValidation(active.id, sessionData)
    const flatRows = summary.flatRows ?? []
    const totalRows = flatRows.length
    const truncated = totalRows > MAX_FLAT_ROWS
    const truncatedFlat = truncated ? flatRows.slice(0, MAX_FLAT_ROWS) : flatRows
    const output = {
      ...summary,
      flatRows: truncatedFlat,
      truncated: truncated || undefined,
      totalRows: truncated ? totalRows : undefined,
    }
    setDiscoveryData({
      flatRows: output.flatRows,
      quoteRows: output.quoteRows ?? [],
      loadRows: output.loadRows ?? [],
      vehicleDriverRows: output.vehicleDriverRows ?? [],
      truncated: output.truncated,
      totalRows: output.totalRows,
    })
    res.json(output)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})
