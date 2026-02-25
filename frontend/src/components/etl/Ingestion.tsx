import { useState } from 'react'
import { api } from '../../services/api'
import { DataTableWithSearch } from '../DataTableWithSearch'
import { DataModelPopover } from '../DataModelPopover'

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
  aiMode?: 'claude' | 'mocked'
  viewOnly?: boolean
}

const OBJECT_LABELS: Record<string, string> = {
  quote: 'Quote',
  load: 'Load',
  driver_vehicle: 'Driver+Vehicle',
}

const OBJECT_ORDER: ('quote' | 'load' | 'driver_vehicle')[] = ['load', 'quote', 'driver_vehicle']

export function Ingestion({ sessionData, onUpdate, onNext, canProceed, viewOnly }: IngestionProps) {
  const [generating, setGenerating] = useState<'all' | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeSheet, setActiveSheet] = useState<'quote' | 'load' | 'driver_vehicle'>('quote')

  const handleAddAll = async () => {
    setGenerating('all')
    setError(null)
    let state = { ...sessionData }
    try {
      const loadRes = await api.ingest.generate('load')
      const existingLoadRows = state.load?.rows ?? []
      const existingLoadIds = state.load?.loadIds ?? existingLoadRows.map((r) => String((r as Record<string, unknown>)['Load Number'] ?? ''))
      const newLoadIds = [...existingLoadIds, ...(loadRes.loadIds ?? [])]
      const newLoadRows = [...existingLoadRows, ...loadRes.rows]

      const quoteRes = await api.ingest.generate('quote', { loadIds: loadRes.loadIds })
      const existingQuoteRows = state.quote?.rows ?? []
      state = {
        ...state,
        load: { headers: loadRes.headers, rows: newLoadRows, loadIds: newLoadIds },
        quote: {
          headers: quoteRes.headers,
          rows: [...existingQuoteRows, ...quoteRes.rows],
        },
      }

      const dvRes = await api.ingest.generate('driver_vehicle', { loadRows: loadRes.rows })
      const updatedNewLoads = dvRes.updatedLoadRows ?? loadRes.rows
      const mergedLoadRows = [...existingLoadRows, ...updatedNewLoads]
      const existingDvRows = state.driver_vehicle?.rows ?? []
      state = {
        ...state,
        driver_vehicle: { headers: dvRes.headers, rows: [...existingDvRows, ...dvRes.rows] },
        load: { ...state.load!, rows: mergedLoadRows },
      }
      onUpdate(state)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenerating(null)
    }
  }

  const handleUpload = async (objectType: 'quote' | 'load' | 'driver_vehicle', file: File) => {
    setUploading(objectType)
    setError(null)
    try {
      const res = await api.ingest.upload(file)
      if (objectType === 'load') {
        onUpdate({ ...sessionData, load: { headers: res.headers, rows: res.rows } })
      } else if (objectType === 'quote') {
        onUpdate({ ...sessionData, quote: { headers: res.headers, rows: res.rows } })
      } else {
        onUpdate({ ...sessionData, driver_vehicle: { headers: res.headers, rows: res.rows } })
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(null)
    }
  }

  const activeData = sessionData[activeSheet]?.rows || []
  const hasAnyData = OBJECT_ORDER.some((k) => (sessionData[k]?.rows?.length ?? 0) > 0)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium text-[rgba(0,0,0,0.87)]">Ingestion</h2>
      <p className="text-[rgba(0,0,0,0.6)]">
        Add data for each object: upload CSV/Excel or generate sample data. You’ll map columns to the target schema in the next step.
      </p>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm">{error}</div>
      )}

      {!viewOnly && (
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={handleAddAll}
            disabled={!!generating}
            className="px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 text-sm"
          >
            {generating ? 'Adding...' : hasAnyData ? 'Add more (+100 quotes, +50 loads, +50 drivers)' : 'Add sample data'}
          </button>
          <DataModelPopover />
        </div>
      )}

      <div className="bg-white rounded-lg border border-black/12 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-black/[0.04] text-left text-sm">
              <th className="px-4 py-3 font-medium">Object</th>
              <th className="px-4 py-3 font-medium w-24">Status</th>
              <th className="px-4 py-3 font-medium w-20">Rows</th>
              {!viewOnly && <th className="px-4 py-3 font-medium">Action</th>}
            </tr>
          </thead>
          <tbody>
            {OBJECT_ORDER.map((key) => {
              const count = sessionData[key]?.rows?.length ?? 0
              const ready = count > 0
              return (
                <tr key={key} className="border-t border-black/8 hover:bg-black/[0.02]">
                  <td className="px-4 py-3 font-medium">{OBJECT_LABELS[key]}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-sm ${ready ? 'text-green-700' : 'text-[rgba(0,0,0,0.5)]'}`}>
                      {ready ? '✓' : '○'} {ready ? 'Ready' : 'Needed'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[rgba(0,0,0,0.6)]">{ready ? count : '—'}</td>
                  {!viewOnly && (
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-black/20 rounded-md text-sm font-medium cursor-pointer hover:bg-black/4">
                        <span className={uploading === key ? 'opacity-60' : ''}>Upload</span>
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
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {hasAnyData && (
        <div className="bg-white p-6 rounded-lg border border-black/12">
          <div className="flex gap-2 mb-3">
            {OBJECT_ORDER.map((key) => {
              const label = OBJECT_LABELS[key]
              const count = sessionData[key]?.rows?.length ?? 0
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveSheet(key)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${activeSheet === key ? 'bg-primary text-white' : 'bg-black/8 hover:bg-black/12'} ${count === 0 ? 'opacity-50' : ''}`}
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
