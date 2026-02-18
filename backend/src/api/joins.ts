import { Router } from 'express'
import { claudeInterpretJoin } from '../services/claudeService.js'

export const joinsRouter = Router()

const DEFAULT_JOINS = [
  { name: 'Quote→Load', leftEntity: 'quote', rightEntity: 'load', leftKey: 'load_id', rightKey: 'load_id' },
  { name: 'Load→Driver+Vehicle', leftEntity: 'load', rightEntity: 'driver_vehicle', leftKey: 'allocated_vehicle_id', rightKey: 'vehicle_id', fallbackKey: 'driver_id' },
]

/** Mock NL interpretation. Parses simple patterns like "join quote to load on load_id" */
function interpretJoinRule(nl: string): Record<string, unknown> | null {
  const t = nl.toLowerCase().trim()
  if (t.includes('quote') && t.includes('load') && (t.includes('load_id') || t.includes('load id'))) {
    return { ...DEFAULT_JOINS[0] }
  }
  if (t.includes('load') && (t.includes('driver') || t.includes('vehicle')) && (t.includes('vehicle_id') || t.includes('driver_id'))) {
    return { ...DEFAULT_JOINS[1] }
  }
  return null
}

joinsRouter.post('/interpret', async (req, res) => {
  const { rule, aiMode } = req.body
  if (!rule || typeof rule !== 'string') {
    return res.status(400).json({ error: 'rule (string) required' })
  }
  let structured: Record<string, unknown> | null = null
  if (aiMode === 'claude') {
    structured = await claudeInterpretJoin(rule)
  }
  if (!structured) {
    structured = interpretJoinRule(rule)
  }
  if (!structured) {
    return res.status(400).json({
      error: 'Could not parse. Try: "join quote to load on load_id" or "join load to driver and vehicle on vehicle_id or driver_id"',
    })
  }
  res.json({ structured })
})
