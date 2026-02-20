import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { DataTableWithSearch } from './DataTableWithSearch'
import { PipelineDataTabs } from './PipelineDataTabs'

interface ValidationSummary {
  rowsSuccessful: number
  rowsDropped: number
  fieldsWithWarnings: string[]
  dedupWarnings?: string[]
  filterFieldWarnings?: string[]
  flatRows: Record<string, unknown>[]
  quoteRows: Record<string, unknown>[]
  loadRows: Record<string, unknown>[]
  vehicleDriverRows: Record<string, unknown>[]
  excludedByFilter?: Record<string, unknown>[]
  excludedByFilterCount?: number
  cellsWithWarnings?: number
  nullOrEmptyCells?: number
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
  viewOnly?: boolean
}

export function Validation({ profileId, sessionData, onSave, onSummaryChange, saveDisabledByReRun, viewOnly }: ValidationProps) {
  const [summary, setSummary] = useState<ValidationSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [enumSuggestions, setEnumSuggestions] = useState<Record<string, string[]>>({})
  const [activeTab, setActiveTab] = useState<'included' | 'excluded'>('included')

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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-medium">Pipeline Validation</h2>
          <p className="text-[rgba(0,0,0,0.6)] text-sm">Run the full pipeline. Save when at least 1 row succeeds.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRun}
            disabled={loading || !sessionData.quote || !sessionData.load || !sessionData.driver_vehicle}
            className="px-6 py-2.5 bg-primary text-white rounded font-medium shadow-md-1 hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run validation'}
          </button>
          {!viewOnly && (
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="px-6 py-2.5 bg-green-600 text-white rounded font-medium shadow-md-1 hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save & Activate'}
            </button>
          )}
        </div>
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-sm text-green-800 font-medium">Combined rows</p>
              <p className="text-2xl font-semibold text-green-900">{summary.rowsSuccessful}</p>
              <p className="text-xs text-green-700 mt-0.5">Quote + Load + Vehicle+Driver successfully joined</p>
            </div>
            <div className="bg-black/6 border border-black/12 rounded p-4">
              <p className="text-sm text-[rgba(0,0,0,0.87)] font-medium">Unconnected / filtered out</p>
              <p className="text-2xl font-semibold text-[rgba(0,0,0,0.87)]">{summary.rowsDropped}</p>
              <p className="text-xs text-[rgba(0,0,0,0.6)] mt-0.5">Quotes, loads, or vehicles with no matching join, or removed by filter rules</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <p className="text-sm text-amber-800 font-medium">Null / empty cells</p>
              <p className="text-2xl font-semibold text-amber-900">{summary.nullOrEmptyCells ?? 0}</p>
            </div>
            <div className="bg-black/4 border border-black/12 rounded p-4">
              <p className="text-sm text-[rgba(0,0,0,0.87)] font-medium">Enum fields with warnings</p>
              <p className="text-sm font-semibold text-[rgba(0,0,0,0.87)]">
                {summary.nullOrErrorFields?.length ? summary.nullOrErrorFields.join(', ') : 'None'}
              </p>
              {summary.cellsWithWarnings != null && summary.cellsWithWarnings > 0 && (
                <p className="text-xs text-[rgba(0,0,0,0.6)] mt-0.5">({summary.cellsWithWarnings} invalid enum → null)</p>
              )}
            </div>
          </div>

            <div className="bg-white p-6 rounded shadow-md-1 space-y-3">
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

          {(summary.flatRows?.length > 0 || (summary.excludedByFilter?.length ?? 0) > 0) && (
            <div className="bg-white p-6 rounded shadow-md-1">
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('included')}
                  className={`px-4 py-2 rounded font-medium text-sm ${activeTab === 'included' ? 'bg-primary text-white' : 'bg-black/4 text-[rgba(0,0,0,0.87)] hover:bg-black/8'}`}
                >
                  Combined rows ({summary.rowsSuccessful})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('excluded')}
                  className={`px-4 py-2 rounded font-medium text-sm ${activeTab === 'excluded' ? 'bg-primary text-white' : 'bg-black/4 text-[rgba(0,0,0,0.87)] hover:bg-black/8'}`}
                >
                  Filtered out ({summary.excludedByFilterCount ?? summary.excludedByFilter?.length ?? 0})
                </button>
              </div>
              {activeTab === 'included' && summary.flatRows?.length > 0 && (
                <PipelineDataTabs
                  outputs={{
                    flatRows: summary.flatRows,
                    quoteRows: summary.quoteRows ?? [],
                    loadRows: summary.loadRows ?? [],
                    vehicleDriverRows: summary.vehicleDriverRows ?? [],
                  }}
                  searchPlaceholder="Search combined rows..."
                  warningFields={summary.fieldsWithWarnings}
                />
              )}
              {activeTab === 'excluded' && (summary.excludedByFilter?.length ?? 0) > 0 && (
                <DataTableWithSearch
                  data={summary.excludedByFilter ?? []}
                  maxRows={50}
                  searchPlaceholder="Search filtered-out rows..."
                  warningFields={summary.fieldsWithWarnings}
                />
              )}
              {activeTab === 'excluded' && (!summary.excludedByFilter || summary.excludedByFilter.length === 0) && (
                <p className="text-[rgba(0,0,0,0.6)] text-sm py-4">
                  No rows removed by filter rules. Unconnected data (e.g. quotes with no matching load, loads with no vehicle) are counted above but cannot be listed here.
                </p>
              )}
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
