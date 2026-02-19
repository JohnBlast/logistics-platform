import { useState, useMemo } from 'react'

interface DataTableWithSearchProps {
  data: Record<string, unknown>[]
  maxRows?: number
  searchPlaceholder?: string
  /** Columns whose null/empty cells get warning styling */
  warningFields?: string[]
}

export function DataTableWithSearch({ data, maxRows = 50, searchPlaceholder = 'Search...', warningFields }: DataTableWithSearchProps) {
  const [search, setSearch] = useState('')
  const cols = [...new Set(data.flatMap((r) => Object.keys(r)))].sort()
  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter((row) =>
      Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q))
    )
  }, [data, search])
  const displayRows = filtered.slice(0, maxRows)

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border border-black/20 rounded px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="overflow-x-auto rounded border border-black/12">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-black/4">
              {cols.map((c) => (
                <th key={c} className="px-2 py-1.5 text-left font-medium">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i} className="border-t hover:bg-black/4">
                {cols.map((c) => {
                  const val = row[c]
                  const isWarning = warningFields?.includes(c) && (val == null || val === '')
                  return (
                    <td
                      key={c}
                      className={`px-2 py-1 truncate max-w-[140px] ${isWarning ? 'bg-amber-50 text-amber-800' : ''}`}
                      title={String(val ?? '')}
                    >
                      {String(val ?? '')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[rgba(0,0,0,0.6)]">
        Showing {displayRows.length} of {filtered.length} rows
        {search && ` (filtered from ${data.length})`}
      </p>
    </div>
  )
}
