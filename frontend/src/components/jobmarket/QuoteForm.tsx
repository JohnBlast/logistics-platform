/** Quote Form — price, vehicle, driver; ADR gate; recommender (US1) */
import { useState, useEffect } from 'react'
import type { JobBoardLoad, Vehicle, Driver, PriceRecommendation, AiRecommenderStatus } from '../../lib/jobmarket/types'
import { getFieldLabel, getVehicleTypeLabel } from '../../lib/jobmarket/displayNames'
import { PriceRecommendation as PriceRecDisplay } from './PriceRecommendation'
import { QuoteResult, type QuoteSubmitResult } from './QuoteResult'
import { api } from '../../services/api'

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
  type AutoReasoning = { vehicle_reason: string; driver_reason: string; price_reason: string }
  const [price, setPrice] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [recommendation, setRecommendation] = useState<PriceRecommendation | null>(null)
  const [recLoading, setRecLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [autoRecLoading, setAutoRecLoading] = useState(false)
  const [autoFilled, setAutoFilled] = useState(false)
  const [aiAutoReasoning, setAiAutoReasoning] = useState<AutoReasoning | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recommenderMode, setRecommenderMode] = useState<'algorithmic' | 'ai'>('algorithmic')
  const [aiStatus, setAiStatus] = useState<AiRecommenderStatus | null>(null)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [recSource, setRecSource] = useState<'algorithmic' | 'ai'>('algorithmic')
  const [quoteSource, setQuoteSource] = useState<'manual' | 'algorithmic' | 'ai'>('manual')

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
    api.jobmarket.getAiStatus().then(setAiStatus).catch(() => setAiStatus(null))
  }, [])

  useEffect(() => {
    // Always load baseline (algorithmic) recommendation automatically.
    // AI-powered pricing is only applied when the user explicitly clicks Auto-fill.
    if (!job) {
      setRecommendation(null)
      setAiExplanation(null)
      setAiAutoReasoning(null)
      return
    }
    setRecLoading(true)
    setAiExplanation(null)
    setRecSource('algorithmic')
    const vt = selectedVehicle?.vehicle_type ?? job.required_vehicle_type
    api.jobmarket.getRecommendation(job.load_id, vt)
      .then((data) => {
        if (data.recommended_price) {
          setRecommendation({
            min: data.recommended_price.min,
            mid: data.recommended_price.mid,
            max: data.recommended_price.max,
            signals: data.signals as PriceRecommendation['signals'],
          })
        } else {
          setRecommendation(null)
        }
      })
      .catch(() => setRecommendation(null))
      .finally(() => setRecLoading(false))
  }, [job?.load_id, selectedVehicle?.vehicle_type, job?.required_vehicle_type])

  // Reset any AI auto-lock when switching to a different job
  useEffect(() => {
    setAiAutoReasoning(null)
  }, [job?.load_id])

  const handleSubmit = async () => {
    if (!job || !canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      const data = await api.jobmarket.submitQuote({
        load_id: job.load_id,
        quoted_price: Number(price),
        vehicle_id: vehicleId,
        driver_id: driverId,
        quote_source: quoteSource,
      })
      const result: QuoteSubmitResult = {
        quote_id: data.quote_id,
        load_id: data.load_id ?? job.load_id,
        status: data.status,
        eta_to_collection: data.eta_to_collection,
        offered_vehicle_type: data.offered_vehicle_type,
        quoted_price: Number(price),
        feedback: data.feedback,
        score_breakdown: data.score_breakdown,
        competing_quotes: data.competing_quotes ?? 0,
        quote_source: quoteSource,
      }
      onDebugLog?.('QuoteForm: submit success, calling onQuoteResult then onSubmitted', { load_id: result.load_id, status: result.status })
      onQuoteResult?.(result)
      setPrice('')
      setVehicleId('')
      setDriverId('')
      onSubmitted?.()
      onDebugLog?.('QuoteForm: onSubmitted() called')

      // Refresh AI status after each evaluated quote so the unlock counter and availability update.
      api.jobmarket
        .getAiStatus()
        .then(setAiStatus)
        .catch(() => {
          // ignore AI status refresh errors
        })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAutoRecommend = async () => {
    if (!job) return
    setAutoRecLoading(true)
    setError(null)
    setAiAutoReasoning(null)
    const useAi = recommenderMode === 'ai' && aiStatus?.available
    try {
      const result = await api.jobmarket.getAutoRecommendation(job.load_id, useAi)
      setVehicleId(result.vehicle_id)
      setDriverId(result.driver_id)
      setPrice(String(result.quoted_price))
      setQuoteSource(result.quote_source ?? 'algorithmic')
      if (useAi && (result.quote_source ?? 'algorithmic') === 'ai' && result.reasoning) {
        setAiAutoReasoning(result.reasoning as AutoReasoning)
      }
      // Surface AI-specific errors (e.g. not enough quote history) even when we fall back to algorithmic.
      if (useAi && result.ai_error) {
        setError(result.ai_error)
      }
      setAutoFilled(true)
      setTimeout(() => setAutoFilled(false), 2500)
      onDebugLog?.('AutoRecommend applied', {
        vehicle_id: result.vehicle_id,
        driver_id: result.driver_id,
        quoted_price: result.quoted_price,
        quote_source: result.quote_source,
        reasoning: result.reasoning as unknown as Record<string, unknown>,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Auto-recommend failed')
    } finally {
      setAutoRecLoading(false)
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
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Submit a quote</h4>
        <button
          type="button"
          onClick={handleAutoRecommend}
          disabled={autoRecLoading}
          className="px-3 py-1.5 text-xs border border-primary text-primary rounded font-medium hover:bg-primary/8 disabled:opacity-50"
        >
          {autoRecLoading
            ? 'Recommending\u2026'
            : recommenderMode === 'ai' && aiStatus?.available
            ? 'Auto-fill (AI)'
            : 'Auto-fill'}
        </button>
      </div>
      {/* Recommender mode toggle */}
      <div className="flex items-center gap-1 bg-black/4 rounded-full p-0.5 w-fit">
        <button
          type="button"
          onClick={() => setRecommenderMode('algorithmic')}
          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
            recommenderMode === 'algorithmic'
              ? 'bg-white text-[var(--md-text-primary)] shadow-sm'
              : 'text-[var(--md-text-secondary)] hover:text-[var(--md-text-primary)]'
          }`}
        >
          Algorithmic
        </button>
        <button
          type="button"
          onClick={() => aiStatus?.available && setRecommenderMode('ai')}
          disabled={!aiStatus?.available}
          title={
            !aiStatus?.claude_available
              ? 'Claude API key not configured'
              : !aiStatus?.available
              ? `Need ${aiStatus?.required_quotes ?? 5} evaluated quotes (have ${aiStatus?.evaluated_quotes ?? 0})`
              : 'AI-powered recommendation from your quoting history'
          }
          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
            recommenderMode === 'ai'
              ? 'bg-purple-600 text-white shadow-sm'
              : aiStatus?.available
              ? 'text-[var(--md-text-secondary)] hover:text-purple-600'
              : 'text-[var(--md-text-secondary)] opacity-40 cursor-not-allowed'
          }`}
        >
          AI
        </button>
      </div>
      {aiStatus && !aiStatus.available && (
        <p className="text-xs text-amber-700">
          {aiStatus.claude_available
            ? `AI recommender will unlock after ${aiStatus.required_quotes ?? 5} accepted or rejected quotes. You currently have ${aiStatus.evaluated_quotes ?? 0}.`
            : 'AI recommender unavailable: Claude API key is not configured.'}
        </p>
      )}
      {autoFilled && (
        <p className="text-xs text-green-600 font-medium">Fields auto-filled. Review and submit.</p>
      )}
      {recommenderMode === 'ai' && aiAutoReasoning && (
        <div className="rounded bg-purple-50 border border-purple-100 p-2.5">
          <p className="text-xs font-medium text-purple-800 mb-1">Why AI chose this quote</p>
          <ul className="text-xs text-purple-900 list-disc pl-4 space-y-0.5">
            {aiAutoReasoning.vehicle_reason && <li>{aiAutoReasoning.vehicle_reason}</li>}
            {aiAutoReasoning.driver_reason && <li>{aiAutoReasoning.driver_reason}</li>}
            {aiAutoReasoning.price_reason && <li>{aiAutoReasoning.price_reason}</li>}
          </ul>
        </div>
      )}
      <PriceRecDisplay
        recommendation={recommendation}
        loading={recLoading}
        source={recSource}
        explanation={aiExplanation ?? undefined}
      />
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
            onChange={(e) => {
              setPrice(e.target.value)
              setQuoteSource('manual')
            }}
            placeholder="e.g. 450"
            disabled={submitting || autoRecLoading}
            className="w-full border border-black/20 rounded px-3 py-2 text-sm disabled:opacity-50 disabled:bg-black/4"
          />
        </label>
        <label>
          <span className="block text-xs text-[var(--md-text-secondary)] mb-1">{getFieldLabel('vehicle_type')}</span>
          <select
            value={vehicleId}
            onChange={(e) => {
              setVehicleId(e.target.value)
              setQuoteSource('manual')
            }}
            disabled={submitting || autoRecLoading}
            className="w-full border border-black/20 rounded px-3 py-2 text-sm disabled:opacity-50 disabled:bg-black/4"
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
            onChange={(e) => {
              setDriverId(e.target.value)
              setQuoteSource('manual')
            }}
            disabled={submitting || autoRecLoading}
            className="w-full border border-black/20 rounded px-3 py-2 text-sm disabled:opacity-50 disabled:bg-black/4"
          >
            <option value="">Select driver</option>
            {drivers.map((d) => (
              <option key={d.driver_id} value={d.driver_id}>
                {d.name} {d.has_adr_certification ? '(ADR ✓)' : ''}
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
