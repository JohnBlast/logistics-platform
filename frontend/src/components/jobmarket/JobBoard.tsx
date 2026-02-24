/** Job Board — lists posted loads for Fleet Operator (US1) */
import { DataTableWithSearch } from '../DataTableWithSearch'
import type { JobBoardLoad } from '../../lib/jobmarket/types'
import { getFieldLabel, getVehicleTypeLabel } from '../../lib/jobmarket/displayNames'

interface JobBoardProps {
  jobs: JobBoardLoad[]
  selectedJobId: string | null
  onSelectJob: (loadId: string) => void
  onRefresh?: () => void
}

const JOB_COLUMNS = [
  'collection_city',
  'delivery_city',
  'distance_km',
  'required_vehicle_type',
  'adr_required',
  'collection_time',
  'max_budget',
  'quote_count',
] as const

export function JobBoard({ jobs, selectedJobId, onSelectJob, onRefresh }: JobBoardProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded border border-black/12 bg-white p-8 text-center">
        <p className="text-[var(--md-text-secondary)]">No jobs available. Check back later.</p>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="mt-4 px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark"
          >
            Refresh
          </button>
        )}
      </div>
    )
  }

  const rows = jobs.map((j) => ({
    load_id: j.load_id,
    collection_city: j.collection_city,
    delivery_city: j.delivery_city,
    distance_km: `${j.distance_km} km`,
    required_vehicle_type: j.required_vehicle_type ? getVehicleTypeLabel(j.required_vehicle_type) : '-',
    adr_required: j.adr_required ? 'Yes' : 'No',
    collection_time: j.collection_time
      ? new Date(j.collection_time).toLocaleString(undefined, {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : '-',
    max_budget: j.max_budget !== undefined ? `£${j.max_budget.toFixed(2)}` : '-',
    quote_count: j.quote_count ?? 0,
  }))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Job Board</h2>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1.5 text-sm border border-black/20 rounded font-medium hover:bg-black/4"
          >
            Refresh
          </button>
        )}
      </div>
      <DataTableWithSearch
        data={rows}
        maxRows={50}
        pageSize={25}
        searchPlaceholder="Search jobs..."
        columns={[...JOB_COLUMNS]}
        columnLabels={Object.fromEntries(JOB_COLUMNS.map((c) => [c, getFieldLabel(c)]))}
        onRowClick={(row) => onSelectJob(String(row.load_id))}
        selectedRowKey={selectedJobId ?? undefined}
        getRowKey={(row) => String(row.load_id)}
      />
    </div>
  )
}
