/** Quote History — fleet's submitted quotes with acceptance reasoning (US7) */
import { useState } from 'react'
import type { Quote } from '../../lib/jobmarket/types'
import { getFieldLabel, getVehicleTypeLabel } from '../../lib/jobmarket/displayNames'

interface QuoteWithBreakdown extends Quote {
  score_breakdown?: {
    price_score: number
    eta_score: number
    fleet_rating_score: number
    vehicle_match: number
    composite_score: number
  }
  feedback?: string
}

interface QuoteHistoryProps {
  quotes: QuoteWithBreakdown[]
  loading?: boolean
  onRefresh?: () => void
  onDeleteQuote?: (quoteId: string) => void
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.round(score * 100)
  const color =
    score >= 0.7 ? 'bg-green-500' : score >= 0.4 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-16 text-[var(--md-text-secondary)] shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs w-8 text-right font-mono">{pct}%</span>
    </div>
  )
}

export function QuoteHistory({ quotes, loading, onRefresh, onDeleteQuote }: QuoteHistoryProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  if (loading) return <p className="text-[var(--md-text-secondary)]">Loading quotes…</p>

  if (quotes.length === 0) {
    return (
      <div className="rounded border border-black/12 bg-white p-6 text-center">
        <p className="text-[var(--md-text-secondary)]">No quotes submitted yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded border border-black/12 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Quote History</h3>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="text-sm text-primary hover:underline"
          >
            Refresh
          </button>
        )}
      </div>
      <div className="space-y-3">
        {quotes.map((q) => (
          <div
            key={q.quote_id}
            className={`border rounded p-3 text-sm ${
              q.status === 'accepted'
                ? 'border-green-200 bg-green-50/50'
                : q.status === 'rejected'
                ? 'border-red-200 bg-red-50/50'
                : 'border-black/12'
            }`}
          >
            {/* Header row */}
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <span className="font-medium">Load {q.load_id.slice(0, 8)}…</span>
                <span className="ml-2 text-[var(--md-text-secondary)]">
                  £{q.quoted_price.toFixed(2)}
                </span>
                <span className="ml-2">
                  {getVehicleTypeLabel(q.offered_vehicle_type ?? q.requested_vehicle_type ?? '')}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
              {onDeleteQuote && (
                confirmDeleteId === q.quote_id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { onDeleteQuote(q.quote_id); setConfirmDeleteId(null) }}
                      className="px-1.5 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-1.5 py-0.5 text-xs border border-black/20 rounded hover:bg-black/4"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(q.quote_id)}
                  className="text-[var(--md-text-secondary)] hover:text-red-600 p-1"
                  title="Remove quote"
                  aria-label="Remove quote"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
                )
              )}
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  q.status === 'accepted'
                    ? 'bg-green-100 text-green-800'
                    : q.status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {q.status}
              </span>
              </div>
            </div>

            {/* Feedback — the main reasoning */}
            {q.feedback && (
              <p
                className={`mt-1.5 text-xs font-medium ${
                  q.status === 'accepted' ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {q.feedback}
              </p>
            )}

            {/* Score breakdown as visual bars */}
            {q.score_breakdown && (
              <div className="mt-2 space-y-1">
                <ScoreBar label={getFieldLabel('price_score')} score={q.score_breakdown.price_score} />
                <ScoreBar label={getFieldLabel('eta_score')} score={q.score_breakdown.eta_score} />
                <ScoreBar label={getFieldLabel('fleet_rating_score')} score={q.score_breakdown.fleet_rating_score} />
                <ScoreBar label={getFieldLabel('vehicle_match')} score={q.score_breakdown.vehicle_match} />
                <div className="flex items-center gap-2 mt-1 pt-1 border-t border-black/5">
                  <span className="text-xs w-16 font-medium shrink-0">{getFieldLabel('composite_score')}</span>
                  <div className="flex-1 h-2.5 bg-black/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        q.score_breakdown.composite_score >= 0.7
                          ? 'bg-green-600'
                          : q.score_breakdown.composite_score >= 0.5
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.round(q.score_breakdown.composite_score * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs w-8 text-right font-mono font-medium">
                    {Math.round(q.score_breakdown.composite_score * 100)}%
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-[var(--md-text-secondary)] mt-1.5">
              {new Date(q.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
