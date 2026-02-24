/** Quote Form — price, vehicle, driver; ADR gate; recommender (US1) */
import { useState, useEffect } from 'react'
import type { JobBoardLoad, Vehicle, Driver, PriceRecommendation } from '../../lib/jobmarket/types'
import { getFieldLabel, getVehicleTypeLabel } from '../../lib/jobmarket/displayNames'
import { PriceRecommendation as PriceRecDisplay } from './PriceRecommendation'
import { QuoteResult, type QuoteSubmitResult } from './QuoteResult'

const API_URL = import.meta.env.VITE_API_URL || ''

interface QuoteFormProps {
  job: JobBoardLoad | null
  vehicles: Vehicle[]
  drivers: Driver[]
  /** Quote result from last submit (controlled by parent so it survives refetches) */
  quoteResult?: QuoteSubmitResult | null
  onDismissQuoteResult?: () => void
  onQuoteResult?: (result: QuoteSubmitResult) => void
  onSubmitted?: () => void
  /** When URL has ?debug=1, parent passes this to record events on the page */
  onDebugLog?: (msg: string, data?: Record<string, unknown>) => void
}

export function QuoteForm({ job, vehicles, drivers, quoteResult, onDismissQuoteResult, onQuoteResult, onSubmitted, onDebugLog }: QuoteFormProps) {
  const [price, setPrice] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [recommendation, setRecommendation] = useState<PriceRecommendation | null>(null)
  const [recLoading, setRecLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedVehicle = vehicles.find((v) => v.vehicle_id === vehicleId)
  const selectedDriver = drivers.find((d) => d.driver_id === driverId)
  const adrMismatch =
    job?.adr_required && selectedDriver && !selectedDriver.has_adr_certification
  const vehicleMismatch =
    job &&
    selectedVehicle &&
    job.required_vehicle_type &&
    selectedVehicle.vehicle_type !== job.required_vehicle_type
  const vehicleOutsideZopa =
    job &&
    selectedVehicle &&
    job.acceptable_vehicle_types &&
    job.acceptable_vehicle_types.length > 0 &&
    !job.acceptable_vehicle_types.includes(selectedVehicle.vehicle_type)
  const priceExceedsBudget =
    job && job.max_budget !== undefined && Number(price) > 0 && Number(price) > job.max_budget
  const canSubmit =
    job &&
    vehicles.length > 0 &&
    drivers.length > 0 &&
    price &&
    Number(price) > 0 &&
    vehicleId &&
    driverId &&
    !adrMismatch

  useEffect(() => {
    if (!job) {
      setRecommendation(null)
      return
    }
    setRecLoading(true)
    const vt = selectedVehicle?.vehicle_type ?? job.required_vehicle_type
    const qs = vt ? `load_id=${job.load_id}&vehicle_type=${vt}` : `load_id=${job.load_id}`
    fetch(`${API_URL}/api/job-market/quotes/recommend?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.recommended_price) {
          setRecommendation({
            min: data.recommended_price.min,
            mid: data.recommended_price.mid,
            max: data.recommended_price.max,
            signals: data.signals,
          })
        } else {
          setRecommendation(null)
        }
      })
      .catch(() => setRecommendation(null))
      .finally(() => setRecLoading(false))
  }, [job?.load_id, selectedVehicle?.vehicle_type, job?.required_vehicle_type])

  const handleSubmit = async () => {
    if (!job || !canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/job-market/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          load_id: job.load_id,
          quoted_price: Number(price),
          vehicle_id: vehicleId,
          driver_id: driverId,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.message || data.error || res.statusText)
        return
      }
      const result: QuoteSubmitResult = {
        quote_id: data.quote_id,
        load_id: data.load_id ?? job.load_id,
        status: data.status,
        eta_to_collection: data.eta_to_collection,
        offered_vehicle_type: data.offered_vehicle_type,
        feedback: data.feedback,
        score_breakdown: data.score_breakdown,
        competing_quotes: data.competing_quotes ?? 0,
      }
      onDebugLog?.('QuoteForm: submit success, calling onQuoteResult then onSubmitted', { load_id: result.load_id, status: result.status })
      onQuoteResult?.(result)
      setPrice('')
      setVehicleId('')
      setDriverId('')
      onSubmitted?.()
      onDebugLog?.('QuoteForm: onSubmitted() called')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!job) {
    onDebugLog?.('QuoteForm: render, no job, return null')
    return null
  }

  if (vehicles.length === 0 || drivers.length === 0) {
    return (
      <div className="rounded border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
        Add vehicles and drivers to your fleet before quoting.
      </div>
    )
  }

  // Show result panel when parent has a result for this job
  if (quoteResult && onDismissQuoteResult) {
    onDebugLog?.('QuoteForm: render, showing QuoteResult', { load_id: quoteResult.load_id, status: quoteResult.status })
    return (
      <QuoteResult
        result={quoteResult}
        onDismiss={onDismissQuoteResult}
      />
    )
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Submit a quote</h4>
      <PriceRecDisplay recommendation={recommendation} loading={recLoading} />
      {adrMismatch && (
        <p className="text-sm text-red-600">
          This job requires ADR certification. Select an ADR-certified driver to quote.
        </p>
      )}
      {vehicleMismatch && !vehicleOutsideZopa && (
        <p className="text-sm text-amber-600">
          This job requests {getVehicleTypeLabel(job.required_vehicle_type!)}. You&apos;re offering{' '}
          {selectedVehicle && getVehicleTypeLabel(selectedVehicle.vehicle_type)}.
        </p>
      )}
      {vehicleOutsideZopa && (
        <p className="text-sm text-red-600">
          {getFieldLabel('vehicle_type')} {selectedVehicle && getVehicleTypeLabel(selectedVehicle.vehicle_type)} is not in the poster&apos;s acceptable types ({job?.acceptable_vehicle_types?.map(getVehicleTypeLabel).join(', ')}). This quote will be rejected.
        </p>
      )}
      {priceExceedsBudget && (
        <p className="text-sm text-red-600">
          Price £{Number(price).toFixed(2)} exceeds the poster&apos;s budget of £{job?.max_budget?.toFixed(2)}. This quote will be rejected.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label>
          <span className="block text-xs text-[var(--md-text-secondary)] mb-1">{getFieldLabel('quoted_price')}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 450"
            className="w-full border border-black/20 rounded px-3 py-2 text-sm"
          />
        </label>
        <label>
          <span className="block text-xs text-[var(--md-text-secondary)] mb-1">{getFieldLabel('vehicle_type')}</span>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="w-full border border-black/20 rounded px-3 py-2 text-sm"
          >
            <option value="">Select vehicle</option>
            {vehicles.map((v) => (
              <option key={v.vehicle_id} value={v.vehicle_id}>
                {getVehicleTypeLabel(v.vehicle_type)} · {v.registration_number} ({v.current_city})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="block text-xs text-[var(--md-text-secondary)] mb-1">{getFieldLabel('name')}</span>
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className="w-full border border-black/20 rounded px-3 py-2 text-sm"
          >
            <option value="">Select driver</option>
            {drivers.map((d) => (
              <option key={d.driver_id} value={d.driver_id}>
                {d.name} {d.has_adr_certification ? '(ADR \u2713)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      {selectedVehicle && (
        <p className="text-xs text-[var(--md-text-secondary)]">
          {getFieldLabel('vehicle_type')}: {getVehicleTypeLabel(selectedVehicle.vehicle_type)}
          {selectedDriver && ` \u00b7 ADR: ${selectedDriver.has_adr_certification ? 'Yes' : 'No'}`}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="px-4 py-2 bg-primary text-white rounded font-medium text-sm hover:bg-primary-dark disabled:opacity-50"
      >
        {submitting ? 'Submitting\u2026' : 'Submit quote'}
      </button>
    </div>
  )
}
