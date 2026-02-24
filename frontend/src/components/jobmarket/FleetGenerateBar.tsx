/** Fleet Generate Bar — bulk generate vehicles + drivers (US4) */
import { useState } from 'react'

interface FleetGenerateBarProps {
  vehicleCount: number
  driverCount: number
  maxReached: boolean
  onGenerate: (vehicles: number, drivers: number) => Promise<void>
}

export function FleetGenerateBar({ vehicleCount: initVehicles, driverCount: initDrivers, maxReached, onGenerate }: FleetGenerateBarProps) {
  const [vehicleCount, setVehicleCount] = useState(initVehicles)
  const [driverCount, setDriverCount] = useState(initDrivers)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      await onGenerate(vehicleCount, driverCount)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded border border-black/12 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Quick Setup</h3>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="text-sm">Vehicles</span>
            <input
              type="number"
              min={1}
              max={50}
              value={vehicleCount}
              onChange={(e) => setVehicleCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-16 border border-black/20 rounded px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm">Drivers</span>
            <input
              type="number"
              min={1}
              max={50}
              value={driverCount}
              onChange={(e) => setDriverCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-16 border border-black/20 rounded px-2 py-1 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || maxReached}
            className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  )
}
