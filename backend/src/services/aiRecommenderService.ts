/**
 * AI-powered price recommender — learns from the fleet's quoting history.
 * Uses Claude Haiku to analyze past outcomes and recommend optimal prices.
 * Falls back to the algorithmic recommender if Claude is unavailable or history is insufficient.
 */

import Anthropic from '@anthropic-ai/sdk'
import { isClaudeAvailable } from './claudeService.js'
import {
  getLoad,
  getQuotesByFleet,
  getDefaultFleetId,
  getQuoteScoreBreakdown,
  getQuoteFeedback,
  getQuoteCountForLoad,
} from './jobmarketStore.js'
import type { VehicleType } from './jobmarketStore.js'
import { recommendPrice } from './recommenderService.js'

const MIN_EVALUATED_QUOTES = 5
const MAX_HISTORY_QUOTES = 20

export interface AiRecommendationResult {
  min: number
  mid: number
  max: number
  explanation: string
  historical_quotes_used: number
  source: 'ai' | 'algorithmic_fallback'
  signals: {
    distance_km: number
    vehicle_type: string
    adr_required: boolean
    competing_quotes: number
    fleet_rating: number
  }
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start < 0) return null
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    if (text[i] === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function getClient(): Anthropic | null {
  return process.env.ANTHROPIC_API_KEY ? new Anthropic() : null
}

export function getEvaluatedQuoteCount(): number {
  const fleetId = getDefaultFleetId()
  const quotes = getQuotesByFleet(fleetId)
  const evaluated = quotes.filter((q) => q.status === 'accepted' || q.status === 'rejected')
  console.log(`[ai-recommend] Evaluated quote count for fleet ${fleetId}: ${evaluated.length} (total fleet quotes: ${quotes.length})`)
  return evaluated.length
}

export async function aiRecommendPrice(
  loadId: string,
  vehicleType?: VehicleType
): Promise<AiRecommendationResult | { error: string }> {
  if (!isClaudeAvailable()) {
    return { error: 'Claude API not available. Set ANTHROPIC_API_KEY to enable AI recommendations.' }
  }

  const client = getClient()
  if (!client) {
    return { error: 'Claude client unavailable' }
  }

  const load = getLoad(loadId)
  if (!load) {
    return { error: 'Load not found' }
  }

  // Get evaluated quotes for the user's fleet
  const fleetQuotes = getQuotesByFleet(getDefaultFleetId())
  const evaluatedQuotes = fleetQuotes.filter(
    (q) => q.status === 'accepted' || q.status === 'rejected'
  )

  if (evaluatedQuotes.length < MIN_EVALUATED_QUOTES) {
    return {
      error: `Not enough quote history. Need ${MIN_EVALUATED_QUOTES}+ evaluated quotes (have ${evaluatedQuotes.length}). Submit more quotes to enable AI recommendations.`,
    }
  }

  // Get algorithmic baseline for reference
  const vt = vehicleType ?? load.required_vehicle_type ?? 'rigid_18t'
  const algoRec = recommendPrice(loadId, vt)

  // Build historical context (most recent first, capped)
  const history = evaluatedQuotes.slice(0, MAX_HISTORY_QUOTES).map((q) => {
    const breakdown = getQuoteScoreBreakdown(q.quote_id)
    const feedback = getQuoteFeedback(q.quote_id)
    const qLoad = getLoad(q.load_id)
    return {
      quoted_price: q.quoted_price,
      distance_km: q.distance_km ?? qLoad?.distance_km,
      vehicle_type: q.offered_vehicle_type ?? q.requested_vehicle_type,
      adr_required: q.adr_certified ?? false,
      eta_minutes: q.eta_to_collection,
      outcome: q.status,
      composite_score: breakdown?.composite_score,
      price_score: breakdown?.price_score,
      feedback: feedback ?? undefined,
      collection_city: qLoad?.collection_city,
      delivery_city: qLoad?.delivery_city,
    }
  })

  const competingQuotes = getQuoteCountForLoad(loadId)

  const systemPrompt = `You are a UK logistics pricing analyst. You help fleet operators price their quotes optimally based on their quoting history.

SCORING SYSTEM:
- Quotes are scored on 4 weighted signals: price (40%), ETA (25%), fleet_rating (15%), vehicle_match (20%)
- Acceptance thresholds: sole bidder ≥ 0.60, multiple quotes ≥ 0.70
- Lower prices score better on the price signal (scored relative to budget and competitors)
- The price_score in history shows how well each price performed

YOUR TASK:
Analyze the fleet's quoting history to identify pricing patterns — what prices got accepted vs rejected, and how price_score relates to the quoted amounts.
Then recommend a price for the new job that balances acceptance probability with profitability.

RESPOND WITH ONLY a JSON object:
{ "min": 265.38, "mid": 312.50, "max": 375.00, "explanation": "1-2 sentences" }
- min, mid, max MUST be plain numbers with NO currency symbols (no £ or $ signs). Correct: "min": 265.38 — Wrong: "min": £265.38
- mid: your best recommended price (optimizes for acceptance)
- min: aggressive/competitive lower bound
- max: comfortable upper bound that should still be accepted
- explanation: brief reasoning referencing patterns from their history

IMPORTANT STYLE:
- When explaining your reasoning, use natural, user-facing labels instead of internal field names.
- For example, say "distance" (km), "vehicle type", "ADR required", "number of competing quotes", and "fleet rating" instead of "distance_km", "vehicle_type", "adr_required", "competing_quotes", or "fleet_rating".
- Do not mention column names, JSON keys, or schema field identifiers in your explanation. Focus on the business concepts (route, distance, vehicle, ADR, budget, competing quotes, historical outcomes).`

  const userPrompt = `NEW JOB TO PRICE:
- Route: ${load.collection_city} → ${load.delivery_city}
- Distance: ${load.distance_km} km
- Required vehicle: ${load.required_vehicle_type ?? 'any'}
- ADR required: ${load.adr_required ? 'Yes' : 'No'}
- Max budget: ${load.max_budget !== undefined ? `£${load.max_budget.toFixed(2)}` : 'Not disclosed'}
- Competing quotes on this job: ${competingQuotes}

ALGORITHMIC BASELINE (rule-based formula):
- Min: £${algoRec?.min.toFixed(2) ?? 'N/A'}
- Mid: £${algoRec?.mid.toFixed(2) ?? 'N/A'}
- Max: £${algoRec?.max.toFixed(2) ?? 'N/A'}

FLEET'S QUOTING HISTORY (${history.length} most recent evaluated quotes):
${history
  .map(
    (h, i) =>
      `${i + 1}. ${h.collection_city}→${h.delivery_city} | ${h.distance_km}km | ${h.vehicle_type} | £${h.quoted_price.toFixed(2)} | ${h.outcome.toUpperCase()} | composite=${h.composite_score?.toFixed(2) ?? '?'} price_score=${h.price_score?.toFixed(2) ?? '?'}${h.feedback ? ` | "${h.feedback}"` : ''}`
  )
  .join('\n')}`

  try {
    console.log(`[ai-recommend] Requesting AI recommendation for load ${loadId} with ${history.length} historical quotes`)

    let msg: Anthropic.Message
    try {
      msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt,
      })
    } catch (firstErr: unknown) {
      // Retry once on rate-limit (429) or overloaded (529) after a short delay
      const status = firstErr instanceof Error && 'status' in firstErr ? (firstErr as any).status : undefined
      if (status === 429 || status === 529) {
        console.log(`[ai-recommend] Retrying after ${status} (1.5s backoff)`)
        await new Promise((r) => setTimeout(r, 1500))
        msg = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          messages: [{ role: 'user', content: userPrompt }],
          system: systemPrompt,
        })
      } else {
        throw firstErr
      }
    }

    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const rawJson = extractJsonObject(text)
    if (!rawJson) {
      console.log(`[ai-recommend] Failed to parse JSON from Claude response, falling back to algorithmic`)
      return { error: 'AI response could not be parsed. Falling back to algorithmic recommendation.' }
    }

    // Strip currency symbols that Claude sometimes puts in numeric values (e.g. "min": £265.38)
    const jsonStr = rawJson.replace(/:\s*[£$€]\s*(\d)/g, ': $1')

    const parsed = JSON.parse(jsonStr) as { min?: number; mid?: number; max?: number; explanation?: string }

    if (typeof parsed.mid !== 'number' || parsed.mid <= 0) {
      console.log(`[ai-recommend] Invalid mid price from Claude, falling back to algorithmic`)
      return { error: 'AI returned an invalid price. Falling back to algorithmic recommendation.' }
    }

    const mid = Math.round((parsed.mid ?? 0) * 100) / 100
    const min = Math.round((parsed.min ?? mid * 0.85) * 100) / 100
    const max = Math.round((parsed.max ?? mid * 1.15) * 100) / 100
    const explanation = parsed.explanation ?? 'AI-recommended price based on your quoting history'

    console.log(`[ai-recommend] AI recommendation for load ${loadId}: £${min}–£${mid}–£${max} (${explanation})`)

    return {
      min,
      mid,
      max,
      explanation,
      historical_quotes_used: history.length,
      source: 'ai' as const,
      signals: {
        distance_km: load.distance_km,
        vehicle_type: vt,
        adr_required: load.adr_required,
        competing_quotes: competingQuotes,
        fleet_rating: algoRec?.signals.fleet_rating ?? 3.0,
      },
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    const status = err instanceof Error && 'status' in err ? (err as any).status : undefined
    const errDetails = status ? ` (status: ${status})` : ''
    console.log(`[ai-recommend] Claude API error${errDetails}, falling back to algorithmic: ${errMsg}`)
    const reason = status === 429
      ? 'Rate limited by Claude API'
      : status === 401
      ? 'Invalid API key'
      : status === 529
      ? 'Claude API overloaded'
      : errMsg.length > 120
      ? errMsg.slice(0, 120) + '…'
      : errMsg
    return { error: `Claude API error: ${reason}` }
  }
}

