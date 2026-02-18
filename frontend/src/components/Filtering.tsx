import { useState, useEffect } from 'react'
import { api, type Profile } from '../services/api'
import { DataModelPopover } from './DataModelPopover'

export interface FilterRule {
  type: 'inclusion' | 'exclusion'
  rule: string
  structured?: { field: string; op: string; value: unknown }
}

interface FilteringProps {
  sessionData: {
    quote?: { headers: string[]; rows: Record<string, unknown>[] }
    load?: { headers: string[]; rows: Record<string, unknown>[] }
    driver_vehicle?: { headers: string[]; rows: Record<string, unknown>[] }
  }
  profile: Profile
  onUpdate: (filters: FilterRule[]) => void
  onNext: () => void
  onSkip?: () => void
  onSaveProfile: (id: string, data: Partial<Profile>) => Promise<Profile>
}

export function Filtering({ sessionData, profile, onUpdate, onNext, onSkip, onSaveProfile }: FilteringProps) {
  const [nlInput, setNlInput] = useState('')
  const [ruleType, setRuleType] = useState<'inclusion' | 'exclusion'>('exclusion')
  const [interpretError, setInterpretError] = useState('')
  const [preview, setPreview] = useState<{ before: number; after: number; flatRows: Record<string, unknown>[]; filterFieldWarnings?: string[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const filters = (profile.filters || []) as FilterRule[]

  const runPreview = async () => {
    if (!sessionData.quote || !sessionData.load || !sessionData.driver_vehicle || !profile.id) return
    setLoading(true)
    try {
      const beforeRes = await api.pipeline.validate(profile.id, sessionData, { joinOnly: true })
      const res = await api.pipeline.validate(profile.id, sessionData, { filtersOverride: filters })
      setPreview({
        before: beforeRes.rowsSuccessful,
        after: res.rowsSuccessful,
        flatRows: res.flatRows || [],
        filterFieldWarnings: res.filterFieldWarnings,
      })
    } catch {
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionData.quote && sessionData.load && sessionData.driver_vehicle && profile.id) {
      runPreview()
    } else {
      setPreview(null)
    }
  }, [
    sessionData.quote?.rows?.length,
    sessionData.load?.rows?.length,
    sessionData.driver_vehicle?.rows?.length,
    profile.id,
    JSON.stringify(profile.filters),
  ])

  const addRule = async () => {
    const ruleText = nlInput.trim()
    if (!ruleText) return
    const prefix = ruleType === 'inclusion' ? 'include ' : 'exclude '
    const fullRule = ruleText.toLowerCase().startsWith('include ') || ruleText.toLowerCase().startsWith('exclude ')
      ? ruleText
      : prefix + ruleText
    const inferredType = fullRule.toLowerCase().startsWith('include ') ? 'inclusion' : 'exclusion'
    setInterpretError('')
    try {
      const data = await api.filters.interpret(fullRule, profile.aiMode)
      const newFilters: FilterRule[] = [
        ...filters,
        { type: inferredType, rule: fullRule, structured: data.structured },
      ]
      onUpdate(newFilters)
      setNlInput('')
    } catch (e) {
      setInterpretError((e as Error).message)
    }
  }

  const removeRule = (index: number) => {
    const next = filters.filter((_, i) => i !== index)
    onUpdate(next)
  }

  const saveFilters = async () => {
    await onSaveProfile(profile.id, { filters })
  }

  const SAMPLE = 5
  const sampleRows = preview?.flatRows?.slice(0, SAMPLE) || []
  const cols = sampleRows[0] ? Object.keys(sampleRows[0]) : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium">Filtering</h2>
        <DataModelPopover />
      </div>
      <p className="text-slate-600">
        Add inclusion or exclusion rules. Use natural language, e.g. &quot;exclude status = cancelled&quot; or &quot;include status = completed&quot;.
      </p>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-medium mb-2">Add rule</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value as 'inclusion' | 'exclusion')}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="inclusion">Include</option>
            <option value="exclusion">Exclude</option>
          </select>
          <input
            type="text"
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            placeholder="status = cancelled"
            className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[200px]"
          />
          <button onClick={addRule} disabled={!nlInput.trim()} className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50">
            Add
          </button>
        </div>
        {interpretError && <p className="text-red-600 text-sm mt-1">{interpretError}</p>}
      </div>

      {filters.length > 0 && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-medium mb-2">Rules ({filters.length})</h3>
          <ul className="space-y-1">
            {filters.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-0.5 rounded ${f.type === 'inclusion' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {f.type}
                </span>
                <span>{f.rule}</span>
                <button onClick={() => removeRule(i)} className="text-red-600 hover:underline ml-auto">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={runPreview}
          disabled={loading || !sessionData.quote || !sessionData.load || !sessionData.driver_vehicle}
          className="px-4 py-2 bg-slate-200 rounded text-sm disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Preview filters'}
        </button>
      </div>

      {preview?.filterFieldWarnings?.length ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          Filter references missing fields (skipped): {preview.filterFieldWarnings.join(', ')}
        </div>
      ) : null}
      {preview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-medium mb-2">Before (after joins)</h3>
            <p className="text-lg font-semibold">{preview.before} rows</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-medium mb-2">After (with filters)</h3>
            <p className="text-lg font-semibold">{preview.after} rows</p>
            {preview.after === 0 && filters.length > 0 && (
              <p className="text-amber-600 text-sm mt-1">Filter drops all rows. Save will be blocked.</p>
            )}
          </div>
        </div>
      )}

      {sampleRows.length > 0 && (
        <details className="bg-white p-4 rounded shadow">
          <summary className="font-medium cursor-pointer">Sample rows (first {SAMPLE})</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  {cols.slice(0, 8).map((c) => (
                    <th key={c} className="text-left p-1 border-b font-medium">{c}</th>
                  ))}
                  {cols.length > 8 && <th>…</th>}
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((row, i) => (
                  <tr key={i}>
                    {cols.slice(0, 8).map((c) => (
                      <td key={c} className="p-1 border-b truncate max-w-[120px]" title={String(row[c] ?? '')}>
                        {String(row[c] ?? '')}
                      </td>
                    ))}
                    {cols.length > 8 && <td>…</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <div className="flex justify-end gap-2">
        {onSkip && (
          <button onClick={onSkip} className="px-4 py-2 border border-slate-300 rounded text-slate-600 hover:bg-slate-50">
            Skip
          </button>
        )}
        <button onClick={saveFilters} className="px-4 py-2 border rounded">
          Save filters
        </button>
        <button
          onClick={async () => {
            await saveFilters()
            onNext()
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Next: Validation
        </button>
      </div>
    </div>
  )
}
