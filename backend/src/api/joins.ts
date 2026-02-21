import { Router } from 'express'
import { claudeInterpretJoin, isClaudeAvailable } from '../services/claudeService.js'
import { SUGGESTED_JOINS } from '../config/mockedConfig.js'

export const joinsRouter = Router()

/** Mock NL interpretation. Parses simple patterns like "join quote to load on load_id" */
function interpretJoinRule(nl: string): Record<string, unknown> | null {
  const t = nl.toLowerCase().trim()
  if (t.includes('quote') && t.includes('load') && (t.includes('load_id') || t.includes('load id') || t.includes('quote.load_id'))) {
    return { ...SUGGESTED_JOINS[0] }
  }
  if (t.includes('load') && (t.includes('driver') || t.includes('vehicle') || t.includes('driver_vehicle'))) {
    const join = { ...SUGGESTED_JOINS[1] }
    if (t.includes('allocated_vehicle_id') || t.includes('allocated_vehicle') || t.includes('vehicle_id') || t.includes('vehicle id')) {
      join.leftKey = 'allocated_vehicle_id'
    }
    if (t.includes('driver_id') || t.includes('driver id') || t.includes('fallback')) {
      join.fallbackKey = 'driver_id'
    }
    return join
  }
  return null
}

joinsRouter.post('/interpret', async (req, res) => {
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
    const structured = await claudeInterpretJoin(rule)
    if (!structured) {
      return res.status(400).json({
        error: 'Claude could not interpret this. Try rephrasing, e.g. "join quotes to loads on load_id" or "join load to driver and vehicle on vehicle_id or driver_id".',
      })
    }
    return res.json({ structured })
  }
  const structured = interpretJoinRule(rule)
  if (!structured) {
    return res.status(400).json({
      error: 'Could not parse. Try: "join quote to load on load_id" or "join load to driver and vehicle on vehicle_id or driver_id"',
    })
  }
  res.json({ structured })
})
