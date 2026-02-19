import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type Profile } from '../services/api'

export function ProfilesList() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createDataModelVersion, setCreateDataModelVersion] = useState('V2')
  const [createAiMode, setCreateAiMode] = useState<'claude' | 'mocked'>('mocked')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.profiles.list().then(setProfiles).catch(setError).finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!createName.trim()) return
    try {
      const p = await api.profiles.create({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        dataModelVersion: createDataModelVersion,
        aiMode: createAiMode,
      })
      setProfiles((prev) => [p, ...prev])
      setCreateName('')
      setCreateDescription('')
      setCreateDataModelVersion('V2')
      setCreateAiMode('mocked')
      setShowCreate(false)
      navigate(`/etl/profiles/${p.id}`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      const p = await api.profiles.duplicate(id)
      setProfiles((prev) => [p, ...prev])
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.profiles.delete(id)
      setProfiles((prev) => prev.filter((p) => p.id !== id))
      setDeleteConfirm(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (loading) return <div className="text-[rgba(0,0,0,0.6)]">Loading...</div>

  const inputClass = "border border-black/20 rounded px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-medium text-[rgba(0,0,0,0.87)]">Configuration Profiles</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-6 py-2.5 bg-primary text-white rounded font-medium shadow-md-1 hover:bg-primary-dark transition-colors uppercase text-sm tracking-wide"
        >
          Create
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-800 rounded shadow-md-1 border border-red-200">{error}</div>
      )}

      {showCreate && (
        <div className="mb-8 p-6 bg-white rounded shadow-md-2">
          <h2 className="font-medium mb-4 text-[rgba(0,0,0,0.87)] text-lg">New Profile</h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm text-[rgba(0,0,0,0.6)] mb-1">Name *</label>
              <input type="text" placeholder="Profile name" value={createName} onChange={(e) => setCreateName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-[rgba(0,0,0,0.6)] mb-1">Description</label>
              <input type="text" placeholder="Optional description" value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-[rgba(0,0,0,0.6)] mb-1">Data Model Version</label>
              <select value={createDataModelVersion} onChange={(e) => setCreateDataModelVersion(e.target.value)} className={inputClass}>
                <option value="V1">V1</option>
                <option value="V2">V2</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[rgba(0,0,0,0.6)] mb-1">AI Mode</label>
              <select value={createAiMode} onChange={(e) => setCreateAiMode(e.target.value as 'claude' | 'mocked')} className={inputClass}>
                <option value="mocked">Mocked AI</option>
                <option value="claude">Claude AI</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={handleCreate} className="px-6 py-2.5 bg-primary text-white rounded font-medium shadow-md-1 hover:bg-primary-dark">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-6 py-2.5 border border-black/20 rounded font-medium hover:bg-black/4">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {profiles.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between p-6 bg-white rounded shadow-md-1 hover:shadow-md-2 transition-shadow"
          >
            <div>
              <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded ${p.status === 'active' ? 'bg-green-100 text-green-800' : p.status === 'draft' ? 'bg-amber-100 text-amber-800' : 'bg-black/8 text-[rgba(0,0,0,0.6)]'}`}>
                {p.status}
              </span>
              <h3 className="font-medium mt-2 text-[rgba(0,0,0,0.87)]">{p.name}</h3>
              <p className="text-sm text-[rgba(0,0,0,0.6)] mt-0.5">{p.description || '—'}</p>
              <p className="text-xs text-[rgba(0,0,0,0.38)] mt-1">
                {p.dataModelVersion} · {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '—'}
              </p>
            </div>
            <div className="flex gap-2">
              {p.status === 'draft' && (
                <Link
                  to={`/etl/profiles/${p.id}`}
                  className="px-4 py-2 bg-primary text-white rounded text-sm font-medium shadow-md-1 hover:bg-primary-dark"
                >
                  Edit
                </Link>
              )}
              <button
                onClick={() => handleDuplicate(p.id)}
                className="px-4 py-2 border border-black/20 rounded text-sm font-medium hover:bg-black/4"
              >
                Duplicate
              </button>
              {profiles.length > 1 && (
                <button
                  onClick={() => setDeleteConfirm(p.id)}
                  className="px-4 py-2 text-red-600 border border-red-200 rounded text-sm font-medium hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded shadow-md-4 max-w-md">
            <p className="text-[rgba(0,0,0,0.87)]">
              Delete profile &quot;{profiles.find((p) => p.id === deleteConfirm)?.name ?? 'Unknown'}&quot;? This cannot be undone.
            </p>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-6 py-2.5 border border-black/20 rounded font-medium hover:bg-black/4"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-6 py-2.5 bg-red-600 text-white rounded font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
