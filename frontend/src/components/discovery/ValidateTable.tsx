import { useState } from 'react'
import type { TableFilter } from '../../lib/discovery/types'
import type { QueryResult } from '../../lib/discovery/queryEngine'
import { applyFilters } from '../../lib/discovery/queryEngine'
import { FilterPopover } from './FilterPopover'
import { ActiveFiltersBar } from './ActiveFiltersBar'

interface ValidateTableProps {
  queryResult: QueryResult
  clientFilters: TableFilter[]
  onFiltersChange: (filters: TableFilter[]) => void
}

const MAX_DISPLAY = 500

export function ValidateTable({ queryResult, clientFilters, onFiltersChange }: ValidateTableProps) {
  const { validationRows } = queryResult
  const [popover, setPopover] = useState<{ field: string; header: string; anchor: HTMLElement } | null>(null)

  const filtered = clientFilters.length
    ? applyFilters(validationRows as Record<string, unknown>[], clientFilters)
    : validationRows
  const filteredArr = filtered as Record<string, unknown>[]
  const displayRows = filteredArr.slice(0, MAX_DISPLAY)
  const sampleForFilter = filteredArr.slice(0, 1000)

  if (validationRows.length === 0) {
    return (
      <div className="rounded-lg border border-black/10 overflow-hidden">
        <p className="p-6 text-[rgba(0,0,0,0.6)] text-sm text-center">
          No validation rows (filtered dataset used for output)
        </p>
      </div>
    )
  }

  const headers = Object.keys(validationRows[0] as Record<string, unknown>)

  const getColumnValues = (colId: string): (string | number)[] => {
    return sampleForFilter.map((r) => r[colId]).filter((v) => v != null) as (string | number)[]
  }

  const getSampleNum = (colId: string): number | null => {
    const v = displayRows[0]?.[colId]
    return typeof v === 'number' ? 1 : null
  }

  return (
    <div className="rounded-lg border border-black/10 overflow-hidden">
      {clientFilters.length > 0 && (
        <div className="p-3 border-b border-black/6">
          <ActiveFiltersBar
            filters={clientFilters}
            onRemove={(i) => onFiltersChange(clientFilters.filter((_, ix) => ix !== i))}
            onClearAll={() => onFiltersChange([])}
          />
        </div>
      )}
      {filtered.length > 0 ? (
        <div className="px-4 py-2 bg-black/4 text-sm text-[rgba(0,0,0,0.6)]">
          {clientFilters.length > 0
            ? `${displayRows.length} of ${filtered.length} rows match filters`
            : `${validationRows.length} validation rows`}
          {filtered.length > MAX_DISPLAY && ` (showing first ${MAX_DISPLAY})`}
        </div>
      ) : null}
      {filtered.length === 0 && clientFilters.length > 0 && (
        <p className="p-4 text-sm text-[rgba(0,0,0,0.6)]">No rows match your criteria</p>
      )}
      {displayRows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[rgba(0,0,0,0.06)]">
                {headers.map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-medium text-[rgba(0,0,0,0.87)]">
                    <div className="flex items-center gap-1.5">
                      {h}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPopover({ field: h, header: h, anchor: e.currentTarget })
                        }}
                        className="p-0.5 rounded hover:bg-black/10 text-[rgba(0,0,0,0.5)] hover:text-primary"
                        title="Filter column"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr key={i} className="border-t border-black/6 hover:bg-black/2">
                  {headers.map((h) => (
                    <td key={h} className="px-4 py-2.5 text-[rgba(0,0,0,0.87)]">
                      {String((row as Record<string, unknown>)[h] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {popover && (
        <FilterPopover
          anchorEl={popover.anchor}
          field={popover.field}
          header={popover.header}
          values={getColumnValues(popover.field)}
          sampleNum={getSampleNum(popover.field)}
          onClose={() => setPopover(null)}
          onApply={(f) => {
            onFiltersChange([...clientFilters, f])
            setPopover(null)
          }}
        />
      )}
    </div>
  )
}
