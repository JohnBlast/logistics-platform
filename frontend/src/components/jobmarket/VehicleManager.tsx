/** Vehicle Manager — create vehicle form + vehicle list (US4) */
import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import type { Vehicle, Driver } from '../../lib/jobmarket/types'
import { getFieldLabel, getVehicleTypeLabel } from '../../lib/jobmarket/displayNames'
import { VEHICLE_TYPES } from '../../lib/jobmarket/types'

interface VehicleManagerProps {
  vehicles: Vehicle[]
  drivers: Driver[]
  hubs: { city: string }[]
  onVehicleCreated: () => void
}

export function VehicleManager({ vehicles, drivers, hubs, onVehicleCreated }: VehicleManagerProps) {
  const [vehicleType, setVehicleType] = useState<string>(VEHICLE_TYPES[0])
  const [vehicleReg, setVehicleReg] = useState('')
  const [vehicleCapacity, setVehicleCapacity] = useState('')
  const [vehicleCity, setVehicleCity] = useState('')
  const [vehicleDriverId, setVehicleDriverId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (hubs.length > 0 && !vehicleCity) setVehicleCity(hubs[0].city)
  }, [hubs, vehicleCity])

  const handleCreate = async () => {
    if (!vehicleReg.trim() || !vehicleCity) return
    setLoading(true)
    try {
      await api.jobmarket.createVehicle({
        vehicle_type: vehicleType,
        registration_number: vehicleReg.trim(),
        capacity_kg: vehicleCapacity ? Number(vehicleCapacity) : undefined,
        driver_id: vehicleDriverId || undefined,
        current_city: vehicleCity,
      })
      setVehicleReg('')
      setVehicleCapacity('')
      setVehicleCity(hubs[0]?.city ?? '')
      setVehicleDriverId('')
      onVehicleCreated()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded border border-black/12 bg-white p-4 space-y-3">
      <h4 className="text-sm font-semibold">Vehicles ({vehicles.length})</h4>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="block text-xs text-[var(--md-text-secondary)] mb-1">{getFieldLabel('vehicle_type')}</span>
          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="w-full border border-black/20 rounded px-2 py-1.5 text-sm"
          >
            {VEHICLE_TYPES.map((t) => (
              <option key={t} value={t}>{getVehicleTypeLabel(t)}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="block text-xs text-[var(--md-text-secondary)] mb-1">{getFieldLabel('registration_number')}</span>
          <input
            type="text"
            value={vehicleReg}
            onChange={(e) => setVehicleReg(e.target.value)}
            placeholder="AB12 CDE"
            className="w-full border border-black/20 rounded px-2 py-1.5 text-sm"
          />
        </label>
        <label>
          <span className="block text-xs text-[var(--md-text-secondary)] mb-1">{getFieldLabel('capacity_kg')}</span>
          <input
            type="number"
            value={vehicleCapacity}
            onChange={(e) => setVehicleCapacity(e.target.value)}
            placeholder="18000"
            min="0"
            className="w-full border border-black/20 rounded px-2 py-1.5 text-sm"
          />
        </label>
        <label>
          <span className="block text-xs text-[var(--md-text-secondary)] mb-1">{getFieldLabel('current_city')}</span>
          <select
            value={vehicleCity}
            onChange={(e) => setVehicleCity(e.target.value)}
            className="w-full border border-black/20 rounded px-2 py-1.5 text-sm"
          >
            {hubs.map((h) => (
              <option key={h.city} value={h.city}>{h.city}</option>
            ))}
          </select>
        </label>
        <label className="col-span-2">
          <span className="block text-xs text-[var(--md-text-secondary)] mb-1">Driver (optional)</span>
          <select
            value={vehicleDriverId}
            onChange={(e) => setVehicleDriverId(e.target.value)}
            className="w-full border border-black/20 rounded px-2 py-1.5 text-sm"
          >
            <option value="">— None —</option>
            {drivers.map((d) => (
              <option key={d.driver_id} value={d.driver_id}>{d.name}</option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={handleCreate}
        disabled={!vehicleReg.trim() || !vehicleCity || loading || vehicles.length >= 50}
        className="px-3 py-1.5 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
      >
        {loading ? 'Adding…' : 'Add vehicle'}
      </button>

      <div className="max-h-48 overflow-auto text-sm space-y-1 border-t border-black/8 pt-3">
        {vehicles.length === 0 ? (
          <p className="text-[var(--md-text-secondary)]">No vehicles</p>
        ) : (
          vehicles.map((v) => (
            <div key={v.vehicle_id} className="flex justify-between py-1 border-b border-black/8">
              <span>
                {getVehicleTypeLabel(v.vehicle_type)} · {v.registration_number}
              </span>
              <span className="text-[var(--md-text-secondary)]">{v.current_city}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
