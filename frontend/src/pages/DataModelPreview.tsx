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

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Data Model Preview</h1>
      <p className="text-slate-600 mb-6">
        Target schema for the ETL. Map your source columns to these fields.
      </p>
      <div className="space-y-6">
        {entities.map((e) => (
          <div key={e.name} className="bg-white p-4 rounded shadow">
            <h2 className="font-medium text-lg mb-2">{e.name}</h2>
            {e.description && (
              <p className="text-slate-600 text-sm mb-2">{e.description}</p>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">Field</th>
                  <th className="py-2 pr-2">Required</th>
                  <th className="py-2 pr-2">Type</th>
                  <th className="py-2 pr-2">Format / Examples</th>
                </tr>
              </thead>
              <tbody>
                {e.fields.map((f) => (
                  <tr key={f.name} className="border-b last:border-0">
                    <td className="py-1 font-mono">{f.name}</td>
                    <td>{f.required ? 'Yes' : 'No'}</td>
                    <td>{f.type}</td>
                    <td>{formatExample(f, e.enums)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Link to="/etl" className="text-blue-600 hover:underline">
          ← Configuration Profiles
        </Link>
      </div>
    </div>
  )
}
