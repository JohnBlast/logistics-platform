import { useState, useEffect } from 'react'
import { api, type Profile } from '../services/api'
import { DataModelPopover } from './DataModelPopover'

const DEFAULT_JOINS = [
  { name: 'Quote→Load', leftEntity: 'quote', rightEntity: 'load', leftKey: 'load_id', rightKey: 'load_id' },
  { name: 'Load→Driver+Vehicle', leftEntity: 'load', rightEntity: 'driver_vehicle', leftKey: 'allocated_vehicle_id', rightKey: 'vehicle_id', fallbackKey: 'driver_id' },
]

interface JoinsProps {
  sessionData: {
    quote?: { headers: string[]; rows: Record<string, unknown>[] }
    load?: { headers: string[]; rows: Record<string, unknown>[] }
    driver_vehicle?: { headers: string[]; rows: Record<string, unknown>[] }
  }
  profile: Profile
  onNext: () => void
  onSkip?: () => void
  onSaveProfile: (id: string, data: Partial<Profile>) => Promise<Profile>
}

export function Joins({ sessionData, profile, onNext, onSkip, onSaveProfile }: JoinsProps) {
  const [preview, setPreview] = useState<{
    before: { quote: number; load: number; dv: number }
    after: number
    flatRows: Record<string, unknown>[]
    joinSteps?: { name: string; leftEntity: string; rightEntity: string; leftKey: string; rightKey: string; fallbackKey?: string; rowsBefore: number; rowsAfter: number }[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [nlInput, setNlInput] = useState('')
  const [nlResult, setNlResult] = useState<string | null>(null)
  const joins = (profile.joins || DEFAULT_JOINS) as typeof DEFAULT_JOINS

  const handleInterpret = async () => {
    if (!nlInput.trim()) return
    setNlResult(null)
    try {
      const res = await api.joins.interpret(nlInput.trim(), profile.aiMode)
      setNlResult(`Recognized: ${(res.structured as { name?: string }).name ?? 'join config'}`)
    } catch (e) {
      setNlResult((e as Error).message)
    }
  }

  const runPreview = async () => {
    if (!sessionData.quote || !sessionData.load || !sessionData.driver_vehicle || !profile.id) return
    setLoading(true)
    try {
      const res = await api.pipeline.validate(profile.id, sessionData, { joinOnly: true })
      setPreview({
        before: {
          quote: sessionData.quote.rows.length,
          load: sessionData.load.rows.length,
          dv: sessionData.driver_vehicle.rows.length,
        },
        after: res.rowsSuccessful,
        flatRows: res.flatRows || [],
        joinSteps: res.joinSteps || [],
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
  }, [sessionData.quote?.rows?.length, sessionData.load?.rows?.length, sessionData.driver_vehicle?.rows?.length, profile.id])

  const saveJoins = async () => {
    await onSaveProfile(profile.id, { joins: joins.length ? joins : DEFAULT_JOINS })
  }

  const SAMPLE = 5
  const sampleRows = preview?.flatRows?.slice(0, SAMPLE) || []
  const cols = sampleRows[0] ? Object.keys(sampleRows[0]) : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium">Joins</h2>
        <DataModelPopover />
      </div>
      <p className="text-slate-600">
        Quote → Load → Driver+Vehicle. Rows without matching IDs are dropped. Keys: load_id, allocated_vehicle_id / driver_id.
      </p>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-medium mb-2">Join configuration</h3>
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            placeholder="e.g. join quote to load on load_id"
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm flex-1 max-w-md"
          />
          <button onClick={handleInterpret} className="px-3 py-1.5 bg-slate-200 rounded text-sm">
            Interpret
          </button>
        </div>
        {nlResult && (
          <p className={`text-sm mb-2 ${nlResult.startsWith('Recognized') ? 'text-green-700' : 'text-red-700'}`}>
            {nlResult}
          </p>
        )}
        <ul className="space-y-2 text-sm">
          {joins.map((j, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{j.name}</span>
              <span>{j.leftEntity}.{j.leftKey} → {j.rightEntity}.{j.rightKey}</span>
              {j.fallbackKey && <span className="text-slate-500">(fallback: {j.fallbackKey})</span>}
            </li>
          ))}
        </ul>
        <p className="text-slate-500 text-xs mt-2">Fixed order per schema. Custom keys can be configured in future.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={runPreview}
          disabled={loading || !sessionData.quote || !sessionData.load || !sessionData.driver_vehicle}
          className="px-4 py-2 bg-slate-200 rounded text-sm disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Preview joins'}
        </button>
      </div>

      {preview && (
        <>
          {preview.joinSteps && preview.joinSteps.length > 0 && (
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-medium mb-3">How joins flow</h3>
              <div className="flex flex-wrap items-center gap-2">
                {preview.joinSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="text-slate-400">→</span>}
                    <div className="bg-slate-50 border rounded px-3 py-2">
                      <p className="font-medium text-sm">{step.name}</p>
                      <p className="text-xs text-slate-600">
                        {step.leftEntity}.{step.leftKey} ↔ {step.rightEntity}.{step.rightKey}
                      </p>
                      <p className="text-xs font-semibold mt-1">
                        {step.rowsBefore} → {step.rowsAfter} rows
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-medium mb-2">Before (entity row counts)</h3>
              <p>Quote: {preview.before.quote}</p>
              <p>Load: {preview.before.load}</p>
              <p>Driver+Vehicle: {preview.before.dv}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-medium mb-2">After (joined flat table)</h3>
              <p className="text-lg font-semibold">{preview.after} rows</p>
              {preview.after === 0 && (
                <p className="text-amber-600 text-sm mt-1">
                  No rows joined. Check: load_ids in Quote match Load.load_id; Load has allocated_vehicle_id or driver_id matching Driver+Vehicle.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {sampleRows.length > 0 && (
        <details className="bg-white p-4 rounded shadow">
          <summary className="font-medium cursor-pointer">Sample flat rows (first {SAMPLE})</summary>
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
        <button onClick={saveJoins} className="px-4 py-2 border rounded">
          Save joins
        </button>
        <button
          onClick={async () => {
            await saveJoins()
            onNext()
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Next: Filtering
        </button>
      </div>
    </div>
  )
}
