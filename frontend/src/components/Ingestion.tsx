import { useState, useEffect } from 'react'
import { api } from '../services/api'

interface SessionDataShape {
  quote?: { headers: string[]; rows: Record<string, unknown>[] }
  load?: { headers: string[]; rows: Record<string, unknown>[]; loadIds?: string[] }
  driver_vehicle?: { headers: string[]; rows: Record<string, unknown>[] }
}

interface IngestionProps {
  sessionData: SessionDataShape
  onUpdate: (data: SessionDataShape) => void
  onNext: () => void
  canProceed: boolean
}

const OBJECT_SCHEMA_KEYS: Record<string, number[]> = {
  quote: [0],
  load: [1],
  driver_vehicle: [2, 3],
}

export function Ingestion({ sessionData, onUpdate, onNext, canProceed }: IngestionProps) {
  const [generating, setGenerating] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [schema, setSchema] = useState<{ entities: { name: string; fields: { name: string; required: boolean }[] }[] } | null>(null)

  useEffect(() => {
    api.schema.get().then(setSchema).catch(() => setSchema(null))
  }, [])

  const handleGenerate = async (objectType: 'load' | 'quote' | 'driver_vehicle') => {
    setGenerating(objectType)
    let state = { ...sessionData }
    try {
      if (objectType === 'load') {
        const res = await api.ingest.generate('load')
        state = { ...state, load: { headers: res.headers, rows: res.rows, loadIds: res.loadIds } }
      } else if (objectType === 'quote') {
        if (!state.load?.loadIds?.length) {
          const loadRes = await api.ingest.generate('load')
          state = { ...state, load: { headers: loadRes.headers, rows: loadRes.rows, loadIds: loadRes.loadIds } }
        }
        const res = await api.ingest.generate('quote', { loadIds: state.load!.loadIds })
        state = { ...state, quote: { headers: res.headers, rows: res.rows } }
      } else {
        if (!state.load?.rows?.length) {
          const loadRes = await api.ingest.generate('load')
          state = { ...state, load: { headers: loadRes.headers, rows: loadRes.rows, loadIds: loadRes.loadIds } }
        }
        const res = await api.ingest.generate('driver_vehicle', { loadRows: state.load!.rows })
        state = {
          ...state,
          driver_vehicle: { headers: res.headers, rows: res.rows },
          load: { ...state.load!, rows: res.updatedLoadRows || state.load!.rows },
        }
      }
      onUpdate(state)
    } finally {
      setGenerating(null)
    }
  }

  const handleUpload = async (objectType: 'quote' | 'load' | 'driver_vehicle', file: File) => {
    setUploading(objectType)
    try {
      const res = await api.ingest.upload(file)
      if (objectType === 'load') {
        onUpdate({ ...sessionData, load: { headers: res.headers, rows: res.rows } })
      } else if (objectType === 'quote') {
        onUpdate({ ...sessionData, quote: { headers: res.headers, rows: res.rows } })
      } else {
        onUpdate({ ...sessionData, driver_vehicle: { headers: res.headers, rows: res.rows } })
      }
    } finally {
      setUploading(null)
    }
  }

  const objects = [
    { key: 'quote' as const, label: 'Quote' },
    { key: 'load' as const, label: 'Load' },
    { key: 'driver_vehicle' as const, label: 'Driver+Vehicle' },
  ]

  const getFieldsForObject = (key: string) => {
    if (!schema?.entities) return []
    const indices = OBJECT_SCHEMA_KEYS[key]
    if (!indices) return []
    const fields: { name: string; required: boolean }[] = []
    for (const i of indices) {
      const ent = schema.entities[i]
      if (ent?.fields) fields.push(...ent.fields.map((f) => ({ name: f.name, required: f.required })))
    }
    return fields.slice(0, 12)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Ingestion</h2>
      <p className="text-slate-600">Upload CSV/Excel or generate dirty data for each object.</p>

      <div className="grid grid-cols-3 gap-4">
        {objects.map(({ key, label }) => {
          const data = sessionData[key]
          const count = data?.rows?.length ?? 0
          return (
            <div key={key} className="bg-white p-4 rounded shadow">
              <h3 className="font-medium mb-2">{label}</h3>
              {schema && (
                <details className="mb-2">
                  <summary className="cursor-pointer text-xs text-slate-500">Target fields</summary>
                  <div className="mt-1 text-xs text-slate-600 space-y-0.5">
                    {getFieldsForObject(key).map((f) => (
                      <span key={f.name} className="font-mono mr-1">
                        {f.name}{f.required ? '*' : ''}
                      </span>
                    ))}
                  </div>
                </details>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerate(key)}
                  disabled={!!generating}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
                >
                  {generating === key ? '...' : 'Generate'}
                </button>
                <label className="px-3 py-2 border rounded text-sm cursor-pointer">
                  Upload
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleUpload(key, f)
                    }}
                    disabled={!!uploading}
                  />
                </label>
              </div>
              {count > 0 && <p className="mt-2 text-sm text-slate-600">{count} rows</p>}
              {data?.rows?.length && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">Preview (5 rows)</summary>
                  <pre className="mt-1 text-xs overflow-auto max-h-32">
                    {JSON.stringify(data.rows.slice(0, 5), null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Next: Mapping
        </button>
      </div>
    </div>
  )
}
