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
  const [generating, setGenerating] = useState(false)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    api.profiles.list().then(setProfiles).finally(() => setLoading(false))
  }, [])

  const hasActive = profiles.some((p) => p.status === 'active')

  const handleGenerate = async () => {
    setGenerating(true)
    setFlatRows(null)
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
    try {
      const res = await api.pipeline.run(sessionData)
      setFlatRows(res.flatRows ?? [])
    } finally {
      setRunning(false)
    }
  }

  if (loading) return <div>Loading...</div>

  if (!hasActive) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-6 rounded">
        <h2 className="text-lg font-medium mb-2">No Active Profile</h2>
        <p>Save a configuration first to use Show Overall Data.</p>
        <Link to="/etl" className="text-blue-600 hover:underline mt-2 inline-block">
          Go to Configuration Profiles →
        </Link>
      </div>
    )
  }

  const headers = flatRows && flatRows.length > 0 ? Object.keys(flatRows[0]) : []
  const hasRun = flatRows !== null

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Show Overall Data & Simulate Pipeline</h1>
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate'}
        </button>
        <button
          onClick={handleRun}
          disabled={!sessionData || running}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {running ? 'Running...' : 'Run Pipeline'}
        </button>
      </div>
      {hasRun && flatRows.length === 0 && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded text-slate-600">
          Pipeline ran successfully. No rows in output. (All rows were dropped by joins or filters.)
        </div>
      )}
      {flatRows && flatRows.length > 0 && (
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
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
            <p className="p-2 text-sm text-slate-500">Showing 50 of {flatRows.length} rows</p>
          )}
        </div>
      )}
    </div>
  )
}
