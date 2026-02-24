/**
 * Quote acceptance scoring — 4 signals, composite threshold (PRD §16.3, §16.4)
 * Weights: price 0.40, ETA 0.25, fleet_rating 0.15, vehicle_match 0.20
 *
 * ZOPA (Zone of Possible Agreement) gates:
 *   - If load has max_budget and quoted_price > max_budget → instant rejection
 *   - If load has acceptable_vehicle_types and offered vehicle not in list → instant rejection
 *
 * Vehicle match is a gradient:
 *   - Undersized (offered < requested): 0.0 — hard penalty
 *   - Exact match: 1.0
 *   - 1 size up: 0.9 (slightly overspecced)
 *   - 2+ sizes up: decreasing
 *   When acceptable_vehicle_types exists, scoring uses position in that list.
 *
 * ETA scoring considers the collection time window:
 *   - Uses collection_window_minutes as grace period (defaults to 10 min)
 *   - Beyond window, graduated penalty up to 60 min late (score 0.0)
 *
 * Price scoring uses poster's max_budget when available:
 *   - At or below rec.mid → 1.0
 *   - Between rec.mid and max_budget → taper 1.0 to 0.5
 *   - At max_budget → 0.5
 *
 * Threshold: 0.70 (multi-quote), 0.60 (sole bidder)
 */

import {
  getQuote,
  getQuotesByLoad,
  getLoad,
  getFleetProfile,
  updateQuoteStatus,
  updateLoadStatus,
  incrementFleetJobsCompleted,
  setQuoteScoreBreakdown,
  setQuoteFeedback,
} from './jobmarketStore.js'
import type { Quote, VehicleType } from './jobmarketStore.js'
import { recommendPrice } from './recommenderService.js'

const RATE_ORDER: VehicleType[] = [
  'small_van',
  'medium_van',
  'large_van',
  'luton',
  'rigid_7_5t',
  'rigid_18t',
  'rigid_26t',
  'articulated',
]

/**
 * Vehicle match scoring — gradient based on size difference.
 */
function vehicleMatchScore(requested: VehicleType, offered: VehicleType): number {
  const ri = RATE_ORDER.indexOf(requested)
  const oi = RATE_ORDER.indexOf(offered)
  if (ri < 0 || oi < 0) return 0
  if (oi < ri) return 0 // undersized — hard fail
  const diff = oi - ri
  if (diff === 0) return 1.0
  if (diff === 1) return 0.9
  if (diff === 2) return 0.75
  return 0.6 // 3+ sizes too big
}

/**
 * Vehicle match scoring using poster's acceptable_vehicle_types list.
 * First in list = ideal (1.0), subsequent = decreasing.
 */
function vehicleMatchScoreFromAcceptable(
  acceptableTypes: VehicleType[],
  offered: VehicleType
): number {
  const idx = acceptableTypes.indexOf(offered)
  if (idx < 0) return 0 // not in acceptable list — should be caught by ZOPA gate
  if (idx === 0) return 1.0
  if (idx === 1) return 0.85
  return 0.7 // 3rd or later in list
}

export interface ScoreBreakdown {
  price_score: number
  eta_score: number
  fleet_rating_score: number
  vehicle_match: number
  composite_score: number
}

/**
 * Score price against the recommended price range.
 */
function benchmarkPriceScore(quotedPrice: number, recMin: number, recMid: number, recMax: number): number {
  if (quotedPrice <= 0) return 0
  if (quotedPrice < recMin * 0.6) return 0.3
  if (quotedPrice <= recMid) return 1.0
  if (quotedPrice <= recMax) {
    return 1.0 - 0.3 * ((quotedPrice - recMid) / (recMax - recMid))
  }
  const ceiling = recMax * 2.0
  if (quotedPrice <= ceiling) {
    return 0.7 * (1.0 - (quotedPrice - recMax) / (ceiling - recMax))
  }
  return 0
}

/**
 * Score price using poster's max_budget as ceiling, blended with recommender.
 * - At or below rec.mid → 1.0
 * - Between rec.mid and max_budget → taper from 1.0 to 0.5
 * - At max_budget → 0.5 (poster's absolute limit)
 */
function budgetAwarePriceScore(
  quotedPrice: number,
  recMid: number,
  maxBudget: number
): number {
  if (quotedPrice <= 0) return 0
  if (quotedPrice <= recMid) return 1.0
  if (quotedPrice <= maxBudget) {
    // Taper from 1.0 at mid to 0.5 at budget ceiling
    const range = maxBudget - recMid
    if (range <= 0) return 1.0
    return 1.0 - 0.5 * ((quotedPrice - recMid) / range)
  }
  // Above budget — should be caught by ZOPA gate, but score 0 as fallback
  return 0
}

/**
 * ETA scoring based on collection time window.
 * Uses collection_window_minutes as grace period (defaults to 10 min).
 */
function scoreEta(
  etaMinutes: number,
  distanceKm: number,
  collectionTime?: string,
  collectionWindowMinutes?: number
): number {
  if (collectionTime) {
    const collectionDate = new Date(collectionTime)
    if (!isNaN(collectionDate.getTime())) {
      const now = new Date()
      const arrivalTime = new Date(now.getTime() + etaMinutes * 60_000)
      const latenessMinutes = (arrivalTime.getTime() - collectionDate.getTime()) / 60_000

      const grace = collectionWindowMinutes ?? 10

      // Early or within grace period — no penalty
      if (latenessMinutes <= grace) return 1.0
      // Grace to grace+20 min — moderate penalty
      const moderateEnd = grace + 20
      if (latenessMinutes <= moderateEnd) {
        return 1.0 - 0.5 * ((latenessMinutes - grace) / 20)
      }
      // moderateEnd to moderateEnd+30 — heavy penalty
      const heavyEnd = moderateEnd + 30
      if (latenessMinutes <= heavyEnd) {
        return 0.5 - 0.5 * ((latenessMinutes - moderateEnd) / 30)
      }
      // Beyond — score 0
      return 0
    }
  }

  // Fallback: distance-based benchmark
  const reasonableEta = Math.max(distanceKm, 30) // at least 30 min
  if (etaMinutes <= reasonableEta) return 1.0
  const ratio = etaMinutes / reasonableEta
  if (ratio >= 3.0) return 0.0
  return 1.0 - (ratio - 1.0) / 2.0
}

// Signal weights
const W_PRICE = 0.40
const W_ETA = 0.25
const W_RATING = 0.15
const W_VEHICLE = 0.20

function computeComposite(price: number, eta: number, rating: number, vehicle: number): number {
  return price * W_PRICE + eta * W_ETA + rating * W_RATING + vehicle * W_VEHICLE
}

export function scoreAndEvaluate(quoteId: string): {
  accepted: boolean
  breakdown: ScoreBreakdown
  feedback?: string
} | null {
  const quote = getQuote(quoteId)
  if (!quote || quote.status !== 'sent') return null

  const loadOrUndef = getLoad(quote.load_id)
  if (!loadOrUndef) return null
  const load = loadOrUndef // const binding for closure narrowing

  const offeredVehicle = quote.offered_vehicle_type ?? quote.requested_vehicle_type ?? 'rigid_18t'

  // ── ZOPA gates — instant rejection if outside zone ──────────────────────
  if (load.max_budget !== undefined && quote.quoted_price > load.max_budget) {
    console.log(
      `[acceptance] ZOPA gate: quote ${quoteId} price £${quote.quoted_price} exceeds poster budget £${load.max_budget}`
    )
    updateQuoteStatus(quoteId, 'rejected')
    const zeroBreakdown: ScoreBreakdown = {
      price_score: 0,
      eta_score: 0,
      fleet_rating_score: 0,
      vehicle_match: 0,
      composite_score: 0,
    }
    setQuoteScoreBreakdown(quoteId, zeroBreakdown)
    const budgetFeedback = `Your quote of £${quote.quoted_price.toFixed(2)} exceeds the poster's maximum budget of £${load.max_budget.toFixed(2)}. To be considered, your price needs to be at or below £${load.max_budget.toFixed(2)}.`
    setQuoteFeedback(quoteId, budgetFeedback)
    return {
      accepted: false,
      breakdown: zeroBreakdown,
      feedback: budgetFeedback,
    }
  }

  if (
    load.acceptable_vehicle_types &&
    load.acceptable_vehicle_types.length > 0 &&
    !load.acceptable_vehicle_types.includes(offeredVehicle as VehicleType)
  ) {
    console.log(
      `[acceptance] ZOPA gate: quote ${quoteId} vehicle ${offeredVehicle} not in acceptable types [${load.acceptable_vehicle_types.join(',')}]`
    )
    updateQuoteStatus(quoteId, 'rejected')
    const zeroBreakdown: ScoreBreakdown = {
      price_score: 0,
      eta_score: 0,
      fleet_rating_score: 0,
      vehicle_match: 0,
      composite_score: 0,
    }
    setQuoteScoreBreakdown(quoteId, zeroBreakdown)
    const vehicleFeedback = `Your ${offeredVehicle.replace(/_/g, ' ')} is not accepted for this job. The poster only accepts: ${load.acceptable_vehicle_types.map(v => v.replace(/_/g, ' ')).join(', ')}.`
    setQuoteFeedback(quoteId, vehicleFeedback)
    return {
      accepted: false,
      breakdown: zeroBreakdown,
      feedback: vehicleFeedback,
    }
  }

  // ── Scoring ─────────────────────────────────────────────────────────────
  const allQuotes = getQuotesByLoad(load.load_id).filter((q) => q.status === 'sent')
  if (!allQuotes.length) return null

  const isSoleBidder = allQuotes.length === 1

  console.log(
    `[acceptance] Scoring quote ${quoteId} for load ${load.load_id}: ${allQuotes.length} quote(s), mode=${isSoleBidder ? 'benchmark' : 'competitive'}`
  )

  const rec = recommendPrice(load.load_id, load.required_vehicle_type, 3.0)

  const profiles = new Map<string, { rating: number }>()
  for (const q of allQuotes) {
    if (!profiles.has(q.associated_fleet_id)) {
      if (q.associated_fleet_id.startsWith('sim-')) {
        profiles.set(q.associated_fleet_id, { rating: 3.0 })
      } else {
        const p = getFleetProfile()
        profiles.set(q.associated_fleet_id, { rating: p.rating })
      }
    }
  }

  function scoreQuote(q: Quote) {
    // Price scoring: use budget-aware when max_budget exists, else benchmark
    let priceScore: number
    if (load.max_budget !== undefined && rec) {
      priceScore = budgetAwarePriceScore(q.quoted_price, rec.mid, load.max_budget)
    } else if (rec) {
      priceScore = benchmarkPriceScore(q.quoted_price, rec.min, rec.mid, rec.max)
    } else {
      priceScore = 0.7
    }

    // ETA scoring: use collection_window_minutes
    const etaScore = scoreEta(
      q.eta_to_collection ?? 0,
      load.distance_km,
      load.collection_time,
      load.collection_window_minutes
    )

    // Fleet rating
    const profile = profiles.get(q.associated_fleet_id)
    const fleetRatingScore = (profile?.rating ?? 3.0) / 5.0

    // Vehicle match — use acceptable list if available, else gradient
    const offered = q.offered_vehicle_type ?? q.requested_vehicle_type ?? 'rigid_18t'
    let vm: number
    if (load.acceptable_vehicle_types && load.acceptable_vehicle_types.length > 0) {
      vm = vehicleMatchScoreFromAcceptable(load.acceptable_vehicle_types, offered as VehicleType)
    } else {
      vm = vehicleMatchScore(
        load.required_vehicle_type ?? 'rigid_18t',
        offered as VehicleType
      )
    }

    const composite = computeComposite(priceScore, etaScore, fleetRatingScore, vm)

    return {
      quote: q,
      breakdown: {
        price_score: Math.round(priceScore * 10000) / 10000,
        eta_score: Math.round(etaScore * 10000) / 10000,
        fleet_rating_score: Math.round(fleetRatingScore * 10000) / 10000,
        vehicle_match: Math.round(vm * 10000) / 10000,
        composite_score: Math.round(composite * 10000) / 10000,
      },
    }
  }

  let scored: { quote: Quote; breakdown: ScoreBreakdown }[]

  if (isSoleBidder) {
    scored = [scoreQuote(allQuotes[0])]
  } else {
    // Multi-quote: blend benchmark with relative comparison
    const prices = allQuotes.map((q) => q.quoted_price)
    const etas = allQuotes.map((q) => q.eta_to_collection ?? 0)
    const priceMin = Math.min(...prices)
    const priceMax = Math.max(...prices)
    const etaMin = Math.min(...etas)
    const etaMax = Math.max(...etas)
    const priceRange = priceMax - priceMin
    const etaRange = etaMax - etaMin

    scored = allQuotes.map((q) => {
      // Price: blend benchmark/budget with relative position
      let priceScore: number
      if (load.max_budget !== undefined && rec) {
        const benchPrice = budgetAwarePriceScore(q.quoted_price, rec.mid, load.max_budget)
        if (priceRange > 0) {
          const relativePrice = 1.0 - (q.quoted_price - priceMin) / priceRange
          priceScore = benchPrice * 0.6 + relativePrice * 0.4
        } else {
          priceScore = benchPrice
        }
      } else if (rec) {
        const benchPrice = benchmarkPriceScore(q.quoted_price, rec.min, rec.mid, rec.max)
        if (priceRange > 0) {
          const relativePrice = 1.0 - (q.quoted_price - priceMin) / priceRange
          priceScore = benchPrice * 0.6 + relativePrice * 0.4
        } else {
          priceScore = benchPrice
        }
      } else if (priceRange > 0) {
        priceScore = 1.0 - (q.quoted_price - priceMin) / priceRange
      } else {
        priceScore = 0.7
      }

      // ETA: use collection_window_minutes, blend with relative
      const benchEta = scoreEta(
        q.eta_to_collection ?? 0,
        load.distance_km,
        load.collection_time,
        load.collection_window_minutes
      )
      let etaScore: number
      if (etaRange > 0) {
        const relativeEta = 1.0 - ((q.eta_to_collection ?? 0) - etaMin) / etaRange
        etaScore = benchEta * 0.6 + relativeEta * 0.4
      } else {
        etaScore = benchEta
      }

      const profile = profiles.get(q.associated_fleet_id)
      const fleetRatingScore = (profile?.rating ?? 3.0) / 5.0
      const offered = q.offered_vehicle_type ?? q.requested_vehicle_type ?? 'rigid_18t'
      let vm: number
      if (load.acceptable_vehicle_types && load.acceptable_vehicle_types.length > 0) {
        vm = vehicleMatchScoreFromAcceptable(load.acceptable_vehicle_types, offered as VehicleType)
      } else {
        vm = vehicleMatchScore(
          load.required_vehicle_type ?? 'rigid_18t',
          offered as VehicleType
        )
      }

      const composite = computeComposite(priceScore, etaScore, fleetRatingScore, vm)

      return {
        quote: q,
        breakdown: {
          price_score: Math.round(priceScore * 10000) / 10000,
          eta_score: Math.round(etaScore * 10000) / 10000,
          fleet_rating_score: Math.round(fleetRatingScore * 10000) / 10000,
          vehicle_match: Math.round(vm * 10000) / 10000,
          composite_score: Math.round(composite * 10000) / 10000,
        },
      }
    })
  }

  const threshold = isSoleBidder ? 0.60 : 0.70
  const sorted = scored.sort((a, b) => b.breakdown.composite_score - a.breakdown.composite_score)
  const winner = sorted[0]

  for (const s of scored) {
    const b = s.breakdown
    const isThisWinner = s.quote.quote_id === winner.quote.quote_id && winner.breakdown.composite_score >= threshold
    console.log(
      `[acceptance] Quote ${s.quote.quote_id}: price=${b.price_score.toFixed(2)} eta=${b.eta_score.toFixed(2)} rating=${b.fleet_rating_score.toFixed(2)} vehicle=${b.vehicle_match.toFixed(2)} → composite=${b.composite_score.toFixed(4)} (threshold=${threshold}) → ${isThisWinner ? 'ACCEPTED' : 'REJECTED'}`
    )
  }

  const isWinner = winner.quote.quote_id === quoteId

  if (isWinner && winner.breakdown.composite_score >= threshold) {
    setQuoteScoreBreakdown(quoteId, winner.breakdown)
    const pricePct = Math.round(winner.breakdown.price_score * 100)
    const compositePct = Math.round(winner.breakdown.composite_score * 100)
    const acceptFeedback = scored.length === 1
      ? `Congratulations! Your quote was accepted as the sole bid with a score of ${compositePct}%. Your pricing was rated ${pricePct}% competitive.`
      : `Congratulations! Your quote was selected as the best out of ${scored.length} competing bids. You scored ${compositePct}% overall, beating the next closest quote.`
    setQuoteFeedback(quoteId, acceptFeedback)
    updateQuoteStatus(quoteId, 'accepted')
    updateLoadStatus(load.load_id, 'in_transit')
    incrementFleetJobsCompleted()
    for (const s of scored) {
      if (s.quote.quote_id !== quoteId) {
        setQuoteScoreBreakdown(s.quote.quote_id, s.breakdown)
        setQuoteFeedback(s.quote.quote_id, 'Outbid by a better quote')
        updateQuoteStatus(s.quote.quote_id, 'rejected')
      }
    }
    return { accepted: true, breakdown: winner.breakdown, feedback: acceptFeedback }
  }

  updateQuoteStatus(quoteId, 'rejected')
  const myScored = scored.find((s) => s.quote.quote_id === quoteId)
  if (!myScored) return null

  setQuoteScoreBreakdown(quoteId, myScored.breakdown)

  // Build plain English feedback
  const myPct = Math.round(myScored.breakdown.composite_score * 100)
  const threshPct = Math.round(threshold * 100)
  const parts: string[] = []

  if (myScored.breakdown.price_score < 0.5) {
    parts.push('your price was too high compared to other bids')
  } else if (myScored.breakdown.price_score < 0.7) {
    parts.push('your price could be more competitive')
  }
  if (myScored.breakdown.eta_score < 0.5) {
    parts.push('your estimated arrival time was too late')
  }
  if (myScored.breakdown.fleet_rating_score < 0.5) {
    parts.push('your fleet rating needs improvement')
  }
  if (myScored.breakdown.vehicle_match < 0.7) {
    parts.push('your vehicle wasn\'t the ideal match for this load')
  }

  let rejectFeedback: string
  if (!isWinner && winner.breakdown.composite_score >= threshold) {
    const winnerPrice = winner.quote.quoted_price
    const priceDiff = myScored.quote.quoted_price - winnerPrice
    if (priceDiff > 0) {
      rejectFeedback = `Your quote was outbid. The winning bid was £${priceDiff.toFixed(2)} cheaper. You scored ${myPct}% vs the winner's ${Math.round(winner.breakdown.composite_score * 100)}%.`
    } else {
      rejectFeedback = `Your quote was outbid. Despite competitive pricing, the winning bid scored higher overall (${Math.round(winner.breakdown.composite_score * 100)}% vs your ${myPct}%).`
    }
    if (parts.length) {
      rejectFeedback += ` Areas to improve: ${parts.join('; ')}.`
    }
  } else if (parts.length) {
    rejectFeedback = `Your quote scored ${myPct}%, below the ${threshPct}% threshold. Key issues: ${parts.join('; ')}.`
  } else {
    rejectFeedback = `Your quote scored ${myPct}%, just below the ${threshPct}% acceptance threshold. A slightly lower price or faster ETA could push you over.`
  }

  setQuoteFeedback(quoteId, rejectFeedback)

  return {
    accepted: false,
    breakdown: myScored.breakdown,
    feedback: rejectFeedback,
  }
}
