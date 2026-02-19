import { Router } from 'express'
import { interpretFilterRule } from '../services/filterService.js'
import { claudeInterpretFilter, isClaudeAvailable } from '../services/claudeService.js'

export const filtersRouter = Router()

filtersRouter.post('/interpret', async (req, res) => {
  const { rule, aiMode } = req.body
  if (!rule || typeof rule !== 'string') {
    return res.status(400).json({ error: 'rule (string) required' })
  }
  // Natural language always uses Claude when available (no structured parse forced)
  if (isClaudeAvailable()) {
    const structured = await claudeInterpretFilter(rule)
    if (!structured) {
      return res.status(400).json({
        error: 'Could not interpret this. Try rephrasing, e.g. "Remove all loads with a collection from Leeds", "exclude cancelled loads", or "include only completed quotes".',
      })
    }
    return res.json({ structured })
  }
  // Fallback: simple pattern parser when no API key
  const structured = interpretFilterRule(rule)
  if (!structured) {
    return res.status(503).json({
      error: 'Natural language filtering requires ANTHROPIC_API_KEY. Add it to .env and restart, or use a simple format: "exclude status = cancelled"',
    })
  }
  res.json({ structured })
})
