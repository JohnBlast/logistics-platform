import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { DataTableWithSearch } from './DataTableWithSearch'

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

interface SchemaField {
  name: string
  type: string
  required: boolean
  description?: string
}

const OBJECT_SCHEMA_KEYS: Record<string, number[]> = {
  quote: [0],
  load: [1],
  driver_vehicle: [2, 3],
}

const OBJECT_LABELS: Record<string, string> = {
  quote: 'Quote',
  load: 'Load',
  driver_vehicle: 'Driver+Vehicle',
}

export function Ingestion({ sessionData, onUpdate, onNext, canProceed }: IngestionProps) {
  const [generating, setGenerating] = useState<'all' | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [schema, setSchema] = useState<{ entities: { name: string; fields: SchemaField[] }[] } | null>(null)
  const [activeSheet, setActiveSheet] = useState<'quote' | 'load' | 'driver_vehicle'>('quote')

  useEffect(() => {
    api.schema.get().then((r) => setSchema(r as { entities: { name: string; fields: SchemaField[] }[] })).catch(() => setSchema(null))
  }, [])

  const handleGenerateAll = async () => {
    setGenerating('all')
    let state = { ...sessionData }
    try {
      const loadRes = await api.ingest.generate('load')
      state = { ...state, load: { headers: loadRes.headers, rows: loadRes.rows, loadIds: loadRes.loadIds } }
      const quoteRes = await api.ingest.generate('quote', { loadIds: loadRes.loadIds })
      state = { ...state, quote: { headers: quoteRes.headers, rows: quoteRes.rows } }
      const dvRes = await api.ingest.generate('driver_vehicle', { loadRows: loadRes.rows })
      state = {
        ...state,
        driver_vehicle: { headers: dvRes.headers, rows: dvRes.rows },
        load: { ...state.load!, rows: dvRes.updatedLoadRows ?? loadRes.rows },
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

  const getFieldsForObject = (key: string): SchemaField[] => {
    if (!schema?.entities) return []
    const indices = OBJECT_SCHEMA_KEYS[key]
    if (!indices) return []
    const fields: SchemaField[] = []
    for (const i of indices) {
      const ent = schema.entities[i]
      if (ent?.fields) fields.push(...ent.fields)
    }
    return fields
  }

  const objects: { key: 'quote' | 'load' | 'driver_vehicle'; label: string }[] = [
    { key: 'quote', label: 'Quote' },
    { key: 'load', label: 'Load' },
    { key: 'driver_vehicle', label: 'Driver+Vehicle' },
  ]

  const activeData = sessionData[activeSheet]?.rows || []
  const hasAnyData = objects.some((o) => (sessionData[o.key]?.rows?.length ?? 0) > 0)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium text-[rgba(0,0,0,0.87)]">Ingestion</h2>
      <p className="text-[rgba(0,0,0,0.6)]">Upload CSV/Excel or generate dirty data for each object.</p>

      <div className="flex flex-wrap gap-4 items-start">
        <button
          onClick={handleGenerateAll}
          disabled={!!generating}
          className="px-6 py-2.5 bg-primary text-white rounded font-medium shadow-md-1 hover:bg-primary-dark disabled:opacity-50 uppercase text-sm tracking-wide"
        >
          {generating ? 'Generating...' : 'Generate dirty data'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {objects.map(({ key, label }) => {
          const data = sessionData[key]
          const count = data?.rows?.length ?? 0
          return (
            <div key={key} className="bg-white p-6 rounded shadow-md-1">
              <h3 className="font-medium mb-3 text-[rgba(0,0,0,0.87)]">{label}</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[rgba(0,0,0,0.6)] mb-2">Target schema fields</p>
                  <div className="overflow-x-auto max-h-32 border border-black/12 rounded">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-black/4">
                          <th className="px-2 py-1 text-left">Field</th>
                          <th className="px-2 py-1 text-left">Type</th>
                          <th className="px-2 py-1 text-left">Req</th>
                          <th className="px-2 py-1 text-left hidden sm:table-cell">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFieldsForObject(key).slice(0, 8).map((f) => (
                          <tr key={f.name} className="border-t">
                            <td className="px-2 py-1 font-mono">{f.name}{f.required ? '*' : ''}</td>
                            <td className="px-2 py-1">{f.type}</td>
                            <td className="px-2 py-1">{f.required ? '✓' : '-'}</td>
                            <td className="px-2 py-1 text-[rgba(0,0,0,0.6)] hidden sm:table-cell max-w-[120px] truncate" title={f.description}>{f.description || '—'}</td>
                          </tr>
                        ))}
                        {getFieldsForObject(key).length > 8 && (
                          <tr className="border-t"><td colSpan={4} className="px-2 py-1 text-[rgba(0,0,0,0.6)]">+{getFieldsForObject(key).length - 8} more</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <label className="inline-block px-4 py-2.5 border border-black/20 rounded text-sm cursor-pointer font-medium hover:bg-black/4">
                  Upload {label}
                  <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(key, f) }} disabled={!!uploading} />
                </label>
                {count > 0 && <p className="text-sm text-[rgba(0,0,0,0.6)]">{count} rows</p>}
                <button
                  type="button"
                  onClick={() => setActiveSheet(key)}
                  disabled={count === 0}
                  className={`block w-full text-left px-3 py-2 rounded text-sm ${activeSheet === key ? 'bg-primary/12 text-primary font-medium' : 'hover:bg-black/4'} ${count === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  View preview →
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {hasAnyData && (
        <div className="bg-white p-6 rounded shadow-md-1">
          <div className="flex gap-2 mb-3">
            {objects.map(({ key, label }) => {
              const count = sessionData[key]?.rows?.length ?? 0
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveSheet(key)}
                  className={`px-4 py-2 rounded text-sm font-medium ${activeSheet === key ? 'bg-primary text-white' : 'bg-black/8 hover:bg-black/12'} ${count === 0 ? 'opacity-50' : ''}`}
                >
                  {label} ({count})
                </button>
              )
            })}
          </div>
          <p className="text-sm text-[rgba(0,0,0,0.6)] mb-2">Preview: {OBJECT_LABELS[activeSheet]}</p>
          <DataTableWithSearch data={activeData} maxRows={25} searchPlaceholder="Search in table..." />
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={onNext} disabled={!canProceed} className="px-6 py-2.5 bg-primary text-white rounded font-medium shadow-md-1 hover:bg-primary-dark disabled:opacity-50">
          Next: Mapping
        </button>
      </div>
    </div>
  )
}
