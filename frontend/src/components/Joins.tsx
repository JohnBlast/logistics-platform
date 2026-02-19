import { useState, useEffect } from 'react'
import { api, type Profile } from '../services/api'
import { DataModelPopover } from './DataModelPopover'
import { DataTableWithSearch } from './DataTableWithSearch'
import { AiWorkingIndicator } from './AiWorkingIndicator'

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
  onUpdate: (joins: Profile['joins']) => void
  onNext: () => void
  onSkip?: () => void
  onSaveProfile: (id: string, data: Partial<Profile>) => Promise<Profile>
}

export function Joins({ sessionData, profile, onUpdate, onNext, onSkip, onSaveProfile }: JoinsProps) {
  const [examplesExpanded, setExamplesExpanded] = useState(false)
  const [preview, setPreview] = useState<{
    before: { quote: number; load: number; dv: number }
    after: number
    flatRows: Record<string, unknown>[]
    joinSteps?: { name: string; leftKey: string; rightKey: string; fallbackKey?: string; rowsBefore: number; rowsAfter: number }[]
  } | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [nlInput, setNlInput] = useState('')
  const [nlResult, setNlResult] = useState<string | null>(null)
  const [interpreting, setInterpreting] = useState(false)
  const joins = (
    profile.aiMode === 'claude'
      ? (profile.joins || [])
      : (profile.joins || DEFAULT_JOINS)
  ) as typeof DEFAULT_JOINS

  const [lastInterpreted, setLastInterpreted] = useState<Record<string, unknown> | null>(null)

  const handleInterpret = async () => {
    if (!nlInput.trim()) return
    setNlResult(null)
    setLastInterpreted(null)
    setInterpreting(true)
    try {
      const res = await api.joins.interpret(nlInput.trim(), profile.aiMode)
      const structured = res.structured as Record<string, unknown>
      setLastInterpreted(structured)
      setNlResult(`Recognized: ${(structured as { name?: string }).name ?? 'join config'}`)
    } catch (e) {
      setNlResult((e as Error).message)
    } finally {
      setInterpreting(false)
    }
  }

  const handleAddInterpreted = () => {
    if (!lastInterpreted) return
    const newJoins = [...joins, lastInterpreted] as typeof DEFAULT_JOINS
    onUpdate(newJoins)
    setLastInterpreted(null)
    setNlInput('')
    setNlResult(null)
  }

  const runPreview = async () => {
    if (!sessionData.quote || !sessionData.load || !sessionData.driver_vehicle || !profile.id) return
    // In Claude mode with no joins configured: show 0 rows, don't run pipeline
    if (profile.aiMode === 'claude' && joins.length === 0) {
      setPreview({
        before: {
          quote: sessionData.quote.rows.length,
          load: sessionData.load.rows.length,
          dv: sessionData.driver_vehicle.rows.length,
        },
        after: 0,
        flatRows: [],
      })
      setPreviewError(null)
      return
    }
    setLoading(true)
    setPreviewError(null)
    try {
      const res = await api.pipeline.validate(profile.id, sessionData, { joinOnly: true, joinsOverride: joins })
      setPreview({
        before: {
          quote: sessionData.quote.rows.length,
          load: sessionData.load.rows.length,
          dv: sessionData.driver_vehicle.rows.length,
        },
        after: res.rowsSuccessful,
        flatRows: res.flatRows || [],
        joinSteps: res.joinSteps,
      })
    } catch (e) {
      setPreview(null)
      setPreviewError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const canPreview = !!(sessionData.quote && sessionData.load && sessionData.driver_vehicle && profile.id)
  const skipPipelineInClaude = profile.aiMode === 'claude' && joins.length === 0

  useEffect(() => {
    if (canPreview) {
      if (skipPipelineInClaude) {
        setPreview({
          before: {
            quote: sessionData.quote!.rows.length,
            load: sessionData.load!.rows.length,
            dv: sessionData.driver_vehicle!.rows.length,
          },
          after: 0,
          flatRows: [],
        })
        setPreviewError(null)
      } else {
        runPreview()
      }
    } else {
      setPreview(null)
      setPreviewError(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runPreview depends on sessionData, profile
  }, [canPreview, skipPipelineInClaude, profile.id, profile.aiMode, JSON.stringify(joins), sessionData.quote?.rows?.length, sessionData.load?.rows?.length, sessionData.driver_vehicle?.rows?.length])

  const saveJoins = async () => {
    await onSaveProfile(profile.id, { joins: joins.length ? joins : (profile.aiMode === 'claude' ? [] : DEFAULT_JOINS) })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium">Joins</h2>
        <DataModelPopover />
      </div>
      <p className="text-[rgba(0,0,0,0.6)]">
        Quote → Load → Driver+Vehicle. Rows without matching IDs are dropped. Keys: load_id, allocated_vehicle_id / driver_id.
      </p>
      {profile.aiMode === 'claude' && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          The pipeline uses a fixed join order (Quote→Load→Driver+Vehicle). Add joins below to document your configuration; the preview reflects the standard flow.
        </p>
      )}
      <p className="text-sm text-[rgba(0,0,0,0.6)]">
        Result: one row per <em>quote</em> that has a matching load and driver+vehicle. With 100 quotes and 50 loads (typically 2 quotes per load), you get ~100 rows. Quotes without loads are dropped.
      </p>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-medium mb-2">Join configuration</h3>
        {profile.aiMode === 'claude' ? (
          <p className="text-sm text-[rgba(0,0,0,0.6)] mb-3">
            Describe your join in natural language. Add each join to build the pipeline.
          </p>
        ) : (
          <p className="text-sm text-[rgba(0,0,0,0.6)] mb-3">
            Preset joins for Quote→Load and Load→Driver+Vehicle. Use NL to interpret custom keys.
          </p>
        )}
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
                <li>join quotes to loads on load_id</li>
                <li>join load to driver and vehicle on vehicle_id or driver_id</li>
                <li>Load→Driver+Vehicle on allocated_vehicle_id with fallback driver_id</li>
                <li>connect loads to driver+vehicles using vehicle ID and driver ID as fallback</li>
              </ul>
            </div>
          )}
        </div>
        <div className="mb-2 flex gap-2 flex-wrap items-center">
          <input
            type="text"
            placeholder={profile.aiMode === 'claude' ? 'e.g. join quotes to loads on load_id, then load to driver and vehicle on vehicle_id' : 'e.g. join quote to load on load_id'}
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            className="border border-black/20 rounded px-3 py-2 text-sm flex-1 min-w-[200px] max-w-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button onClick={handleInterpret} disabled={interpreting} className="px-4 py-2 border border-black/20 rounded font-medium hover:bg-black/4 disabled:opacity-50">
            {interpreting ? 'Interpreting...' : 'Interpret'}
          </button>
          {interpreting && <AiWorkingIndicator message="AI interpreting join..." />}
          {lastInterpreted && (
            <button onClick={handleAddInterpreted} className="px-4 py-2 bg-primary text-white rounded font-medium shadow-md-1 hover:bg-primary-dark">
              Add join
            </button>
          )}
        </div>
        {nlResult && (
          <p className={`text-sm mb-2 ${nlResult.startsWith('Recognized') ? 'text-green-700' : 'text-red-700'}`}>
            {nlResult}
          </p>
        )}
        {joins.length === 0 ? (
          <p className="text-sm text-[rgba(0,0,0,0.6)] italic">No joins configured. Use natural language above to add joins.</p>
        ) : (
        <ul className="space-y-2 text-sm">
          {joins.map((j, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="font-mono bg-black/8 px-2 py-0.5 rounded">{j.name}</span>
              <span className="text-[rgba(0,0,0,0.87)]">{j.leftEntity}.{j.leftKey} → {j.rightEntity}.{j.rightKey}</span>
              {j.fallbackKey && <span className="text-[rgba(0,0,0,0.6)]">(fallback: {j.fallbackKey})</span>}
              <button
                type="button"
                onClick={() => {
                  const next = joins.filter((_, idx) => idx !== i)
                  onUpdate(next)
                }}
                className="ml-auto text-red-600 hover:text-red-800 hover:underline text-xs font-medium"
                title="Remove join"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        )}
        <p className="text-[rgba(0,0,0,0.6)] text-xs mt-2">Fixed order per schema. Custom keys can be configured in future.</p>
      </div>

      {!canPreview && (
        <p className="text-sm text-[rgba(0,0,0,0.6)]">Generate data in Ingestion and complete Mapping first.</p>
      )}

      {previewError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          Preview failed: {previewError}
        </div>
      )}
      {preview && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-lg border border-black/12">
              <h3 className="font-medium mb-2">Input row counts</h3>
              <p className="text-sm">Quote: {preview.before.quote}</p>
              <p className="text-sm">Load: {preview.before.load}</p>
              <p className="text-sm">Driver+Vehicle: {preview.before.dv}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-black/12">
              <h3 className="font-medium mb-2">Join steps</h3>
              {preview.joinSteps && preview.joinSteps.length > 0 ? (
                <div className="space-y-2 text-sm">
                  {preview.joinSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="font-medium">{step.name}</span>
                      <span className="text-[rgba(0,0,0,0.6)]">
                        {step.leftKey} → {step.rightKey}
                        {step.fallbackKey && ` (fallback: ${step.fallbackKey})`}
                      </span>
                      <span className="text-primary font-medium">{step.rowsBefore} → {step.rowsAfter} rows</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[rgba(0,0,0,0.6)]">Add joins to see step-by-step results.</p>
              )}
              <p className="text-lg font-semibold mt-2">Final: {preview.after} rows</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-black/12">
            <h3 className="font-medium mb-3">Joined flat table</h3>
            {(preview.flatRows?.length ?? 0) > 0 ? (
              <DataTableWithSearch
                data={preview.flatRows ?? []}
                maxRows={50}
                searchPlaceholder="Search in table..."
              />
            ) : (
              <div className="border border-black/12 rounded-lg overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-black/4">
                      <th className="px-3 py-2 text-left font-medium text-[rgba(0,0,0,0.6)]">(no rows)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-4 text-[rgba(0,0,0,0.6)]">
                        No rows joined. Ensure: Quote.load_id matches Load.load_id; Load.allocated_vehicle_id or Load.driver_id matches Driver+Vehicle when present. Rows with null vehicle/driver links are still included with nulls in those columns.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        {onSkip && (
          <button onClick={onSkip} className="px-6 py-2.5 border border-black/20 rounded font-medium hover:bg-black/4">
            Skip
          </button>
        )}
        <button onClick={saveJoins} className="px-6 py-2.5 border border-black/20 rounded font-medium hover:bg-black/4">
          Save joins
        </button>
        <button
          onClick={async () => {
            await saveJoins()
            onNext()
          }}
          className="px-6 py-2.5 bg-primary text-white rounded font-medium shadow-md-1 hover:bg-primary-dark"
        >
          Next: Filtering
        </button>
      </div>
    </div>
  )
}
