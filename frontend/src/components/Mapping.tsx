import { useEffect, useState } from 'react'
import { api, type Profile } from '../services/api'
import { DataModelPopover } from './DataModelPopover'

const REQUIRED_QUOTE = ['quote_id', 'load_id', 'quoted_price', 'status', 'created_at', 'updated_at']
const REQUIRED_LOAD = ['load_id', 'status', 'load_poster_name', 'created_at', 'updated_at']
const REQUIRED_DV = ['vehicle_id', 'driver_id', 'vehicle_type', 'registration_number', 'name', 'fleet_id', 'created_at', 'updated_at']

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
  const [columnFilter, setColumnFilter] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const mappings = profile.mappings || {}
  const lockedMappings = profile.lockedMappings || {}
  const quoteMappings = mappings.quote || {}
  const loadMappings = mappings.load || {}
  const dvMappings = mappings.driver_vehicle || {}

  const runSuggest = async (suggestRemaining = false) => {
    setLoading(true)
    try {
      const getLocked = (key: string) => (suggestRemaining ? mappings[key] : lockedMappings[key]) || {}
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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runSuggest(false)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium">Mapping</h2>
        <DataModelPopover />
      </div>
      <p className="text-slate-600">Map source columns to target fields. Required fields must be mapped.</p>
      <p className="text-sm text-slate-500">{mappedCount}/{totalFields} fields mapped</p>

      <div className="flex gap-2">
        <button
          onClick={() => runSuggest(false)}
          disabled={loading}
          className="px-4 py-2 bg-slate-200 rounded text-sm disabled:opacity-50"
        >
          {loading ? 'Suggesting...' : 'Suggest mappings'}
        </button>
        <button
          onClick={() => runSuggest(true)}
          disabled={loading}
          className="px-4 py-2 bg-slate-200 rounded text-sm disabled:opacity-50"
        >
          Suggest remaining
        </button>
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

        const isCollapsed = collapsed[key]

        return (
          <div key={key} className="bg-white p-4 rounded shadow">
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))}
              className="flex items-center gap-2 w-full text-left font-medium mb-2"
            >
              <span>{isCollapsed ? '▶' : '▼'}</span>
              {label}
              <span className="text-slate-500 text-sm font-normal">
                ({countMapped(m, required)}/{required.length} mapped)
              </span>
            </button>
            {!isCollapsed && (
            <>
            {errorSuggestions.length > 0 && (
              <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                {errorSuggestions.map(({ field, sourceColumn }) => (
                  <div key={field} className="flex items-center gap-2">
                    <span>Map &quot;{sourceColumn}&quot; → {field}</span>
                    <button
                      onClick={() => applySuggestion(key, field, sourceColumn)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => applySuggestions(key)}
              className="mb-2 text-sm text-blue-600 hover:underline"
            >
              Apply suggested
            </button>
            {(headers?.length ?? 0) > 10 && (
              <input
                type="text"
                placeholder="Filter columns..."
                value={columnFilter[key] || ''}
                onChange={(e) => setColumnFilter((c) => ({ ...c, [key]: e.target.value }))}
                className="mb-2 border rounded px-2 py-1 text-sm w-full max-w-xs"
              />
            )}
            <div className="space-y-2">
              {required.map((field) => {
                const sug = sugs.find((s) => s.targetField === field)
                const conf = sug && m[field] === sug.sourceColumn ? sug.confidence : null
                const filter = (columnFilter[key] || '').toLowerCase()
                let opts = filter ? (headers || []).filter((h) => h.toLowerCase().includes(filter)) : (headers || [])
                if (m[field] && !opts.includes(m[field])) opts = [m[field], ...opts]
                return (
                  <div key={field} className="flex items-center gap-2">
                    <span className="w-48 font-mono text-sm">{field} *</span>
                    <select
                      value={m[field] || ''}
                      onChange={(e) => setMapping(key, field, e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="">—</option>
                      {opts.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    {conf != null && (
                      <span className="text-xs text-slate-500" title="Suggestion confidence">
                        {Math.round(conf * 100)}%
                      </span>
                    )}
                    {m[field] && (
                      <button
                        type="button"
                        onClick={() => toggleLock(key, field)}
                        className={`p-1 rounded ${locked[field] ? 'text-amber-600 bg-amber-100' : 'text-slate-400 hover:text-slate-600'}`}
                        title={locked[field] ? 'Unlock' : 'Lock mapping'}
                      >
                        {locked[field] ? '🔒' : '🔓'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            </>
            )}
          </div>
        )
      })}

      <div className="flex justify-end gap-2">
        <button onClick={saveMappings} className="px-4 py-2 border rounded">
          Save mappings
        </button>
        <button
          onClick={async () => {
            await saveMappings()
            onNext()
          }}
          disabled={!allRequiredMet}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Next: Enum Mapping
        </button>
      </div>
    </div>
  )
}
