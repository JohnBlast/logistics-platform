/** Driver Manager — create driver form + driver list (US4) */
import { useState } from 'react'
import { api } from '../../services/api'
import { getFieldLabel } from '../../lib/jobmarket/displayNames'
import type { Driver } from '../../lib/jobmarket/types'

interface DriverManagerProps {
  drivers: Driver[]
  onDriverCreated: () => void
}

export function DriverManager({ drivers, onDriverCreated }: DriverManagerProps) {
  const [driverName, setDriverName] = useState('')
  const [driverAdr, setDriverAdr] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!driverName.trim()) return
    setLoading(true)
    try {
      await api.jobmarket.createDriver({ name: driverName.trim(), has_adr_certification: driverAdr })
      setDriverName('')
      setDriverAdr(false)
      onDriverCreated()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded border border-black/12 bg-white p-4 space-y-3">
      <h4 className="text-sm font-semibold">Drivers ({drivers.length})</h4>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 min-w-[120px]">
          <span className="block text-xs text-[var(--md-text-secondary)] mb-1">{getFieldLabel('name')}</span>
          <input
            type="text"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            placeholder={getFieldLabel('name')}
            className="w-full border border-black/20 rounded px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={driverAdr}
            onChange={(e) => setDriverAdr(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">{getFieldLabel('has_adr_certification')}</span>
        </label>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!driverName.trim() || loading || drivers.length >= 50}
          className="px-3 py-1.5 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? 'Adding…' : 'Add driver'}
        </button>
      </div>

      <div className="max-h-48 overflow-auto text-sm space-y-1 border-t border-black/8 pt-3">
        {drivers.length === 0 ? (
          <p className="text-[var(--md-text-secondary)]">No drivers</p>
        ) : (
          drivers.map((d) => (
            <div key={d.driver_id} className="flex justify-between py-1 border-b border-black/8">
              <span>{d.name}</span>
              <span className={d.has_adr_certification ? 'text-green-600' : 'text-[var(--md-text-secondary)]'}>
                {d.has_adr_certification ? 'ADR ✓' : '-'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
