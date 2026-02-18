import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Profile } from '../services/api'

export function ProfilesList() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createDataModelVersion, setCreateDataModelVersion] = useState('V1')
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
      setCreateDataModelVersion('V1')
      setCreateAiMode('mocked')
      setShowCreate(false)
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

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Configuration Profiles</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>
      )}

      {showCreate && (
        <div className="mb-6 p-4 bg-white rounded shadow">
          <h2 className="font-medium mb-2">New Profile</h2>
          <div className="space-y-2 max-w-md">
            <div>
              <label className="block text-sm text-slate-600 mb-0.5">Name *</label>
              <input
                type="text"
                placeholder="Profile name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-0.5">Description</label>
              <input
                type="text"
                placeholder="Optional description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-0.5">Data Model Version</label>
              <select
                value={createDataModelVersion}
                onChange={(e) => setCreateDataModelVersion(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="V1">V1</option>
                <option value="V2">V2</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-0.5">AI Mode</label>
              <select
                value={createAiMode}
                onChange={(e) => setCreateAiMode(e.target.value as 'claude' | 'mocked')}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="mocked">Mocked AI</option>
                <option value="claude">Claude AI</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded">
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {profiles.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between p-4 bg-white rounded shadow"
          >
            <div>
              <span className={`px-2 py-1 text-xs rounded ${p.status === 'active' ? 'bg-green-100' : p.status === 'draft' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                {p.status}
              </span>
              <h3 className="font-medium mt-1">{p.name}</h3>
              <p className="text-sm text-slate-600">{p.description || '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {p.dataModelVersion} · {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '—'}
              </p>
            </div>
            <div className="flex gap-2">
              {p.status === 'draft' && (
                <Link
                  to={`/etl/profiles/${p.id}`}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Edit
                </Link>
              )}
              <button
                onClick={() => handleDuplicate(p.id)}
                className="px-3 py-1 border rounded text-sm"
              >
                Duplicate
              </button>
              {profiles.length > 1 && (
                <button
                  onClick={() => setDeleteConfirm(p.id)}
                  className="px-3 py-1 text-red-600 border border-red-200 rounded text-sm"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg">
            <p>
              Delete profile &quot;{profiles.find((p) => p.id === deleteConfirm)?.name ?? 'Unknown'}&quot;? This cannot be undone.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
