import { useState, useEffect } from 'react'
import { api, type Profile } from '../../services/api'
import { DataModelPopover } from '../DataModelPopover'
import { DataTableWithSearch } from '../DataTableWithSearch'
import { PipelineDataTabs } from '../PipelineDataTabs'
import { AiWorkingIndicator } from '../AiWorkingIndicator'

export interface FilterRule {
  type: 'inclusion' | 'exclusion'
  rule: string
  structured?: { field?: string; op: string; value?: unknown }
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
  viewOnly?: boolean
}

export function Filtering({ sessionData, profile, onUpdate, onNext, onSkip, onSaveProfile, viewOnly }: FilteringProps) {
  const [nlInput, setNlInput] = useState('')
  const [interpretError, setInterpretError] = useState('')
  const [interpreting, setInterpreting] = useState(false)
  const [examplesExpanded, setExamplesExpanded] = useState(false)
  const [preview, setPreview] = useState<{
    before: number
    after: number
    flatRows: Record<string, unknown>[]
    quoteRows: Record<string, unknown>[]
    loadRows: Record<string, unknown>[]
    vehicleDriverRows: Record<string, unknown>[]
    excludedByFilter?: Record<string, unknown>[]
    filterFieldWarnings?: string[]
    ruleEffects?: { ruleIndex: number; rule: string; type: string; before: number; after: number; excluded: number }[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const filters = (profile.filters || []) as FilterRule[]

  const runPreview = async () => {
    if (!sessionData.quote || !sessionData.load || !sessionData.driver_vehicle || !profile.id) return
    setLoading(true)
    setPreviewError(null)
    try {
      const beforeRes = await api.pipeline.validate(profile.id, sessionData, { joinOnly: true })
      const res = await api.pipeline.validate(profile.id, sessionData, { filtersOverride: filters })
      setPreviewError(null)
      setPreview({
        before: beforeRes.rowsSuccessful,
        after: res.rowsSuccessful,
        flatRows: res.flatRows || [],
        quoteRows: res.quoteRows || [],
        loadRows: res.loadRows || [],
        vehicleDriverRows: res.vehicleDriverRows || [],
        excludedByFilter: res.excludedByFilter || [],
        filterFieldWarnings: res.filterFieldWarnings,
        ruleEffects: res.ruleEffects,
      })
    } catch (e) {
      setPreview(null)
      setPreviewError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionData.quote && sessionData.load && sessionData.driver_vehicle && profile.id) {
      runPreview()
    } else {
      setPreview(null)
      setPreviewError(null)
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
    setInterpretError('')
    setInterpreting(true)
    try {
      const data = await api.filters.interpret(ruleText, profile.aiMode)
      const rules = data.rules
      if (!rules?.length) {
        setInterpretError('Could not interpret filter rule')
        return
      }
      const newFilters: FilterRule[] = [...filters]
      for (const r of rules) {
        const structured = r.structured
        if (!structured?.op) continue
        const inferredType =
          structured.type ??
          (ruleText.toLowerCase().includes('include') || ruleText.toLowerCase().includes('keep') || ruleText.toLowerCase().includes('want') ? 'inclusion' : 'exclusion')
        newFilters.push({
          type: inferredType as 'inclusion' | 'exclusion',
          rule: rules.length > 1 ? (r.label || ruleText) : ruleText,
          structured: {
            field: structured.field,
            op: structured.op,
            value: structured.value,
            ...(structured.orGroup != null && { orGroup: structured.orGroup }),
          },
        })
      }
      if (newFilters.length > filters.length) {
        onUpdate(newFilters)
        setNlInput('')
      } else {
        setInterpretError('Could not interpret filter rule')
      }
    } catch (e) {
      setInterpretError((e as Error).message)
    } finally {
      setInterpreting(false)
    }
  }

  const removeRule = (index: number) => {
    const next = filters.filter((_, i) => i !== index)
    onUpdate(next)
  }

  const saveFilters = async () => {
    await onSaveProfile(profile.id, { filters })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium">Filtering</h2>
        <DataModelPopover />
      </div>
      {!viewOnly && (
      <div className="bg-white p-6 rounded shadow-md-1">
        <h3 className="font-medium mb-3 text-[rgba(0,0,0,0.87)]">Add rule</h3>
        <p className="text-sm text-[rgba(0,0,0,0.6)] mb-3">
          Describe your filter in natural language.
        </p>
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setExamplesExpanded((e) => !e)}
            className="text-sm text-primary hover:underline font-medium"
          >
            {examplesExpanded ? '▼ Hide examples' : '▶ View examples'}
          </button>
          {examplesExpanded && (
            <div className="mt-2 p-3 bg-black/[0.03] border border-black/10 rounded text-sm space-y-2">
              <p className="font-medium text-[rgba(0,0,0,0.87)]">Natural language examples:</p>
              <ul className="list-disc list-inside text-[rgba(0,0,0,0.7)] space-y-1">
                <li>Remove all loads with a collection from Leeds</li>
                <li>exclude cancelled loads</li>
                <li>I only want to see rows with less than 500 on capacity_kg</li>
                <li>remove loads that don&apos;t have capacity_kg</li>
                <li>remove loads that are small vans</li>
                <li>exclude rows where quoted_price is over 2000</li>
                <li>include loads that have email</li>
                <li>I only want to see Luton and large_van vehicle types</li>
                <li>Remove any row with a null value</li>
                <li><strong>Loads with capacity_kg and with more than 1000kg</strong> (compound)</li>
                <li><strong>remove London loads</strong> (exclude rows with London in any location)</li>
                <li>Show only loads with quoted_price and over £500</li>
                <li>include loads from Manchester</li>
              </ul>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-start">
          <textarea
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            placeholder="e.g. Remove all loads with a collection from Leeds"
            rows={2}
            className="border border-black/20 rounded px-3 py-2 text-sm flex-1 min-w-[300px] focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
          <button onClick={addRule} disabled={!nlInput.trim() || interpreting} className="px-6 py-2.5 bg-primary text-white rounded font-medium shadow-md-1 hover:bg-primary-dark disabled:opacity-50 shrink-0">
            {interpreting ? 'Interpreting...' : 'Add rule'}
          </button>
          {interpreting && <AiWorkingIndicator message="AI interpreting filter rule..." />}
        </div>
        {interpretError && <p className="text-red-600 text-sm mt-1">{interpretError}</p>}
      </div>
      )}

      {filters.length > 0 && (
        <div className="bg-white p-6 rounded shadow-md-1">
          <h3 className="font-medium mb-2">Rules ({filters.length})</h3>
          <p className="text-xs text-[rgba(0,0,0,0.6)] mb-2">
            Inclusion rules are AND&apos;d (rows must match all). Rules like &quot;London loads&quot; are OR&apos;d across location fields. Exclusion rules remove matching rows.
          </p>
          <ul className="space-y-2">
            {filters.map((f, i) => {
              const effect = preview?.ruleEffects?.find((e) => e.ruleIndex === i)
              return (
                <li key={i} className="flex items-center gap-2 text-sm flex-wrap">
                  <span className={`px-2 py-0.5 rounded shrink-0 ${f.type === 'inclusion' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {f.type}
                  </span>
                  <span className="min-w-0">{f.rule}</span>
                  {effect != null && (
                    <span className="text-xs text-[rgba(0,0,0,0.6)] shrink-0">
                      {effect.before} → {effect.after} rows
                      {effect.excluded > 0 && ` (−${effect.excluded})`}
                    </span>
                  )}
                  {!viewOnly && (
                    <button onClick={() => removeRule(i)} className="text-red-600 hover:underline ml-auto shrink-0">
                      Remove
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {!viewOnly && (
      <div className="flex gap-2">
        <button
          onClick={runPreview}
          disabled={loading || !sessionData.quote || !sessionData.load || !sessionData.driver_vehicle}
          className="px-6 py-2.5 border border-black/20 rounded font-medium hover:bg-black/4 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Preview filters'}
        </button>
      </div>
      )}

      {previewError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm">Preview failed: {previewError}</div>
      )}

      {preview?.filterFieldWarnings?.length ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          Filter references missing fields (skipped): {preview.filterFieldWarnings.join(', ')}
        </div>
      ) : null}
      {preview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded shadow-md-1">
            <h3 className="font-medium mb-2">Before filters</h3>
            <p className="text-lg font-semibold">{preview.before} rows</p>
          </div>
          <div className="bg-white p-6 rounded shadow-md-1">
            <h3 className="font-medium mb-2">After filters</h3>
            <p className="text-lg font-semibold">{preview.after} combined rows</p>
            <p className="text-sm text-[rgba(0,0,0,0.6)]">{preview.before - preview.after} filtered out</p>
            {preview.after === 0 && filters.length > 0 && (
              <p className="text-amber-600 text-sm mt-1">Filter drops all rows. Save will be blocked.</p>
            )}
          </div>
        </div>
      )}

      {preview && preview.excludedByFilter && preview.excludedByFilter.length > 0 && (
        <div className="bg-white p-6 rounded shadow-md-1">
          <h3 className="font-medium mb-3 text-red-700">Filtered out</h3>
          <DataTableWithSearch
            data={preview.excludedByFilter}
            maxRows={50}
            searchPlaceholder="Search filtered-out rows..."
          />
        </div>
      )}

      {preview && (preview.flatRows?.length ?? 0) > 0 && (
        <div className="bg-white p-6 rounded shadow-md-1">
          <h3 className="font-medium mb-3 text-green-700">Combined rows</h3>
          <PipelineDataTabs
            outputs={{
              flatRows: preview.flatRows ?? [],
              quoteRows: preview.quoteRows ?? [],
              loadRows: preview.loadRows ?? [],
              vehicleDriverRows: preview.vehicleDriverRows ?? [],
            }}
            searchPlaceholder="Search combined rows..."
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        {!viewOnly && onSkip && (
          <button onClick={onSkip} className="px-6 py-2.5 border border-black/20 rounded font-medium hover:bg-black/4">
            Skip
          </button>
        )}
        {!viewOnly && (
          <button onClick={saveFilters} className="px-6 py-2.5 border border-black/20 rounded font-medium hover:bg-black/4">
            Save filters
          </button>
        )}
        <button
          onClick={async () => {
            if (!viewOnly) await saveFilters()
            onNext()
          }}
          className="px-6 py-2.5 bg-primary text-white rounded font-medium shadow-md-1 hover:bg-primary-dark"
        >
          Next: Validation
        </button>
      </div>
    </div>
  )
}
