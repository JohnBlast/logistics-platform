import { Router } from 'express'
import { interpretFilterRules } from '../services/filterService.js'
import { claudeInterpretFilterRules, isClaudeAvailable } from '../services/claudeService.js'

export const filtersRouter = Router()

filtersRouter.post('/interpret', async (req, res) => {
  const { rule, aiMode } = req.body
  if (!rule || typeof rule !== 'string') {
    return res.status(400).json({ error: 'rule (string) required' })
  }
  if (aiMode === 'claude') {
    if (!isClaudeAvailable()) {
      return res.status(503).json({
        error: 'Claude AI is selected but ANTHROPIC_API_KEY is not set. Add it to your .env file and restart the backend.',
      })
    }
    const rules = await claudeInterpretFilterRules(rule)
    if (!rules?.length) {
      return res.status(400).json({
        error: 'Could not interpret this. Try rephrasing, e.g. "Remove all loads with a collection from Leeds", "exclude cancelled loads", "loads with capacity_kg and more than 1000kg".',
      })
    }
    return res.json({ rules })
  }
  const rules = interpretFilterRules(rule)
  if (!rules.length) {
    return res.status(400).json({
      error: 'Could not interpret this. Try rephrasing, e.g. "exclude status = cancelled", "loads with capacity_kg and more than 1000kg".',
    })
  }
  res.json({ rules })
})
