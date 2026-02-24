/** QuoteResult — plain English explanation + competing quotes reveal (US7) */
import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { getFieldLabel, getVehicleTypeLabel } from '../../lib/jobmarket/displayNames'
import type { ScoreBreakdown } from '../../lib/jobmarket/types'

interface CompetingQuote {
  quote_id: string
  fleet_quoter_name: string
  quoted_price: number
  offered_vehicle_type: string
  eta_to_collection: number
  status: string
  adr_certified: boolean
  score_breakdown?: ScoreBreakdown
}

export interface QuoteSubmitResult {
  quote_id: string
  load_id: string
  status: string
  eta_to_collection: number
  offered_vehicle_type: string
  feedback?: string
  score_breakdown?: ScoreBreakdown
  competing_quotes: number
}

interface QuoteResultProps {
  result: QuoteSubmitResult
  onDismiss: () => void
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.round(score * 100)
  const color =
    score >= 0.7 ? 'bg-green-500' : score >= 0.4 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-20 text-[var(--md-text-secondary)] shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-black/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs w-8 text-right font-mono">{pct}%</span>
    </div>
  )
}

export function QuoteResult({ result, onDismiss }: QuoteResultProps) {
  const [competitors, setCompetitors] = useState<CompetingQuote[]>([])
  const [maxBudget, setMaxBudget] = useState<number | undefined>()
  const [loadingCompetitors, setLoadingCompetitors] = useState(true)

  const accepted = result.status === 'accepted'

  useEffect(() => {
    api.jobmarket
      .getLoadQuotes(result.load_id)
      .then((data) => {
        // Filter out our own quote
        setCompetitors(data.quotes.filter((q) => q.quote_id !== result.quote_id))
        setMaxBudget(data.max_budget)
      })
      .catch(() => setCompetitors([]))
      .finally(() => setLoadingCompetitors(false))
  }, [result.load_id, result.quote_id])

  return (
    <div
      className={`rounded border-2 p-4 space-y-4 ${
        accepted
          ? 'border-green-300 bg-green-50/60'
          : 'border-red-300 bg-red-50/60'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-2xl`}>{accepted ? '\u2705' : '\u274c'}</span>
          <div>
            <h4 className="font-semibold text-base">
              Quote {accepted ? 'Accepted' : 'Rejected'}
            </h4>
            <p className="text-xs text-[var(--md-text-secondary)]">
              {result.competing_quotes} other quote{result.competing_quotes !== 1 ? 's' : ''} on this job
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-sm text-[var(--md-text-secondary)] hover:text-[var(--md-text-primary)]"
        >
          Dismiss
        </button>
      </div>

      {/* Plain English feedback */}
      {result.feedback && (
        <p className={`text-sm leading-relaxed ${accepted ? 'text-green-800' : 'text-red-800'}`}>
          {result.feedback}
        </p>
      )}

      {/* Score breakdown */}
      {result.score_breakdown && (
        <div className="space-y-1.5 bg-white/60 rounded p-3">
          <p className="text-xs font-medium text-[var(--md-text-secondary)] mb-1">Your score breakdown</p>
          <ScoreBar label={getFieldLabel('price_score')} score={result.score_breakdown.price_score} />
          <ScoreBar label={getFieldLabel('eta_score')} score={result.score_breakdown.eta_score} />
          <ScoreBar label={getFieldLabel('fleet_rating_score')} score={result.score_breakdown.fleet_rating_score} />
          <ScoreBar label={getFieldLabel('vehicle_match')} score={result.score_breakdown.vehicle_match} />
          <div className="flex items-center gap-2 mt-1 pt-1 border-t border-black/5">
            <span className="text-xs w-20 font-semibold shrink-0">{getFieldLabel('composite_score')}</span>
            <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  result.score_breakdown.composite_score >= 0.7
                    ? 'bg-green-600'
                    : result.score_breakdown.composite_score >= 0.5
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.round(result.score_breakdown.composite_score * 100)}%` }}
              />
            </div>
            <span className="text-xs w-8 text-right font-mono font-semibold">
              {Math.round(result.score_breakdown.composite_score * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Competing quotes */}
      {loadingCompetitors ? (
        <p className="text-xs text-[var(--md-text-secondary)]">Loading competing quotes...</p>
      ) : competitors.length > 0 ? (
        <div className="bg-white/60 rounded p-3">
          <p className="text-xs font-medium text-[var(--md-text-secondary)] mb-2">
            Other quotes on this job
            {maxBudget !== undefined && (
              <span className="ml-1">(poster budget: £{maxBudget.toFixed(2)})</span>
            )}
          </p>
          <div className="space-y-1.5">
            {competitors.map((c) => (
              <div
                key={c.quote_id}
                className={`flex items-center justify-between text-xs py-1.5 px-2 rounded ${
                  c.status === 'accepted'
                    ? 'bg-green-100/80'
                    : c.status === 'rejected'
                    ? 'bg-red-50/80'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.fleet_quoter_name}</span>
                  <span className="text-[var(--md-text-secondary)]">
                    {c.offered_vehicle_type ? getVehicleTypeLabel(c.offered_vehicle_type) : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium">£{c.quoted_price.toFixed(2)}</span>
                  <span className="text-[var(--md-text-secondary)]">
                    {c.eta_to_collection} min ETA
                  </span>
                  {c.score_breakdown && (
                    <span className="font-mono text-[var(--md-text-secondary)]">
                      {Math.round(c.score_breakdown.composite_score * 100)}%
                    </span>
                  )}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      c.status === 'accepted'
                        ? 'bg-green-200 text-green-800'
                        : c.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
