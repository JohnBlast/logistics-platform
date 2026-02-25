import { useState, useMemo, useEffect, useCallback } from 'react'

const DEFAULT_COL_WIDTH = 120
const MIN_COL_WIDTH = 60
const MAX_COL_WIDTH = 400

interface DataTableWithSearchProps {
  data: Record<string, unknown>[]
  maxRows?: number
  pageSize?: number
  searchPlaceholder?: string
  /** Columns whose null/empty cells get warning styling */
  warningFields?: string[]
  /** Column order (default: alphabetical) */
  columns?: string[]
  /** Callback when a row is clicked */
  onRowClick?: (row: Record<string, unknown>) => void
  /** Row key for selection highlight (from getRowKey) */
  selectedRowKey?: string
  /** Extract row key for selection (default: index) */
  getRowKey?: (row: Record<string, unknown>, index: number) => string
  /** Display labels for column headers (field name → label) */
  columnLabels?: Record<string, string>
  /** Custom cell renderer — return ReactNode for rich formatting, or undefined to use default String(val) */
  renderCell?: (col: string, value: unknown, row: Record<string, unknown>) => React.ReactNode
}

export function DataTableWithSearch({
  data,
  maxRows: _maxRows = 50,
  pageSize = 25,
  searchPlaceholder = 'Search...',
  warningFields,
  columns: columnsProp,
  onRowClick,
  selectedRowKey,
  getRowKey = (_, i) => String(i),
  columnLabels,
  renderCell,
}: DataTableWithSearchProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [colWidths, setColWidths] = useState<Record<string, number>>({})
  const [resizing, setResizing] = useState<{ col: string; startX: number; startW: number } | null>(null)

  const allCols = [...new Set(data.flatMap((r) => Object.keys(r)))]
  const cols =
    columnsProp && columnsProp.length > 0
      ? [...columnsProp.filter((c) => allCols.includes(c)), ...allCols.filter((c) => !columnsProp.includes(c))]
      : allCols.sort()

  const getWidth = useCallback((col: string) => colWidths[col] ?? DEFAULT_COL_WIDTH, [colWidths])

  useEffect(() => {
    if (!resizing) return
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - resizing.startX
      const newW = Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, resizing.startW + delta))
      setColWidths((w) => ({ ...w, [resizing.col]: newW }))
    }
    const onUp = () => setResizing(null)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [resizing])

  useEffect(() => {
    if (resizing) {
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [resizing])
  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter((row) =>
      Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q))
    )
  }, [data, search])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages - 1)

  useEffect(() => {
    setPage(0)
  }, [data])
  const start = currentPage * pageSize
  const displayRows = filtered.slice(start, start + pageSize)

  const goToPage = (p: number) => {
    setPage(Math.max(0, Math.min(p, totalPages - 1)))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          className="border border-black/20 rounded px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {filtered.length > pageSize && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="px-3 py-1.5 text-sm border border-black/20 rounded font-medium hover:bg-black/4 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-[rgba(0,0,0,0.87)]">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1.5 text-sm border border-black/20 rounded font-medium hover:bg-black/4 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto rounded border border-black/12">
        <table className="min-w-full text-sm table-fixed">
          <colgroup>
            {cols.map((c) => (
              <col key={c} style={{ width: getWidth(c), minWidth: getWidth(c) }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-black/4">
              {cols.map((c) => (
                <th
                  key={c}
                  className="relative px-2 py-1.5 text-left font-medium select-none"
                  style={{ width: getWidth(c), minWidth: getWidth(c) }}
                >
                  <span className="truncate block">{columnLabels?.[c] ?? c}</span>
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-primary/20 -mr-px"
                    onMouseDown={(e) => {
                    e.preventDefault()
                    setResizing({ col: c, startX: e.clientX, startW: getWidth(c) })
                  }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => {
              const rowKey = getRowKey(row, start + i)
              const isSelected = selectedRowKey != null && rowKey === selectedRowKey
              return (
              <tr
                key={rowKey}
                className={`border-t transition-colors duration-100 ${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'bg-primary/8' : 'hover:bg-black/4'}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {cols.map((c) => {
                  const val = row[c]
                  const isWarning = warningFields?.includes(c) && (val == null || val === '')
                  return (
                    <td
                      key={c}
                      className={`px-2 py-1 truncate ${isWarning ? 'bg-amber-50 text-amber-800' : ''}`}
                      title={String(val ?? '')}
                    >
                      {renderCell ? renderCell(c, val, row) : String(val ?? '')}
                    </td>
                  )
                })}
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[rgba(0,0,0,0.6)]">
        Showing {filtered.length === 0 ? 0 : start + 1}–{start + displayRows.length} of {filtered.length} rows
        {search && ` (filtered from ${data.length})`}
      </p>
    </div>
  )
}
