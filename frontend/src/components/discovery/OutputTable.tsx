import { useState, useRef } from 'react'
import type { TableInstruction, TableFilter } from '../../lib/discovery/types'
import type { QueryResult } from '../../lib/discovery/queryEngine'
import { formatRow, applyFilters } from '../../lib/discovery/queryEngine'
import { FilterPopover } from './FilterPopover'
import { ActiveFiltersBar } from './ActiveFiltersBar'

interface OutputTableProps {
  queryResult: QueryResult
  tableInstruction: TableInstruction
  clientFilters: TableFilter[]
  onFiltersChange: (filters: TableFilter[]) => void
}

export function OutputTable({ queryResult, tableInstruction, clientFilters, onFiltersChange }: OutputTableProps) {
  const { rows, truncated, totalRows } = queryResult
  const tiColumns = tableInstruction.columns ?? []
  const formatByCol = Object.fromEntries(tiColumns.filter((c) => c.format).map((c) => [c.id, c.format!]))
  const headerByCol = Object.fromEntries(tiColumns.map((c) => [c.id, c.header]))
  const keysFromRows = rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : []
  const allKeys = [...new Set([...tiColumns.map((c) => c.id), ...keysFromRows])]
  const columns = allKeys.map((id) => ({
    id,
    header: headerByCol[id] ?? id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    format: formatByCol[id],
  }))
  const [popover, setPopover] = useState<{ field: string; header: string; anchor: HTMLElement } | null>(null)
  const filterIconRefs = useRef<Record<string, HTMLElement>>({})

  const filteredRows = clientFilters.length ? applyFilters(rows as Record<string, unknown>[], clientFilters) : rows
  const displayRows = filteredRows as Record<string, unknown>[]
  const formatted = displayRows.map((r) => formatRow(r, columns))

  const getColumnValues = (colId: string): (string | number)[] => {
    return displayRows.map((r) => r[colId]).filter((v) => v != null) as (string | number)[]
  }

  const getSampleNum = (colId: string): number | null => {
    const v = displayRows[0]?.[colId]
    return typeof v === 'number' ? 1 : null
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-black/10 overflow-hidden">
        <p className="p-6 text-[rgba(0,0,0,0.6)] text-sm text-center">
          No rows match your criteria
        </p>
      </div>
    )
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
      {(truncated || totalRows > rows.length) && clientFilters.length === 0 && (
        <div className="px-4 py-2 bg-black/4 text-sm text-[rgba(0,0,0,0.6)]">
          Showing first {rows.length} of {totalRows} rows
        </div>
      )}
      {clientFilters.length > 0 && (
        <div className="px-4 py-2 bg-black/4 text-sm text-[rgba(0,0,0,0.6)]">
          {displayRows.length} of {rows.length} rows match filters
        </div>
      )}
      {displayRows.length === 0 && clientFilters.length > 0 && (
        <p className="p-4 text-sm text-[rgba(0,0,0,0.6)]">No rows match your criteria</p>
      )}
      {displayRows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[rgba(0,0,0,0.06)]">
                {columns.map((col) => (
                  <th key={col.id} className="px-4 py-2.5 text-left font-medium text-[rgba(0,0,0,0.87)]">
                    <div className="flex items-center gap-1.5">
                      {col.header}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPopover({ field: col.id, header: col.header, anchor: e.currentTarget })
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
              {formatted.map((row, i) => (
                <tr key={i} className="border-t border-black/6 hover:bg-black/2">
                  {columns.map((col) => (
                    <td key={col.id} className="px-4 py-2.5 text-[rgba(0,0,0,0.87)]">
                      {row[col.id] ?? ''}
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
