/** Price Recommendation — displays min–mid–max range (US6) */
import type { PriceRecommendation as PriceRecType } from '../../lib/jobmarket/types'
import { getFieldLabel, getVehicleTypeLabel } from '../../lib/jobmarket/displayNames'

interface PriceRecommendationProps {
  recommendation: PriceRecType | null
  loading?: boolean
}

export function PriceRecommendation({ recommendation, loading }: PriceRecommendationProps) {
  if (loading) {
    return <p className="text-sm text-[var(--md-text-secondary)]">Loading recommendation…</p>
  }
  if (!recommendation) {
    return null
  }

  return (
    <div className="space-y-1">
      <h4 className="text-sm font-medium">Recommended price range</h4>
      <p className="text-lg font-semibold text-primary">
        £{recommendation.min.toFixed(2)} – £{recommendation.max.toFixed(2)}
      </p>
      {recommendation.signals && (
        <p className="text-xs text-[var(--md-text-secondary)]">
          Based on {recommendation.signals.distance_km} km, {getVehicleTypeLabel(recommendation.signals.vehicle_type ?? '')}
          {recommendation.signals.adr_required && `, ${getFieldLabel('adr_required')}`}
          {recommendation.signals.competing_quotes > 0 &&
            `, ${recommendation.signals.competing_quotes} competing quote(s)`}
        </p>
      )}
    </div>
  )
}
