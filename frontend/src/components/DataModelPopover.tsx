import { useState, useEffect, useMemo } from 'react'
import { api } from '../services/api'

interface Entity {
  name: string
  description?: string
  fields: { name: string; type: string; required: boolean; description?: string }[]
  enums?: Record<string, readonly string[]>
}

function formatExample(field: { name: string; type: string }, entity: Entity): string {
  if (field.type === 'enum') {
    const vals = entity.enums?.[field.name as keyof typeof entity.enums] as string[] | undefined
    return vals ? vals.slice(0, 5).join(', ') + (vals.length > 5 ? '…' : '') : '—'
  }
  if (field.type === 'UUID') return 'UUID v4'
  if (field.type === 'TIMESTAMP') return 'ISO 8601'
  if (field.type === 'DATE') return 'YYYY-MM-DD'
  if (field.type === 'DECIMAL') return '12.34'
  if (field.type === 'INTEGER') return '42'
  return '—'
}

export function DataModelPopover() {
  const [open, setOpen] = useState(false)
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open && entities.length === 0) {
      setLoading(true)
      api.schema
        .get()
        .then((res) => setEntities(res.entities ?? []))
        .catch(() => setEntities([]))
        .finally(() => setLoading(false))
    }
  }, [open, entities.length])

  const activeEntity = entities[activeTab]
  const filteredFields = useMemo(() => {
    if (!activeEntity?.fields) return []
    const q = search.trim().toLowerCase()
    if (!q) return activeEntity.fields
    return activeEntity.fields.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description ?? '').toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q)
    )
  }, [activeEntity, search])

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[88vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-black/12">
              <div className="flex items-center justify-between gap-4 mb-3">
                <h2 className="text-lg font-semibold">Target Data Model</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-black/8 text-[rgba(0,0,0,0.6)] hover:text-[rgba(0,0,0,0.87)]"
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-[rgba(0,0,0,0.6)]">
                Map your source columns to these fields in the Mapping step.
              </p>
            </div>

            {loading ? (
              <div className="p-8 text-center text-[rgba(0,0,0,0.6)]">Loading...</div>
            ) : (
              <>
                <div className="px-5 pt-3 pb-2 border-b border-black/8 flex flex-wrap gap-2">
                  {entities.map((e, i) => (
                    <button
                      key={e.name}
                      type="button"
                      onClick={() => setActiveTab(i)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === i
                          ? 'bg-primary text-white'
                          : 'bg-black/6 text-[rgba(0,0,0,0.7)] hover:bg-black/10'
                      }`}
                    >
                      {e.name}
                    </button>
                  ))}
                </div>

                {activeEntity && (
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="px-5 py-3 border-b border-black/8">
                      <input
                        type="text"
                        placeholder="Search fields..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-3 py-2 border border-black/20 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div className="px-5 py-3 overflow-auto flex-1">
                      <p className="text-sm text-[rgba(0,0,0,0.6)] mb-3">{activeEntity.description}</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs font-medium text-[rgba(0,0,0,0.6)] uppercase tracking-wide">
                            <th className="py-2 pr-3">Field</th>
                            <th className="py-2 pr-3">Type</th>
                            <th className="py-2 pr-3 w-16">Req</th>
                            <th className="py-2 pr-3 max-w-[200px]">Description</th>
                            <th className="py-2">Format</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredFields.map((f) => (
                            <tr key={f.name} className="border-t border-black/8 hover:bg-black/[0.02]">
                              <td className="py-2 pr-3 font-mono text-[13px]">
                                {f.name}
                                {f.required && <span className="text-primary ml-0.5">*</span>}
                              </td>
                              <td className="py-2 pr-3">
                                <span className="px-1.5 py-0.5 rounded bg-black/6 text-xs">{f.type}</span>
                              </td>
                              <td className="py-2 pr-3">{f.required ? 'Yes' : 'No'}</td>
                              <td className="py-2 pr-3 text-[rgba(0,0,0,0.7)]">{f.description ?? '—'}</td>
                              <td className="py-2 text-[rgba(0,0,0,0.6)]">{formatExample(f, activeEntity)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {search && filteredFields.length < activeEntity.fields.length && (
                        <p className="text-xs text-[rgba(0,0,0,0.5)] mt-2">
                          Showing {filteredFields.length} of {activeEntity.fields.length} fields
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
