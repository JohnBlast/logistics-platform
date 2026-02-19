import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'

interface FieldDef {
  name: string
  type: string
  required: boolean
  description?: string
}

interface EntityDef {
  name: string
  description?: string
  fields: FieldDef[]
  enums?: Record<string, readonly string[]>
}

export function DataModelPreview() {
  const [entities, setEntities] = useState<EntityDef[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.schema
      .get()
      .then((res) => setEntities(res.entities || []))
      .catch(() => setEntities([]))
      .finally(() => setLoading(false))
  }, [])

  const formatExample = (field: FieldDef, enums?: Record<string, readonly string[]>): string => {
    if (field.type === 'enum') {
      const vals = enums?.[field.name]
      return vals ? vals.slice(0, 4).join(', ') + (vals.length > 4 ? '…' : '') : '-'
    }
    if (field.type === 'UUID') return 'UUID v4'
    if (field.type === 'TIMESTAMP') return 'ISO 8601'
    if (field.type === 'DATE') return 'YYYY-MM-DD'
    if (field.type === 'DECIMAL') return '12.34'
    return '-'
  }

  if (loading) return <div className="text-[rgba(0,0,0,0.6)]">Loading...</div>

  const q = search.trim().toLowerCase()
  const filterFields = (fields: FieldDef[]) =>
    q ? fields.filter((f) => f.name.toLowerCase().includes(q) || (f.description ?? '').toLowerCase().includes(q) || f.type.toLowerCase().includes(q)) : fields

  return (
    <div>
      <h1 className="text-2xl font-medium mb-4 text-[rgba(0,0,0,0.87)]">Data Model Preview</h1>
      <p className="text-[rgba(0,0,0,0.6)] mb-4">
        Target schema for the ETL. Map your source columns to these fields.
      </p>
      <input
        type="text"
        placeholder="Search fields..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6 border border-black/20 rounded px-3 py-2 text-sm w-full max-w-md focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="space-y-6">
        {entities.map((e) => {
          const filtered = filterFields(e.fields)
          if (filtered.length === 0) return null
          return (
            <div key={e.name} className="bg-white p-6 rounded shadow-md-1">
              <h2 className="font-medium text-lg mb-2">{e.name}</h2>
              {e.description && (
                <p className="text-[rgba(0,0,0,0.6)] text-sm mb-2">{e.description}</p>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-2">Field</th>
                    <th className="py-2 pr-2">Description</th>
                    <th className="py-2 pr-2">Required</th>
                    <th className="py-2 pr-2">Type</th>
                    <th className="py-2 pr-2">Format / Examples</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.name} className="border-b last:border-0">
                      <td className="py-1 font-mono">{f.name}</td>
                      <td className="py-1 text-[rgba(0,0,0,0.6)] max-w-[200px]">{f.description || '—'}</td>
                      <td>{f.required ? 'Yes' : 'No'}</td>
                      <td>{f.type}</td>
                      <td>{formatExample(f, e.enums)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {search && filtered.length < e.fields.length && (
                <p className="text-xs text-[rgba(0,0,0,0.6)] mt-2">
                  Showing {filtered.length} of {e.fields.length} fields
                </p>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-6">
        <Link to="/etl" className="text-primary hover:underline font-medium">
          ← Configuration Profiles
        </Link>
      </div>
    </div>
  )
}
