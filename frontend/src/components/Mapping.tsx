import { useEffect, useState } from 'react'
import { api, type Profile } from '../services/api'
import { DataModelPopover } from './DataModelPopover'
import { AiWorkingIndicator } from './AiWorkingIndicator'

const SCHEMA_KEYS: Record<string, number[]> = { quote: [0], load: [1], driver_vehicle: [2, 3] }

/** Derive all fields and required fields from schema entities */
function getFieldsFromSchema(
  schema: { entities: { fields: { name: string; required?: boolean }[] }[] } | null,
  objectType: 'quote' | 'load' | 'driver_vehicle'
): { all: string[]; required: string[] } {
  if (!schema?.entities) return { all: [], required: [] }
  const indices = SCHEMA_KEYS[objectType] || []
  const all: string[] = []
  const required: string[] = []
  const seen = new Set<string>()
  for (const i of indices) {
    for (const f of schema.entities[i]?.fields || []) {
      if (!seen.has(f.name)) {
        seen.add(f.name)
        all.push(f.name)
        if (f.required) required.push(f.name)
      }
    }
  }
  return { all, required }
}

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
  date_created: 'Date created',
  distance_km: 'Distance (km)',
  associated_fleet_id: 'Fleet ID',
  fleet_quoter_name: 'Quoter name',
  requested_vehicle_type: 'Vehicle type requested',
  collection_town: 'Collection town',
  collection_city: 'Collection city',
  collection_time: 'Collection time',
  collection_date: 'Collection date',
  delivery_town: 'Delivery town',
  delivery_city: 'Delivery city',
  delivery_time: 'Delivery time',
  delivery_date: 'Delivery date',
  completion_date: 'Completion date',
  number_of_items: 'Number of items',
  email: 'Email',
  phone: 'Phone',
  capacity_kg: 'Capacity (kg)',
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
  const [schema, setSchema] = useState<{ entities: { fields: { name: string; description?: string; required?: boolean }[] }[] } | null>(null)

  useEffect(() => {
    api.schema.get().then((r) => setSchema(r as { entities: { fields: { name: string; description?: string; required?: boolean }[] }[] })).catch(() => setSchema(null))
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

  const quoteFields = getFieldsFromSchema(schema, 'quote')
  const loadFields = getFieldsFromSchema(schema, 'load')
  const dvFields = getFieldsFromSchema(schema, 'driver_vehicle')
  const requiredMet = (obj: Record<string, string>, required: string[]) =>
    required.every((r) => obj[r])
  const allRequiredMet =
    requiredMet(quoteMappings, quoteFields.required) &&
    requiredMet(loadMappings, loadFields.required) &&
    requiredMet(dvMappings, dvFields.required)

  const saveMappings = async () => {
    await onSaveProfile(profile.id, { mappings, lockedMappings })
  }

  const dataMap = [
    { key: 'quote' as const, label: 'Quote', allFields: quoteFields.all, required: quoteFields.required, headers: sessionData.quote?.headers, mappings: quoteMappings },
    { key: 'load' as const, label: 'Load', allFields: loadFields.all, required: loadFields.required, headers: sessionData.load?.headers, mappings: loadMappings },
    { key: 'driver_vehicle' as const, label: 'Driver+Vehicle', allFields: dvFields.all, required: dvFields.required, headers: sessionData.driver_vehicle?.headers, mappings: dvMappings },
  ]

  const countMapped = (m: Record<string, string>, keys: string[]) =>
    keys.filter((k) => m[k]).length
  const totalFields = quoteFields.all.length + loadFields.all.length + dvFields.all.length
  const mappedCount =
    countMapped(quoteMappings, quoteFields.all) +
    countMapped(loadMappings, loadFields.all) +
    countMapped(dvMappings, dvFields.all)

  const inputClass = "border border-black/20 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"

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

      {dataMap.map(({ key, label, allFields, required, headers, mappings: m }) => {
        const sugs = suggestions[key] || []
        const locked = lockedMappings[key] || {}
        const unmappedRequired = required.filter((r) => !m[r])
        const errorSuggestions = unmappedRequired
          .map((field) => {
            const s = sugs.find((x) => x.targetField === field)
            return s ? { field, sourceColumn: s.sourceColumn } : null
          })
          .filter(Boolean) as { field: string; sourceColumn: string }[]

        const aiAppliedCount = allFields.filter((f) => {
          const s = sugs.find((x) => x.targetField === f)
          return s && m[f] === s.sourceColumn
        }).length
        const manualCount = countMapped(m, allFields) - aiAppliedCount
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
                ({countMapped(m, allFields)}/{allFields.length} mapped)
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
              {allFields.map((field) => {
                const sug = sugs.find((s) => s.targetField === field)
                const isAiApplied = sug && m[field] === sug.sourceColumn
                const isManualApplied = m[field] && (!sug || m[field] !== sug.sourceColumn)
                const desc = getFieldDesc(key, field)
                let opts = headers || []
                if (m[field] && !opts.includes(m[field])) opts = [m[field], ...opts]
                return (
                  <div
                    key={field}
                    className={`grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-2 items-center border-b border-black/6 pb-2 pt-1 ${
                      isAiApplied ? 'bg-green-50/80 -mx-2 px-3 py-2 rounded-lg border-l-4 border-l-green-500 ml-0' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[rgba(0,0,0,0.87)] font-medium">{fieldLabel(field)}</span>
                        {required.includes(field) && <span className="text-red-500">*</span>}
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
                      </div>
                      {desc && <p className="text-xs text-[rgba(0,0,0,0.6)] mt-0.5">{desc}</p>}
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
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
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
