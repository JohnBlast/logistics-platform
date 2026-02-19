import { useState, useEffect, useRef } from 'react'
import { api, type Profile } from '../services/api'
import { DataModelPopover } from './DataModelPopover'
import { AiWorkingIndicator } from './AiWorkingIndicator'

type ObjectType = 'quote' | 'load' | 'driver_vehicle'

const ENTITY_LABELS: Record<ObjectType, string> = {
  quote: 'Quote',
  load: 'Load',
  driver_vehicle: 'Driver+Vehicle',
}

interface EnumMappingProps {
  sessionData: {
    quote?: { headers: string[]; rows: Record<string, unknown>[] }
    load?: { headers: string[]; rows: Record<string, unknown>[] }
    driver_vehicle?: { headers: string[]; rows: Record<string, unknown>[] }
  }
  profile: Profile
  onUpdate: (enumMappings: Profile['enumMappings']) => void
  onNext: () => void
  onSkip?: () => void
  onSaveProfile: (id: string, data: Partial<Profile>) => Promise<Profile>
}

export function EnumMapping({ sessionData, profile, onUpdate, onNext, onSkip, onSaveProfile }: EnumMappingProps) {
  const [entityEnumFields, setEntityEnumFields] = useState<Record<string, { field: string; validValues: string[] }[]>>({})
  const [applyingSuggested, setApplyingSuggested] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [pendingSelections, setPendingSelections] = useState<Record<string, Set<string>>>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const focusedBlockRef = useRef<HTMLDivElement | null>(null)
  const enumMappings = profile.enumMappings || {}

  useEffect(() => {
    if (!focusedField) return
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (focusedBlockRef.current?.contains(target)) return
      const parts = focusedField.split(':')
      if (parts.length >= 3) {
        const objectType = parts[0] as ObjectType
        const field = parts[1]
        const targetValue = parts.slice(2).join(':')
        applyPending(objectType, field, targetValue)
      }
      setFocusedField(null)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [focusedField, pendingSelections])

  useEffect(() => {
    if (profile.aiMode === 'claude' && Object.keys(entityEnumFields).length > 0) {
      applySuggested()
    }
  }, [profile.aiMode, entityEnumFields])

  useEffect(() => {
    const entities: ObjectType[] = ['quote', 'load', 'driver_vehicle']
    Promise.all(entities.map((e) => api.schema.enumFields(e)))
      .then((results) => {
        const map: Record<string, { field: string; validValues: string[] }[]> = {}
        entities.forEach((e, i) => {
          map[e] = results[i]?.enumFields ?? []
        })
        setEntityEnumFields(map)
      })
      .catch(() => setEntityEnumFields({}))
  }, [])

  const getDistinctValues = (objectType: ObjectType, field: string): string[] => {
    const mappings = profile.mappings?.[objectType] || {}
    const sourceCol = mappings[field]
    if (!sourceCol) return []
    const data = sessionData[objectType]?.rows || []
    const set = new Set<string>()
    for (const row of data) {
      const v = row[sourceCol]
      if (v != null && String(v).trim() !== '') set.add(String(v))
    }
    return [...set].sort()
  }

  const setEnumMapping = (objectType: ObjectType, field: string, sourceValue: string, targetValue: string) => {
    const next = { ...enumMappings }
    if (!next[objectType]) next[objectType] = {}
    if (!next[objectType][field]) next[objectType][field] = {}
    if (targetValue === '') {
      delete next[objectType][field][sourceValue]
      if (Object.keys(next[objectType][field]).length === 0) delete next[objectType][field]
      if (Object.keys(next[objectType]).length === 0) delete next[objectType]
    } else {
      next[objectType][field][sourceValue] = targetValue
    }
    onUpdate(Object.keys(next).length ? next : {})
  }

  const getMapping = (objectType: ObjectType, field: string, sourceValue: string): string =>
    enumMappings[objectType]?.[field]?.[sourceValue] ?? ''

  const fieldKey = (objectType: string, field: string) => `${objectType}:${field}`

  const togglePending = (k: string, v: string) => {
    setPendingSelections((prev) => {
      const next = new Set(prev[k] || [])
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return { ...prev, [k]: next }
    })
  }

  const applyPending = (objectType: ObjectType, field: string, targetValue: string) => {
    const k = fieldKey(objectType, field) + ':' + targetValue
    const pending = pendingSelections[k]
    if (!pending || pending.size === 0) return
    const next = { ...enumMappings }
    if (!next[objectType]) next[objectType] = {}
    if (!next[objectType][field]) next[objectType][field] = {}
    for (const v of pending) {
      next[objectType][field][v] = targetValue
    }
    onUpdate(next)
    setPendingSelections((s) => ({ ...s, [k]: new Set() }))
    setInputValue('')
  }

  const clearPending = (k: string) => {
    setPendingSelections((s) => ({ ...s, [k]: new Set() }))
  }

  const applySuggested = async () => {
    setApplyingSuggested(true)
    try {
      let next: Profile['enumMappings'] = { ...enumMappings }
      for (const objectType of entities) {
        const fields = entityEnumFields[objectType] || []
        const mappedFields = fields.filter((f) => profile.mappings?.[objectType]?.[f.field])
        for (const { field, validValues } of mappedFields) {
          const distinct = getDistinctValues(objectType, field)
          if (distinct.length === 0) continue
          const res = await api.schema.suggestEnumMappings(distinct, validValues, profile.aiMode)
          const sugs = Object.fromEntries(Object.entries(res.suggestions || {}).filter(([, v]) => v))
          if (Object.keys(sugs).length === 0) continue
          next = {
            ...next,
            [objectType]: {
              ...next[objectType],
              [field]: { ...(next[objectType]?.[field] || {}), ...sugs },
            },
          }
        }
      }
      onUpdate(Object.keys(next).length ? next : {})
    } finally {
      setApplyingSuggested(false)
    }
  }

  const saveEnumMappings = async () => {
    await onSaveProfile(profile.id, { enumMappings: enumMappings })
  }

  const entities: ObjectType[] = ['quote', 'load', 'driver_vehicle']

  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium">Enum Mapping</h2>
        <DataModelPopover />
      </div>
      <p className="text-[rgba(0,0,0,0.6)]">
        Map your source values to our fixed schema enums (1:Many). For each target enum, multi-select which source values map to it. Unmapped values become null.
      </p>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={applySuggested}
          disabled={applyingSuggested}
          className="px-6 py-2.5 border border-black/20 rounded font-medium hover:bg-black/4 disabled:opacity-50"
        >
          {applyingSuggested ? 'Applying...' : 'Apply suggested'}
        </button>
        {applyingSuggested && <AiWorkingIndicator message="AI suggesting enum mappings..." />}
      </div>

      {entities.map((objectType) => {
        const fields = entityEnumFields[objectType] || []
        const mappedFields = fields.filter((f) => profile.mappings?.[objectType]?.[f.field])

        if (mappedFields.length === 0) return null

        return (
          <div key={objectType} className="bg-white p-6 rounded shadow-md-1">
            <h3 className="font-medium mb-3">{ENTITY_LABELS[objectType]}</h3>
            {mappedFields.map(({ field, validValues }) => {
              const distinct = getDistinctValues(objectType, field)
              if (distinct.length === 0) return null

              return (
                <div key={field} className="mb-6 last:mb-0">
                  <p className="text-sm font-mono text-[rgba(0,0,0,0.6)] mb-3">
                    {field} ← {profile.mappings?.[objectType]?.[field]}
                  </p>
                  <div className="space-y-4">
                    {validValues.map((targetValue) => {
                      const k = fieldKey(objectType, field) + ':' + targetValue
                      const isFocused = focusedField === k
                      const q = inputValue.toLowerCase()
                      const alreadyMapped = distinct.filter((s) => getMapping(objectType, field, s) === targetValue)
                      const mappedElsewhere = distinct.filter((s) => {
                        const m = getMapping(objectType, field, s)
                        return m && m !== targetValue
                      })
                      const available = distinct.filter(
                        (v) => !alreadyMapped.includes(v) && !mappedElsewhere.includes(v) && (q === '' || v.toLowerCase().includes(q))
                      )
                      const pending = pendingSelections[k] || new Set<string>()
                      const pendingCount = pending.size
                      const removeMapped = (v: string) => setEnumMapping(objectType, field, v, '')

                      return (
                        <div
                          key={targetValue}
                          ref={(el) => { if (isFocused) focusedBlockRef.current = el; else if (focusedBlockRef.current === el) focusedBlockRef.current = null }}
                          className="border border-black/12 rounded-lg p-3 bg-black/[0.02]"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-primary shrink-0">→ {targetValue}</span>
                            <span className="text-xs text-[rgba(0,0,0,0.5)]">(our enum)</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="relative flex-1 min-w-[180px]">
                              <input
                                type="text"
                                value={isFocused ? inputValue : ''}
                                onChange={(e) => {
                                  setInputValue(e.target.value)
                                  setFocusedField(k)
                                }}
                                onFocus={() => setFocusedField(k)}
                                onBlur={(e) => {
                                  const next = e.relatedTarget as Node | null
                                  if (dropdownRef.current?.contains(next)) return
                                  if (pendingCount > 0) applyPending(objectType, field, targetValue)
                                  setTimeout(() => setFocusedField(null), 150)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    if (pendingCount > 0) applyPending(objectType, field, targetValue)
                                    else if (available.length > 0) togglePending(k, available[0])
                                  }
                                }}
                                placeholder="Search & multi-select source values..."
                                className="border border-black/20 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                              {isFocused && available.length > 0 && (
                                <div
                                  ref={dropdownRef}
                                  className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-black/20 rounded shadow-lg max-h-48 overflow-y-auto"
                                  onMouseDown={(e) => e.preventDefault()}
                                >
                                  <div className="sticky top-0 bg-white border-b border-black/12 px-2 py-1.5 flex items-center justify-between gap-2">
                                    <span className="text-xs text-[rgba(0,0,0,0.6)]">
                                      {pendingCount > 0 ? `${pendingCount} selected` : 'Select multiple, then Add'}
                                    </span>
                                    {pendingCount > 0 && (
                                      <>
                                        <button
                                          type="button"
                                          onMouseDown={(ev) => { ev.preventDefault(); applyPending(objectType, field, targetValue); setFocusedField(null); }}
                                          className="text-xs font-medium text-primary hover:underline"
                                        >
                                          Add {pendingCount}
                                        </button>
                                        <button
                                          type="button"
                                          onMouseDown={(ev) => { ev.preventDefault(); clearPending(k); }}
                                          className="text-xs text-[rgba(0,0,0,0.5)] hover:underline"
                                        >
                                          Clear
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  {available.slice(0, 20).map((v) => (
                                    <label
                                      key={v}
                                      className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-black/6 cursor-pointer font-mono"
                                      onMouseDown={(e) => e.preventDefault()}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={pending.has(v)}
                                        onChange={() => togglePending(k, v)}
                                        className="rounded border-black/30"
                                      />
                                      <span>{v}</span>
                                    </label>
                                  ))}
                                  {available.length > 20 && (
                                    <p className="px-2 py-1 text-xs text-[rgba(0,0,0,0.6)]">+{available.length - 20} more. Type to narrow.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {alreadyMapped.map((v) => (
                              <span
                                key={v}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/15 text-primary text-xs rounded font-mono"
                              >
                                {v}
                                <button type="button" onClick={() => removeMapped(v)} className="hover:text-red-600" aria-label="Remove">×</button>
                              </span>
                            ))}
                          </div>
                          {alreadyMapped.length === 0 && (
                            <p className="text-xs text-[rgba(0,0,0,0.5)] mt-1">No source values mapped yet</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-2 text-xs text-[rgba(0,0,0,0.6)]">
                    Mapped: {distinct.filter((s) => getMapping(objectType, field, s)).length} / {distinct.length}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      <div className="flex justify-end gap-2">
        {onSkip && (
          <button onClick={onSkip} className="px-6 py-2.5 border border-black/20 rounded font-medium hover:bg-black/4 text-[rgba(0,0,0,0.6)]">
            Skip
          </button>
        )}
        <button onClick={saveEnumMappings} className="px-6 py-2.5 border border-black/20 rounded font-medium hover:bg-black/4">
          Save enum mappings
        </button>
        <button
          onClick={async () => {
            await saveEnumMappings()
            onNext()
          }}
          className="px-6 py-2.5 bg-primary text-white rounded font-medium shadow-md-1 hover:bg-primary-dark"
        >
          Next: Joins
        </button>
      </div>
    </div>
  )
}
