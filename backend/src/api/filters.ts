import { Router } from 'express'
import { interpretFilterRule } from '../services/filterService.js'
import { claudeInterpretFilter } from '../services/claudeService.js'

export const filtersRouter = Router()

filtersRouter.post('/interpret', async (req, res) => {
  const { rule, aiMode } = req.body
  if (!rule || typeof rule !== 'string') {
    return res.status(400).json({ error: 'rule (string) required' })
  }
  let structured
  if (aiMode === 'claude') {
    structured = await claudeInterpretFilter(rule)
  }
  if (!structured) {
    structured = interpretFilterRule(rule)
  }
  if (!structured) {
    return res.status(400).json({ error: 'Could not parse rule. Try: "exclude status = cancelled" or "include status = completed"' })
  }
  res.json({ structured })
})
