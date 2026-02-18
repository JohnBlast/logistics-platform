import { Router } from 'express'
import { listProfiles } from '../services/profileStore.js'
import { runValidation } from '../services/validationService.js'

export const pipelineRouter = Router()

pipelineRouter.post('/validate', (req, res) => {
  const { profileId, sessionData, joinOnly, filtersOverride } = req.body
  if (!profileId || !sessionData) {
    return res.status(400).json({ error: 'profileId and sessionData required' })
  }
  try {
    const summary = runValidation(profileId, sessionData, { joinOnly, filtersOverride })
    res.json(summary)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

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
    res.json(summary)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})
