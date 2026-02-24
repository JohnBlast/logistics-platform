/** Price Recommendation — displays min–mid–max range (US6) */
import type { PriceRecommendation as PriceRecType } from '../../lib/jobmarket/types'
import { getFieldLabel, getVehicleTypeLabel } from '../../lib/jobmarket/displayNames'

interface PriceRecommendationProps {
  recommendation: PriceRecType | null
  loading?: boolean
  source?: 'algorithmic' | 'ai'
  explanation?: string
}

export function PriceRecommendation({ recommendation, loading, source, explanation }: PriceRecommendationProps) {
  if (loading) {
    return <p className="text-sm text-[var(--md-text-secondary)]">Loading recommendation…</p>
  }
  if (!recommendation) {
    return null
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">Recommended price range</h4>
        {source === 'ai' && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-purple-100 text-purple-700">AI</span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-[var(--md-text-secondary)]">£{recommendation.min.toFixed(2)}</span>
        <span className="text-lg font-semibold text-primary">£{recommendation.mid.toFixed(2)}</span>
        <span className="text-xs text-[var(--md-text-secondary)]">£{recommendation.max.toFixed(2)}</span>
      </div>
      {recommendation.signals && (
        <p className="text-xs text-[var(--md-text-secondary)]">
          Based on {recommendation.signals.distance_km} km, {getVehicleTypeLabel(recommendation.signals.vehicle_type ?? '')}
          {recommendation.signals.adr_required && `, ${getFieldLabel('adr_required')}`}
          {recommendation.signals.competing_quotes > 0 &&
            `, ${recommendation.signals.competing_quotes} competing quote(s)`}
        </p>
      )}
      {explanation && (
        <p className="text-xs text-purple-700 mt-1">{explanation}</p>
      )}
    </div>
  )
}
