import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'

export function ShowOverallData() {
  const [profiles, setProfiles] = useState<{ status: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionData, setSessionData] = useState<{
    quote: { headers: string[]; rows: Record<string, unknown>[] }
    load: { headers: string[]; rows: Record<string, unknown>[] }
    driver_vehicle: { headers: string[]; rows: Record<string, unknown>[] }
  } | null>(null)
  const [flatRows, setFlatRows] = useState<Record<string, unknown>[] | null>(null)
  const [runSummary, setRunSummary] = useState<{ rowsSuccessful: number; rowsDropped: number } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    api.profiles.list().then(setProfiles).finally(() => setLoading(false))
  }, [])

  const hasActive = profiles.some((p) => p.status === 'active')

  const handleGenerate = async () => {
    setGenerating(true)
    setFlatRows(null)
    setRunSummary(null)
    try {
      const loadRes = await api.ingest.generate('load')
      const quoteRes = await api.ingest.generate('quote', { loadIds: loadRes.loadIds })
      const dvRes = await api.ingest.generate('driver_vehicle', { loadRows: loadRes.rows })
      setSessionData({
        quote: { headers: quoteRes.headers, rows: quoteRes.rows },
        load: { headers: loadRes.headers, rows: dvRes.updatedLoadRows || loadRes.rows },
        driver_vehicle: { headers: dvRes.headers, rows: dvRes.rows },
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleRun = async () => {
    if (!sessionData) return
    setRunning(true)
    setRunSummary(null)
    try {
      const res = await api.pipeline.run(sessionData)
      setFlatRows(res.flatRows ?? [])
      setRunSummary({ rowsSuccessful: res.rowsSuccessful, rowsDropped: res.rowsDropped })
    } finally {
      setRunning(false)
    }
  }

  if (loading) return <div className="text-[rgba(0,0,0,0.6)]">Loading...</div>

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

  const headers = flatRows && flatRows.length > 0 ? Object.keys(flatRows[0]) : []
  const hasRun = flatRows !== null

  return (
    <div>
      <h1 className="text-2xl font-medium mb-4 text-[rgba(0,0,0,0.87)]">Show Overall Data & Simulate Pipeline</h1>
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-6 py-2.5 bg-primary text-white rounded font-medium shadow-md-1 hover:bg-primary-dark disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate'}
        </button>
        <button
          onClick={handleRun}
          disabled={!sessionData || running}
          className="px-6 py-2.5 bg-green-600 text-white rounded font-medium shadow-md-1 hover:bg-green-700 disabled:opacity-50"
        >
          {running ? 'Running...' : 'Run Pipeline'}
        </button>
      </div>
      {runSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-lg shadow-md-1 border border-green-200 bg-green-50/50">
            <p className="text-sm font-medium text-green-800">Accepted</p>
            <p className="text-2xl font-semibold text-green-900">{runSummary.rowsSuccessful}</p>
            <p className="text-xs text-green-700 mt-0.5">rows passed the pipeline</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-md-1 border border-amber-200 bg-amber-50/50">
            <p className="text-sm font-medium text-amber-800">Dropped</p>
            <p className="text-2xl font-semibold text-amber-900">{runSummary.rowsDropped}</p>
            <p className="text-xs text-amber-700 mt-0.5">rows dropped by joins or filters</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-md-1 border border-black/10 col-span-2 sm:col-span-1">
            <p className="text-sm font-medium text-[rgba(0,0,0,0.87)]">Total input</p>
            <p className="text-2xl font-semibold text-[rgba(0,0,0,0.87)]">{runSummary.rowsSuccessful + runSummary.rowsDropped}</p>
            <p className="text-xs text-[rgba(0,0,0,0.6)] mt-0.5">rows before pipeline</p>
          </div>
        </div>
      )}
      {hasRun && flatRows.length === 0 && (
        <div className="p-4 bg-black/4 border border-black/12 rounded text-[rgba(0,0,0,0.6)]">
          Pipeline ran successfully. No rows in output. (All rows were dropped by joins or filters.)
        </div>
      )}
      {flatRows && flatRows.length > 0 && (
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-black/4">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flatRows.slice(0, 50).map((row, i) => (
                <tr key={i} className="border-t">
                  {headers.map((h) => (
                    <td key={h} className="px-3 py-1">
                      {String(row[h] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {flatRows.length > 50 && (
            <p className="p-2 text-sm text-[rgba(0,0,0,0.6)]">Showing 50 of {flatRows.length} rows</p>
          )}
        </div>
      )}
    </div>
  )
}
