import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { PipelineDataTabs } from '../components/PipelineDataTabs'
import { usePipelineOutput } from '../context/PipelineOutputContext'

const MAX_TOTAL_ROWS = 2000
const BATCH_ROWS = 100 + 50 + 50 // quote + load + driver_vehicle per Add
const SIMULATE_STORAGE_KEY = 'simulate_pipeline_session'

type SessionData = {
  quote: { headers: string[]; rows: Record<string, unknown>[] }
  load: { headers: string[]; rows: Record<string, unknown>[] }
  driver_vehicle: { headers: string[]; rows: Record<string, unknown>[] }
}

type Outputs = {
  flatRows: Record<string, unknown>[]
  quoteRows: Record<string, unknown>[]
  loadRows: Record<string, unknown>[]
  vehicleDriverRows: Record<string, unknown>[]
}

function loadSimulateFromStorage(): {
  sessionData: SessionData | null
  outputs: Outputs | null
  runSummary: { rowsSuccessful: number; rowsDropped: number } | null
} {
  try {
    const raw = sessionStorage.getItem(SIMULATE_STORAGE_KEY)
    if (!raw) return { sessionData: null, outputs: null, runSummary: null }
    const parsed = JSON.parse(raw) as { sessionData?: unknown; outputs?: unknown; runSummary?: unknown }
    const sd = parsed.sessionData as SessionData | undefined
    const out = parsed.outputs as Outputs | undefined
    const validSession =
      sd?.quote?.rows &&
      Array.isArray(sd.quote.rows) &&
      sd?.load?.rows &&
      Array.isArray(sd.load.rows) &&
      sd?.driver_vehicle?.rows &&
      Array.isArray(sd.driver_vehicle.rows)
    const validOutputs = !out || (out && Array.isArray(out.flatRows))
    if (!validSession && !validOutputs) return { sessionData: null, outputs: null, runSummary: null }
    return {
      sessionData: validSession ? sd : null,
      outputs: validOutputs && out ? out : null,
      runSummary: (parsed.runSummary as { rowsSuccessful: number; rowsDropped: number }) ?? null,
    }
  } catch {
    return { sessionData: null, outputs: null, runSummary: null }
  }
}

function saveSimulateToStorage(
  sessionData: SessionData | null,
  outputs: Outputs | null,
  runSummary: { rowsSuccessful: number; rowsDropped: number } | null
): void {
  try {
    if (!sessionData && !outputs) {
      sessionStorage.removeItem(SIMULATE_STORAGE_KEY)
    } else {
      sessionStorage.setItem(
        SIMULATE_STORAGE_KEY,
        JSON.stringify({ sessionData, outputs, runSummary })
      )
    }
  } catch {
    /* ignore quota or parse errors */
  }
}

export function ShowOverallData() {
  const initialState = loadSimulateFromStorage()
  const [profiles, setProfiles] = useState<{ status: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionData, setSessionData] = useState<SessionData | null>(initialState.sessionData)
  const [outputs, setOutputs] = useState<Outputs | null>(initialState.outputs)
  const [runSummary, setRunSummary] = useState<{ rowsSuccessful: number; rowsDropped: number } | null>(
    initialState.runSummary
  )
  const [generating, setGenerating] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.profiles.list().then(setProfiles).catch((e) => setError((e as Error).message)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    saveSimulateToStorage(sessionData, outputs, runSummary)
  }, [sessionData, outputs, runSummary])

  const { setPipelineOutput, clearPipelineOutput } = usePipelineOutput()
  const hasActive = profiles.some((p: { status: string }) => p.status === 'active')

  const totalRows = sessionData
    ? sessionData.quote.rows.length + sessionData.load.rows.length + sessionData.driver_vehicle.rows.length
    : 0
  const atRowLimit = totalRows >= MAX_TOTAL_ROWS
  const wouldExceedLimit = totalRows + BATCH_ROWS > MAX_TOTAL_ROWS

  const handleAdd = async () => {
    if (wouldExceedLimit) return
    setGenerating(true)
    setError(null)
    setOutputs(null)
    setRunSummary(null)
    try {
      const loadRes = await api.ingest.generate('load')
      const quoteRes = await api.ingest.generate('quote', { loadIds: loadRes.loadIds })
      const dvRes = await api.ingest.generate('driver_vehicle', { loadRows: loadRes.rows })
      const newData = {
        quote: { headers: quoteRes.headers, rows: quoteRes.rows },
        load: { headers: loadRes.headers, rows: dvRes.updatedLoadRows || loadRes.rows },
        driver_vehicle: { headers: dvRes.headers, rows: dvRes.rows },
      }
      if (sessionData) {
        setSessionData({
          quote: {
            headers: newData.quote.headers,
            rows: [...sessionData.quote.rows, ...newData.quote.rows],
          },
          load: {
            headers: newData.load.headers,
            rows: [...sessionData.load.rows, ...newData.load.rows],
          },
          driver_vehicle: {
            headers: newData.driver_vehicle.headers,
            rows: [...sessionData.driver_vehicle.rows, ...newData.driver_vehicle.rows],
          },
        })
      } else {
        setSessionData(newData)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  const handleClear = () => {
    setSessionData(null)
    setOutputs(null)
    setRunSummary(null)
    clearPipelineOutput()
  }

  const handleRun = async () => {
    if (!sessionData) return
    setRunning(true)
    setError(null)
    setRunSummary(null)
    try {
      const res = await api.pipeline.run(sessionData)
      const data = {
        flatRows: res.flatRows ?? [],
        quoteRows: res.quoteRows ?? [],
        loadRows: res.loadRows ?? [],
        vehicleDriverRows: res.vehicleDriverRows ?? [],
        truncated: res.truncated,
        totalRows: res.totalRows,
      }
      setOutputs(data)
      setRunSummary({ rowsSuccessful: res.rowsSuccessful, rowsDropped: res.rowsDropped })
      setPipelineOutput(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setRunning(false)
    }
  }

  if (loading) return <div className="text-[rgba(0,0,0,0.6)]">Loading...</div>

  if (error && !hasActive) {
    return (
      <div>
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">{error}</div>
        <Link to="/etl" className="text-primary hover:underline font-medium">← Back to profiles</Link>
      </div>
    )
  }

  if (!hasActive) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-6 rounded">
        <h2 className="text-lg font-medium mb-2">No Active Profile</h2>
        <p>Save a configuration first to use Show Overall Data.</p>
        <Link to="/etl" className="text-primary hover:underline font-medium mt-2 inline-block">
          Go to Configuration Profiles →
        </Link>
      </div>
    )
  }

  const hasRun = outputs !== null

  return (
    <div>
      <h1 className="text-2xl font-medium mb-4 text-[rgba(0,0,0,0.87)]">Show Overall Data & Simulate Pipeline</h1>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">{error}</div>
      )}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          data-testid="add-data"
          onClick={handleAdd}
          disabled={generating || wouldExceedLimit}
          className="px-6 py-2.5 bg-primary text-white rounded font-medium shadow-md-1 hover:bg-primary-dark disabled:opacity-50"
        >
          {generating ? 'Adding...' : wouldExceedLimit ? 'Maximum 2000 rows. Clear to add more.' : 'Add (+100 quotes, +50 loads, +50 drivers)'}
        </button>
        <button
          data-testid="run-pipeline"
          onClick={handleRun}
          disabled={!sessionData || running}
          className="px-6 py-2.5 bg-green-600 text-white rounded font-medium shadow-md-1 hover:bg-green-700 disabled:opacity-50"
        >
          {running ? 'Running...' : 'Run Pipeline'}
        </button>
        {sessionData && (
          <button
            onClick={handleClear}
            disabled={running}
            className="px-6 py-2.5 border border-black/20 rounded font-medium hover:bg-black/4 disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>
      {sessionData && (
        <>
          <p className="text-sm text-[rgba(0,0,0,0.6)] mb-2">
            {sessionData.quote.rows.length} quotes · {sessionData.load.rows.length} loads · {sessionData.driver_vehicle.rows.length} drivers
          </p>
          {atRowLimit && (
            <p className="text-sm text-amber-600 mb-2">Maximum 2000 rows. Clear to add more.</p>
          )}
        </>
      )}
      {runSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-lg shadow-md-1 border border-green-200 bg-green-50/50">
            <p className="text-sm font-medium text-green-800">Combined rows</p>
            <p className="text-2xl font-semibold text-green-900">{runSummary.rowsSuccessful}</p>
            <p className="text-xs text-green-700 mt-0.5">Quote + Load + Vehicle+Driver successfully joined</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-md-1 border border-black/12 bg-black/[0.02]">
            <p className="text-sm font-medium text-[rgba(0,0,0,0.87)]">Unconnected / filtered out</p>
            <p className="text-2xl font-semibold text-[rgba(0,0,0,0.87)]">{runSummary.rowsDropped}</p>
            <p className="text-xs text-[rgba(0,0,0,0.6)] mt-0.5">Quotes, loads, or vehicles with no matching join, or removed by filters</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-md-1 border border-black/10 col-span-2 sm:col-span-1">
            <p className="text-sm font-medium text-[rgba(0,0,0,0.87)]">Total input</p>
            <p className="text-2xl font-semibold text-[rgba(0,0,0,0.87)]">{runSummary.rowsSuccessful + runSummary.rowsDropped}</p>
            <p className="text-xs text-[rgba(0,0,0,0.6)] mt-0.5">rows before pipeline</p>
          </div>
        </div>
      )}
      {hasRun && outputs && outputs.flatRows.length === 0 && (
        <div className="p-4 bg-black/4 border border-black/12 rounded text-[rgba(0,0,0,0.6)]">
          Pipeline ran successfully. No combined rows. (All input rows were unconnected or removed by filters.)
        </div>
      )}
      {outputs && outputs.flatRows.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-black/12">
          <h3 className="font-medium mb-3">Pipeline output</h3>
          <PipelineDataTabs
            outputs={outputs}
            maxRows={50}
            searchPlaceholder="Search in table..."
          />
        </div>
      )}
    </div>
  )
}
