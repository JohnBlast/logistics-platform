/** Job Details — selected job info + map placeholder (US1) */
import type { JobBoardLoad } from '../../lib/jobmarket/types'
import { getFieldLabel, getVehicleTypeLabel } from '../../lib/jobmarket/displayNames'

interface JobDetailsProps {
  job: JobBoardLoad | null
  /** When multiple jobs share the same collection city, pass them here to show prev/next switcher */
  jobsAtSameCity?: JobBoardLoad[]
  onSelectJob?: (loadId: string) => void
  mapSlot?: React.ReactNode
  recommenderSlot?: React.ReactNode
  quoteFormSlot?: React.ReactNode
}

export function JobDetails({
  job,
  jobsAtSameCity,
  onSelectJob,
  mapSlot,
  recommenderSlot,
  quoteFormSlot,
}: JobDetailsProps) {
  if (!job) {
    return (
      <div className="rounded border border-black/12 bg-white p-8 text-center text-[var(--md-text-secondary)]">
        Select a job from the board to view details and submit a quote.
      </div>
    )
  }

  const sameCityList = jobsAtSameCity ?? (job ? [job] : [])
  const hasMultipleAtLocation = sameCityList.length > 1 && onSelectJob
  const currentIndex = Math.max(0, sameCityList.findIndex((j) => j.load_id === job.load_id))
  const goPrev = () => {
    if (currentIndex > 0) onSelectJob?.(sameCityList[currentIndex - 1].load_id)
  }
  const goNext = () => {
    if (currentIndex >= 0 && currentIndex < sameCityList.length - 1) onSelectJob?.(sameCityList[currentIndex + 1].load_id)
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-black/12 bg-white p-4">
        {hasMultipleAtLocation && (
          <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-black/8">
            <span className="text-xs text-[var(--md-text-secondary)]">
              {currentIndex + 1} of {sameCityList.length} at {job.collection_city}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={goPrev}
                disabled={currentIndex <= 0}
                className="p-1.5 rounded text-[var(--md-text-secondary)] hover:bg-black/6 disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Previous job"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={currentIndex >= sameCityList.length - 1}
                className="p-1.5 rounded text-[var(--md-text-secondary)] hover:bg-black/6 disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Next job"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        )}
        <h3 className="text-lg font-semibold mb-3">Job details</h3>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-[var(--md-text-secondary)]">{getFieldLabel('collection_city')}</dt>
          <dd>{job.collection_city}</dd>
          <dt className="text-[var(--md-text-secondary)]">{getFieldLabel('delivery_city')}</dt>
          <dd>{job.delivery_city}</dd>
          <dt className="text-[var(--md-text-secondary)]">{getFieldLabel('distance_km')}</dt>
          <dd>{job.distance_km} km</dd>
          <dt className="text-[var(--md-text-secondary)]">{getFieldLabel('required_vehicle_type')}</dt>
          <dd>{job.required_vehicle_type ? getVehicleTypeLabel(job.required_vehicle_type) : '-'}</dd>
          <dt className="text-[var(--md-text-secondary)]">{getFieldLabel('adr_required')}</dt>
          <dd>{job.adr_required ? 'Yes' : 'No'}</dd>
          <dt className="text-[var(--md-text-secondary)]">{getFieldLabel('collection_time')}</dt>
          <dd>
            {job.collection_time
              ? new Date(job.collection_time).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : '-'}
          </dd>
          {job.max_budget !== undefined && (
            <>
              <dt className="text-[var(--md-text-secondary)]">{getFieldLabel('max_budget')}</dt>
              <dd className="font-medium">£{job.max_budget.toFixed(2)}</dd>
            </>
          )}
          {job.acceptable_vehicle_types && job.acceptable_vehicle_types.length > 0 && (
            <>
              <dt className="text-[var(--md-text-secondary)]">{getFieldLabel('acceptable_vehicle_types')}</dt>
              <dd>{job.acceptable_vehicle_types.map(getVehicleTypeLabel).join(', ')}</dd>
            </>
          )}
          {job.collection_window_minutes !== undefined && (
            <>
              <dt className="text-[var(--md-text-secondary)]">{getFieldLabel('collection_window_minutes')}</dt>
              <dd>±{job.collection_window_minutes} min</dd>
            </>
          )}
        </dl>
      </div>

      {mapSlot && (
        <div className="rounded border border-black/12 bg-white overflow-hidden">
          {mapSlot}
        </div>
      )}

      {recommenderSlot && (
        <div className="rounded border border-black/12 bg-white p-4">
          {recommenderSlot}
        </div>
      )}

      {quoteFormSlot && (
        <div className="rounded border border-black/12 bg-white p-4">
          {quoteFormSlot}
        </div>
      )}
    </div>
  )
}
