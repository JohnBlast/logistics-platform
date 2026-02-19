import { useState, useEffect } from 'react'
import { api } from '../services/api'

interface Entity {
  name: string
  description?: string
  fields: { name: string; type: string; required: boolean; description?: string }[]
  enums?: Record<string, readonly string[]>
}

export function DataModelPopover() {
  const [open, setOpen] = useState(false)
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && entities.length === 0) {
      setLoading(true)
      api.schema
        .get()
        .then((res) => setEntities(res.entities))
        .finally(() => setLoading(false))
    }
  }, [open, entities.length])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-primary hover:underline text-sm font-medium"
      >
        View data model
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Data Model</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-[rgba(0,0,0,0.6)] hover:text-[rgba(0,0,0,0.87)] text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {loading ? (
                <p>Loading...</p>
              ) : (
                <div className="space-y-6">
                  {entities.map((e) => (
                    <div key={e.name} className="border rounded p-3">
                      <h3 className="font-medium mb-1">{e.name}</h3>
                      {e.description && (
                        <p className="text-[rgba(0,0,0,0.6)] text-sm mb-2">{e.description}</p>
                      )}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="py-1.5 pr-2">Field</th>
                            <th className="py-1.5 pr-2">Required</th>
                            <th className="py-1.5 pr-2">Type</th>
                            <th className="py-1.5">Format / Examples</th>
                          </tr>
                        </thead>
                        <tbody>
                          {e.fields.map((f) => (
                            <tr key={f.name} className="border-b last:border-0">
                              <td className="py-1 font-mono">{f.name}</td>
                              <td>{f.required ? 'Yes' : 'No'}</td>
                              <td>{f.type}</td>
                              <td>
                                {f.type === 'enum' && e.enums?.[f.name as keyof typeof e.enums]
                                  ? (e.enums[f.name as keyof typeof e.enums] as string[]).join(', ')
                                  : f.type === 'UUID'
                                    ? 'UUID v4'
                                    : f.type === 'TIMESTAMP'
                                      ? 'ISO 8601'
                                      : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
