import { useState, useEffect } from 'react'
import { api, type Profile } from '../services/api'
import { DataModelPopover } from './DataModelPopover'

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
  const enumMappings = profile.enumMappings || {}

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
          const res = await api.schema.suggestEnumMappings(distinct, validValues)
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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium">Enum Mapping</h2>
        <DataModelPopover />
      </div>
      <p className="text-slate-600">
        Map your source enum values to the target schema. Apply after mapping fields. Unmapped invalid values become null.
      </p>

      <div className="flex gap-2">
        <button
          onClick={applySuggested}
          disabled={applyingSuggested}
          className="px-4 py-2 bg-slate-200 rounded text-sm disabled:opacity-50"
        >
          {applyingSuggested ? 'Applying...' : 'Apply suggested'}
        </button>
      </div>

      {entities.map((objectType) => {
        const fields = entityEnumFields[objectType] || []
        const mappedFields = fields.filter((f) => profile.mappings?.[objectType]?.[f.field])

        if (mappedFields.length === 0) return null

        return (
          <div key={objectType} className="bg-white p-4 rounded shadow">
            <h3 className="font-medium mb-2">{ENTITY_LABELS[objectType]}</h3>
            {mappedFields.map(({ field, validValues }) => {
              const distinct = getDistinctValues(objectType, field)
              if (distinct.length === 0) return null
              return (
                <div key={field} className="mb-4">
                  <p className="text-sm font-mono text-slate-600 mb-2">
                    {field} → {profile.mappings?.[objectType]?.[field]}
                  </p>
                  <table className="w-full text-sm border">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left p-2">Source value</th>
                        <th className="text-left p-2">Map to</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distinct.map((src) => (
                        <tr key={src} className="border-t">
                          <td className="p-2 font-mono">{src}</td>
                          <td className="p-2">
                            <select
                              value={getMapping(objectType, field, src)}
                              onChange={(e) => setEnumMapping(objectType, field, src, e.target.value)}
                              className="border rounded px-2 py-1 w-full max-w-xs"
                            >
                              <option value="">— (null if invalid)</option>
                              {validValues.map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        )
      })}

      <div className="flex justify-end gap-2">
        {onSkip && (
          <button onClick={onSkip} className="px-4 py-2 border border-slate-300 rounded text-slate-600 hover:bg-slate-50">
            Skip
          </button>
        )}
        <button onClick={saveEnumMappings} className="px-4 py-2 border rounded">
          Save enum mappings
        </button>
        <button
          onClick={async () => {
            await saveEnumMappings()
            onNext()
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Next: Joins
        </button>
      </div>
    </div>
  )
}
