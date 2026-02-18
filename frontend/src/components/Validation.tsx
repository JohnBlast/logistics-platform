import { useState, useEffect } from 'react'
import { api } from '../services/api'

interface ValidationSummary {
  rowsSuccessful: number
  rowsDropped: number
  fieldsWithWarnings: string[]
  dedupWarnings?: string[]
  filterFieldWarnings?: string[]
  flatRows: Record<string, unknown>[]
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

export function Validation({ profileId, sessionData, onSave, onSummaryChange, saveDisabledByReRun }: ValidationProps) {
  const [summary, setSummary] = useState<ValidationSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [enumSuggestions, setEnumSuggestions] = useState<Record<string, string[]>>({})

  useEffect(() => {
    onSummaryChange?.(summary)
  }, [summary, onSummaryChange])

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

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Pipeline Validation</h2>
      <p className="text-slate-600">Run the full pipeline. Save when at least 1 row succeeds.</p>

      <button
        onClick={handleRun}
        disabled={loading || !sessionData.quote || !sessionData.load || !sessionData.driver_vehicle}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Running...' : 'Run validation'}
      </button>

      {summary && (
        <div className="bg-white p-4 rounded shadow space-y-3">
          <h3 className="font-medium">Summary</h3>
          <p>Rows successful: {summary.rowsSuccessful}</p>
          <p>Rows dropped: {summary.rowsDropped}</p>

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
            <p className="text-green-600 mt-2">Validation passed. You can save.</p>
          ) : (
            <p className="text-amber-600 mt-2">No rows passed. Adjust mapping, joins, or filters.</p>
          )}

          {summary.flatRows?.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer font-medium">Sample rows (first 5)</summary>
              <div className="mt-2 overflow-x-auto border rounded">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      {Object.keys(summary.flatRows[0]).slice(0, 8).map((h) => (
                        <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>
                      ))}
                      {Object.keys(summary.flatRows[0]).length > 8 && <th>…</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.flatRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.keys(summary.flatRows[0]).slice(0, 8).map((k) => (
                          <td key={k} className="px-2 py-1 truncate max-w-[100px]" title={String(row[k] ?? '')}>
                            {String(row[k] ?? '')}
                          </td>
                        ))}
                        {Object.keys(summary.flatRows[0]).length > 8 && <td>…</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}

      {saveDisabledByReRun && (
        <p className="text-amber-600 text-sm">Config or data changed. Re-run validation to enable Save.</p>
      )}
      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save & Activate'}
      </button>
    </div>
  )
}
