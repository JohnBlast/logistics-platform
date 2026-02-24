/** Job Board — lists posted loads for Fleet Operator (US1) */
import type { ReactNode } from 'react'
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

function renderCell(col: string, value: unknown): ReactNode {
  switch (col) {
    case 'distance_km':
      return <>{Number(value).toLocaleString()} km</>
    case 'required_vehicle_type':
      return value ? <>{getVehicleTypeLabel(String(value))}</> : <span className="text-black/40">-</span>
    case 'adr_required':
      return value ? (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          ADR
        </span>
      ) : (
        <span className="text-black/40">No</span>
      )
    case 'collection_time':
      return value ? (
        <>
          {new Date(String(value)).toLocaleString(undefined, {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </>
      ) : (
        <span className="text-black/40">-</span>
      )
    case 'max_budget':
      if (value == null || value === '') return <span className="text-black/40">-</span>
      return (
        <span className="font-medium">
          &pound;{Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    case 'quote_count': {
      const count = Number(value)
      if (count === 0) return <span className="text-black/40">0</span>
      const bg =
        count >= 3
          ? 'bg-green-100 text-green-800'
          : count >= 2
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700'
      return (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${bg}`}>
          {count}
        </span>
      )
    }
    default:
      return <>{String(value ?? '')}</>
  }
}

export function JobBoard({ jobs, selectedJobId, onSelectJob, onRefresh }: JobBoardProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded border border-black/12 bg-white p-8 text-center space-y-3">
        <div className="text-3xl opacity-60">&#128203;</div>
        <h3 className="text-lg font-semibold text-[var(--md-text-primary)]">No jobs available</h3>
        <p className="text-sm text-[var(--md-text-secondary)] max-w-sm mx-auto">
          The job board is empty. Generate some jobs to get started, or check back later for new loads.
        </p>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="mt-2 px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark"
          >
            Refresh job board
          </button>
        )}
      </div>
    )
  }

  const rows = jobs.map((j) => ({
    load_id: j.load_id,
    collection_city: j.collection_city,
    delivery_city: j.delivery_city,
    distance_km: j.distance_km,
    required_vehicle_type: j.required_vehicle_type ?? '',
    adr_required: j.adr_required,
    collection_time: j.collection_time ?? '',
    max_budget: j.max_budget ?? '',
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
        renderCell={renderCell}
      />
    </div>
  )
}
