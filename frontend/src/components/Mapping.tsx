import { useEffect, useState } from 'react'
import { api, type Profile } from '../services/api'
import { DataModelPopover } from './DataModelPopover'
import { AiWorkingIndicator } from './AiWorkingIndicator'

const REQUIRED_QUOTE = ['quote_id', 'load_id', 'quoted_price', 'status', 'created_at', 'updated_at']
const REQUIRED_LOAD = ['load_id', 'status', 'load_poster_name', 'created_at', 'updated_at']
const REQUIRED_DV = ['vehicle_id', 'driver_id', 'vehicle_type', 'registration_number', 'name', 'fleet_id', 'created_at', 'updated_at']

const FIELD_LABELS: Record<string, string> = {
  quote_id: 'Quote reference',
  load_id: 'Load reference',
  quoted_price: 'Quoted price (£)',
  status: 'Status',
  created_at: 'Created date',
  updated_at: 'Updated date',
  load_poster_name: 'Posted by',
  vehicle_id: 'Vehicle ID',
  driver_id: 'Driver ID',
  vehicle_type: 'Vehicle type',
  registration_number: 'Registration',
  name: 'Driver name',
  fleet_id: 'Fleet ID',
  allocated_vehicle_id: 'Assigned vehicle',
}
function fieldLabel(name: string): string {
  return FIELD_LABELS[name] || name.replace(/_/g, ' ')
}

interface MappingProps {
  sessionData: {
    quote?: { headers: string[]; rows: Record<string, unknown>[] }
    load?: { headers: string[]; rows: Record<string, unknown>[] }
    driver_vehicle?: { headers: string[]; rows: Record<string, unknown>[] }
  }
  profile: Profile
  onUpdate: (mappings: Profile['mappings']) => void
  onProfileUpdate: (updates: Partial<Profile>) => void
  onNext: () => void
  onSaveProfile: (id: string, data: Partial<Profile>) => Promise<Profile>
}

const SCHEMA_KEYS: Record<string, number[]> = { quote: [0], load: [1], driver_vehicle: [2, 3] }

export function Mapping({
  sessionData,
  profile,
  onUpdate,
  onProfileUpdate,
  onNext,
  onSaveProfile,
}: MappingProps) {
  const [suggestions, setSuggestions] = useState<Record<string, { targetField: string; sourceColumn: string; confidence: number }[]>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)
  const [schema, setSchema] = useState<{ entities: { fields: { name: string; description?: string }[] }[] } | null>(null)

  useEffect(() => {
    api.schema.get().then((r) => setSchema(r as { entities: { fields: { name: string; description?: string }[] }[] })).catch(() => setSchema(null))
  }, [])

  const getFieldDesc = (objectType: string, fieldName: string): string => {
    if (!schema?.entities) return ''
    const indices = SCHEMA_KEYS[objectType] || []
    for (const i of indices) {
      const f = schema.entities[i]?.fields?.find((x) => x.name === fieldName)
      if (f?.description) return f.description
    }
    return ''
  }
  const mappings = profile.mappings || {}
  const lockedMappings = profile.lockedMappings || {}
  const quoteMappings = mappings.quote || {}
  const loadMappings = mappings.load || {}
  const dvMappings = mappings.driver_vehicle || {}

  const runSuggest = async () => {
    setLoading(true)
    setSuggestError(null)
    try {
      const getLocked = (key: string) => lockedMappings[key] || {}
      const aiMode = profile.aiMode
      if (sessionData.quote?.rows?.length) {
        const r = await api.mapping.suggest('quote', sessionData.quote.headers, sessionData.quote.rows, getLocked('quote'), aiMode)
        setSuggestions((s) => ({ ...s, quote: r.suggestions }))
      }
      if (sessionData.load?.rows?.length) {
        const r = await api.mapping.suggest('load', sessionData.load.headers, sessionData.load.rows, getLocked('load'), aiMode)
        setSuggestions((s) => ({ ...s, load: r.suggestions }))
      }
      if (sessionData.driver_vehicle?.rows?.length) {
        const r = await api.mapping.suggest('driver_vehicle', sessionData.driver_vehicle.headers, sessionData.driver_vehicle.rows, getLocked('driver_vehicle'), aiMode)
        setSuggestions((s) => ({ ...s, driver_vehicle: r.suggestions }))
      }
    } catch (e) {
      setSuggestError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runSuggest()
  }, [sessionData.quote?.rows?.length, sessionData.load?.rows?.length, sessionData.driver_vehicle?.rows?.length])

  const setMapping = (objectType: 'quote' | 'load' | 'driver_vehicle', target: string, source: string) => {
    const m = { ...mappings, [objectType]: { ...mappings[objectType], [target]: source } }
    onUpdate(m)
  }

  const toggleLock = (objectType: 'quote' | 'load' | 'driver_vehicle', target: string) => {
    const current = mappings[objectType]?.[target]
    if (!current) return
    const locked = { ...lockedMappings, [objectType]: { ...lockedMappings[objectType] } }
    if (locked[objectType][target]) {
      delete locked[objectType][target]
    } else {
      locked[objectType][target] = current
    }
    onProfileUpdate({ lockedMappings: locked })
  }

  const applySuggestions = (objectType: 'quote' | 'load' | 'driver_vehicle') => {
    const sugs = suggestions[objectType]
    if (!sugs) return
    const m = { ...mappings[objectType] }
    const locked = lockedMappings[objectType] || {}
    for (const s of sugs) {
      if (!locked[s.targetField]) m[s.targetField] = s.sourceColumn
    }
    onUpdate({ ...mappings, [objectType]: m })
  }

  const applySuggestion = (objectType: 'quote' | 'load' | 'driver_vehicle', target: string, source: string) => {
    const m = { ...mappings, [objectType]: { ...mappings[objectType], [target]: source } }
    onUpdate(m)
  }

  const requiredMet = (obj: Record<string, string>, required: string[]) =>
    required.every((r) => obj[r])

  const allRequiredMet =
    requiredMet(quoteMappings, REQUIRED_QUOTE) &&
    requiredMet(loadMappings, REQUIRED_LOAD) &&
    requiredMet(dvMappings, REQUIRED_DV)

  const saveMappings = async () => {
    await onSaveProfile(profile.id, { mappings, lockedMappings })
  }

  const dataMap = [
    { key: 'quote' as const, label: 'Quote', required: REQUIRED_QUOTE, headers: sessionData.quote?.headers, mappings: quoteMappings },
    { key: 'load' as const, label: 'Load', required: REQUIRED_LOAD, headers: sessionData.load?.headers, mappings: loadMappings },
    { key: 'driver_vehicle' as const, label: 'Driver+Vehicle', required: REQUIRED_DV, headers: sessionData.driver_vehicle?.headers, mappings: dvMappings },
  ]

  const countMapped = (m: Record<string, string>, keys: string[]) =>
    keys.filter((k) => m[k]).length
  const totalFields = REQUIRED_QUOTE.length + REQUIRED_LOAD.length + REQUIRED_DV.length
  const mappedCount = countMapped(quoteMappings, REQUIRED_QUOTE) + countMapped(loadMappings, REQUIRED_LOAD) + countMapped(dvMappings, REQUIRED_DV)

  const inputClass = "border border-black/20 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
  const LOW_CONFIDENCE_THRESHOLD = 0.6

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-medium text-[rgba(0,0,0,0.87)]">Mapping</h2>
        <DataModelPopover />
      </div>
      <p className="text-[rgba(0,0,0,0.6)]">Map source columns to target fields. Required fields must be mapped.</p>
      <p className="text-sm text-[rgba(0,0,0,0.6)]">{mappedCount}/{totalFields} fields mapped</p>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={runSuggest}
            disabled={loading}
            className="px-6 py-2.5 border border-black/20 rounded font-medium hover:bg-black/4 disabled:opacity-50"
          >
            {loading ? 'Suggesting...' : 'Suggest mapping'}
          </button>
          {loading && <AiWorkingIndicator message="AI suggesting mappings..." />}
        </div>
        {suggestError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {suggestError}
          </div>
        )}
      </div>

      {dataMap.map(({ key, label, required, headers, mappings: m }) => {
        const sugs = suggestions[key] || []
        const locked = lockedMappings[key] || {}
        const unmappedRequired = required.filter((r) => !m[r])
        const errorSuggestions = unmappedRequired
          .map((field) => {
            const s = sugs.find((x) => x.targetField === field)
            return s ? { field, sourceColumn: s.sourceColumn } : null
          })
          .filter(Boolean) as { field: string; sourceColumn: string }[]

        const aiAppliedCount = required.filter((f) => {
          const s = sugs.find((x) => x.targetField === f)
          return s && m[f] === s.sourceColumn
        }).length
        const manualCount = countMapped(m, required) - aiAppliedCount
        const isCollapsed = collapsed[key]

        return (
          <div key={key} className="bg-white p-6 rounded shadow-md-1">
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))}
              className="flex items-center gap-2 w-full text-left font-medium mb-2"
            >
              <span>{isCollapsed ? '▶' : '▼'}</span>
              {label}
              <span className="text-[rgba(0,0,0,0.6)] text-sm font-normal">
                ({countMapped(m, required)}/{required.length} mapped)
              </span>
              {!isCollapsed && (aiAppliedCount > 0 || manualCount > 0) && (
                <span className="text-xs font-normal text-[rgba(0,0,0,0.5)] ml-2">
                  ({aiAppliedCount} AI applied, {manualCount} manual)
                </span>
              )}
            </button>
            {!isCollapsed && (
            <>
            {errorSuggestions.length > 0 && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
                {errorSuggestions.map(({ field, sourceColumn }) => (
                  <div key={field} className="flex items-center gap-2">
                    <span>Map &quot;{sourceColumn}&quot; → {field}</span>
                    <button
                      onClick={() => applySuggestion(key, field, sourceColumn)}
                      className="text-primary hover:underline font-medium"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => applySuggestions(key)}
              className="mb-3 text-sm text-primary hover:underline font-medium"
            >
              Apply suggested
            </button>
            <div className="space-y-3 border-t border-black/12 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-2 text-xs font-medium text-[rgba(0,0,0,0.6)] uppercase tracking-wide">
                <span className="bg-primary/8 text-primary px-2 py-1 rounded">Data model (target)</span>
                <span></span>
                <span className="bg-green-50 text-green-800 px-2 py-1 rounded">Your uploaded data (source)</span>
              </div>
              {required.map((field) => {
                const sug = sugs.find((s) => s.targetField === field)
                const conf = sug ? sug.confidence : null
                const isAiApplied = sug && m[field] === sug.sourceColumn
                const isManualApplied = m[field] && (!sug || m[field] !== sug.sourceColumn)
                const hasUnappliedSuggestion = sug && !m[field]
                const isLowConfidence = conf != null && conf < LOW_CONFIDENCE_THRESHOLD
                const desc = getFieldDesc(key, field)
                let opts = headers || []
                if (m[field] && !opts.includes(m[field])) opts = [m[field], ...opts]
                return (
                  <div
                    key={field}
                    className={`grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-2 items-center border-b border-black/6 pb-2 pt-1 ${
                      hasUnappliedSuggestion ? 'bg-primary/5 -mx-2 px-3 py-2 rounded-lg border-l-4 border-l-primary ml-0' : ''
                    } ${isAiApplied ? 'bg-green-50/80 -mx-2 px-3 py-2 rounded-lg border-l-4 border-l-green-500 ml-0' : ''}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[rgba(0,0,0,0.87)] font-medium">{fieldLabel(field)}</span>
                        <span className="text-red-500">*</span>
                        {isAiApplied && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded border border-green-300">
                            AI applied
                          </span>
                        )}
                        {isManualApplied && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded border border-slate-200">
                            Manual
                          </span>
                        )}
                        {hasUnappliedSuggestion && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-primary/15 text-primary rounded border border-primary/30">
                            AI suggested
                          </span>
                        )}
                      </div>
                      {desc && <p className="text-xs text-[rgba(0,0,0,0.6)] mt-0.5">{desc}</p>}
                      {hasUnappliedSuggestion && (
                        <p className="text-sm font-medium text-primary mt-1">
                          Suggested: {sug!.sourceColumn}
                          {conf != null && ` (${Math.round(conf * 100)}% confidence)`}
                          {isLowConfidence && ' — review recommended'}
                        </p>
                      )}
                      {isAiApplied && conf != null && (
                        <p className="text-xs text-green-700 mt-0.5">
                          Accepted suggestion: {sug!.sourceColumn} ({Math.round(conf * 100)}%)
                        </p>
                      )}
                    </div>
                    <span className="text-[rgba(0,0,0,0.38)]">→</span>
                    <div className="flex items-center gap-2">
                    <select
                      value={m[field] || ''}
                      onChange={(e) => setMapping(key, field, e.target.value)}
                      className={inputClass}
                    >
                      <option value="">—</option>
                      {opts.map((h) => (
                        <option key={h} value={h} className={hasUnappliedSuggestion && sug?.sourceColumn === h ? 'font-semibold' : ''}>
                          {h}
                          {hasUnappliedSuggestion && sug?.sourceColumn === h && conf != null ? ` ✓ ${Math.round(conf * 100)}%` : ''}
                        </option>
                      ))}
                    </select>
                    {conf != null && isAiApplied && (
                      <span
                        className={`text-xs ${isLowConfidence ? 'text-amber-600 font-medium' : 'text-[rgba(0,0,0,0.6)]'}`}
                        title={isLowConfidence ? 'Low confidence — review this mapping' : 'Suggestion confidence'}
                      >
                        {Math.round(conf * 100)}%
                        {isLowConfidence && ' ⚠'}
                      </span>
                    )}
                    {m[field] && (
                      <button
                        type="button"
                        onClick={() => toggleLock(key, field)}
                        className={`p-1 rounded ${locked[field] ? 'text-amber-600 bg-amber-100' : 'text-[rgba(0,0,0,0.38)] hover:text-[rgba(0,0,0,0.6)]'}`}
                        title={locked[field] ? 'Unlock' : 'Lock mapping'}
                      >
                        {locked[field] ? '🔒' : '🔓'}
                      </button>
                    )}
                    </div>
                  </div>
                )
              })}
            </div>
            </>
            )}
          </div>
        )
      })}

      <div className="flex justify-end gap-3">
        <button onClick={saveMappings} className="px-6 py-2.5 border border-black/20 rounded font-medium hover:bg-black/4">
          Save mappings
        </button>
        <button
          onClick={async () => {
            await saveMappings()
            onNext()
          }}
          disabled={!allRequiredMet}
          className="px-6 py-2.5 bg-primary text-white rounded font-medium shadow-md-1 hover:bg-primary-dark disabled:opacity-50"
        >
          Next: Enum Mapping
        </button>
      </div>
    </div>
  )
}
