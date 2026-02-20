import { useState } from 'react'
import { DataTableWithSearch } from './DataTableWithSearch'

export type DataViewKey = 'flat' | 'quote' | 'load' | 'vehicle_driver'

export interface PipelineOutputs {
  flatRows: Record<string, unknown>[]
  quoteRows: Record<string, unknown>[]
  loadRows: Record<string, unknown>[]
  vehicleDriverRows: Record<string, unknown>[]
}

const VIEW_LABELS: Record<DataViewKey, string> = {
  flat: 'Combined',
  quote: 'Quote',
  load: 'Load',
  vehicle_driver: 'Vehicle+Driver',
}

interface PipelineDataTabsProps {
  outputs: PipelineOutputs
  maxRows?: number
  searchPlaceholder?: string
  warningFields?: string[]
  /** Optional prefix for section title */
  title?: string
}

export function PipelineDataTabs({ outputs, maxRows = 50, searchPlaceholder = 'Search...', warningFields, title }: PipelineDataTabsProps) {
  const [activeView, setActiveView] = useState<DataViewKey>('flat')

  const rows = {
    flat: outputs.flatRows,
    quote: outputs.quoteRows,
    load: outputs.loadRows,
    vehicle_driver: outputs.vehicleDriverRows,
  }[activeView]

  const counts = {
    flat: outputs.flatRows.length,
    quote: outputs.quoteRows.length,
    load: outputs.loadRows.length,
    vehicle_driver: outputs.vehicleDriverRows.length,
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
          {title && <h3 className="font-medium">{title}</h3>}
          {(Object.keys(VIEW_LABELS) as DataViewKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveView(key)}
              className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                activeView === key
                  ? 'bg-primary text-white'
                  : 'bg-black/8 text-[rgba(0,0,0,0.87)] hover:bg-black/12'
              } ${counts[key] === 0 ? 'opacity-60' : ''}`}
            >
              {VIEW_LABELS[key]} ({counts[key]})
            </button>
          ))}
        </div>
      {rows.length > 0 ? (
        <DataTableWithSearch
          data={rows}
          maxRows={maxRows}
          searchPlaceholder={searchPlaceholder}
          warningFields={warningFields}
        />
      ) : (
        <div className="border border-black/12 rounded-lg p-6 text-[rgba(0,0,0,0.6)] text-sm">
          No {VIEW_LABELS[activeView]} rows.
        </div>
      )}
    </div>
  )
}
