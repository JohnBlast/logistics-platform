import { useState, useEffect } from 'react'
import { api } from '../services/api'

interface ValidationSummary {
  rowsSuccessful: number
  rowsDropped: number
  fieldsWithWarnings: string[]
  dedupWarnings?: string[]
  filterFieldWarnings?: string[]
  flatRows: Record<string, unknown>[]
  cellsWithWarnings?: number
  nullOrErrorFields?: string[]
}

interface ValidationProps {
  profileId: string
  sessionData: {
    quote?: { headers: string[]; rows: Record<string, unknown>[] }
    load?: { headers: string[]; rows: Record<string, unknown>[] }
    driver_vehicle?: { headers: string[]; rows: Record<string, unknown>[] }
  }
  onSave: () => void
  onSummaryChange?: (summary: ValidationSummary | null) => void
  saveDisabledByReRun?: boolean
}

const PAGE_SIZE = 25

export function Validation({ profileId, sessionData, onSave, onSummaryChange, saveDisabledByReRun }: ValidationProps) {
  const [summary, setSummary] = useState<ValidationSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(0)
  const [enumSuggestions, setEnumSuggestions] = useState<Record<string, string[]>>({})

  useEffect(() => {
    onSummaryChange?.(summary)
  }, [summary, onSummaryChange])

  useEffect(() => {
    setPage(0)
  }, [summary?.flatRows?.length])

  const handleRun = async () => {
    if (!sessionData.quote || !sessionData.load || !sessionData.driver_vehicle) return
    setLoading(true)
    try {
      const res = await api.pipeline.validate(profileId, sessionData)
      setSummary(res)
      if (res.fieldsWithWarnings?.length) {
        const vals: Record<string, string[]> = {}
        for (const f of res.fieldsWithWarnings) {
          try {
            const { validValues } = await api.schema.enumValues(f)
            vals[f] = validValues
          } catch {
            vals[f] = []
          }
        }
        setEnumSuggestions(vals)
      } else {
        setEnumSuggestions({})
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!summary || summary.rowsSuccessful < 1) return
    setSaving(true)
    try {
      await onSave()
    } finally {
      setSaving(false)
    }
  }

  const canSave = summary && summary.rowsSuccessful >= 1 && !saveDisabledByReRun
  const cols = summary?.flatRows?.[0] ? Object.keys(summary.flatRows[0]) : []
  const totalRows = summary?.flatRows?.length ?? 0
  const totalPages = Math.ceil(totalRows / PAGE_SIZE) || 1
  const pageRows = summary?.flatRows?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-medium">Pipeline Validation</h2>
          <p className="text-slate-600 text-sm">Run the full pipeline. Save when at least 1 row succeeds.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRun}
            disabled={loading || !sessionData.quote || !sessionData.load || !sessionData.driver_vehicle}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run validation'}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save & Activate'}
          </button>
        </div>
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-sm text-green-800 font-medium">Rows included</p>
              <p className="text-2xl font-semibold text-green-900">{summary.rowsSuccessful}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="text-sm text-red-800 font-medium">Rows excluded</p>
              <p className="text-2xl font-semibold text-red-900">{summary.rowsDropped}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <p className="text-sm text-amber-800 font-medium">Cells with warnings</p>
              <p className="text-2xl font-semibold text-amber-900">{summary.cellsWithWarnings ?? 0}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded p-4">
              <p className="text-sm text-slate-800 font-medium">Null / error fields</p>
              <p className="text-sm font-semibold text-slate-900">
                {summary.nullOrErrorFields?.length ? summary.nullOrErrorFields.join(', ') : 'None'}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow space-y-3">
            <h3 className="font-medium">Details</h3>
            {summary.fieldsWithWarnings?.length > 0 && (
              <div className="text-amber-700 text-sm">
                <p className="font-medium">Invalid enum (stored as null):</p>
                <ul className="list-disc pl-5 mt-1">
                  {summary.fieldsWithWarnings.map((f) => (
                    <li key={f}>
                      {f} — Valid values: {enumSuggestions[f]?.join(', ') ?? '—'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(summary.dedupWarnings?.length ?? 0) > 0 && (
              <div className="text-amber-700 text-sm">
                <p className="font-medium">Deduplication warnings:</p>
                <ul className="list-disc pl-5 mt-1">
                  {(summary.dedupWarnings ?? []).slice(0, 5).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                  {(summary.dedupWarnings?.length ?? 0) > 5 && (
                    <li>…and {(summary.dedupWarnings?.length ?? 0) - 5} more</li>
                  )}
                </ul>
              </div>
            )}
            {(summary.filterFieldWarnings?.length ?? 0) > 0 && (
              <div className="text-red-700 text-sm">
                <p className="font-medium">Filter references missing fields (skipped):</p>
                <p>{(summary.filterFieldWarnings ?? []).join(', ')}</p>
              </div>
            )}
            {canSave ? (
              <p className="text-green-600">Validation passed. You can save.</p>
            ) : (
              <p className="text-amber-600">No rows passed. Adjust mapping, joins, or filters.</p>
            )}
          </div>

          {summary.flatRows?.length > 0 && (
            <div className="bg-white p-4 rounded shadow">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="font-medium">Result table ({totalRows} rows)</h3>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-2 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-2 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    Next →
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto border rounded">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      {cols.map((h) => (
                        <th key={h} className="px-2 py-1 text-left font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50">
                        {cols.map((k) => (
                          <td
                            key={k}
                            className={`px-2 py-1 truncate max-w-[140px] ${
                              summary.fieldsWithWarnings?.includes(k) && (row[k] == null || row[k] === '')
                                ? 'bg-amber-50 text-amber-800'
                                : ''
                            }`}
                            title={String(row[k] ?? '')}
                          >
                            {String(row[k] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {saveDisabledByReRun && (
        <p className="text-amber-600 text-sm">Config or data changed. Re-run validation to enable Save.</p>
      )}
    </div>
  )
}
