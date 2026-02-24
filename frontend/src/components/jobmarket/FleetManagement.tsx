/** Fleet Management — vehicles and drivers CRUD + generate (US4) */
import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import type { Vehicle, Driver } from '../../lib/jobmarket/types'
import { FleetGenerateBar } from './FleetGenerateBar'
import { VehicleManager } from './VehicleManager'
import { DriverManager } from './DriverManager'

interface FleetManagementProps {
  vehicles: Vehicle[]
  drivers: Driver[]
  onFleetChange?: () => void
}

export function FleetManagement({ vehicles, drivers, onFleetChange }: FleetManagementProps) {
  const [hubs, setHubs] = useState<{ city: string }[]>([])

  useEffect(() => {
    api.jobmarket.getHubs().then((r) => setHubs(r.hubs || [])).catch(() => {})
  }, [])

  const handleGenerate = async (vehicleCount: number, driverCount: number) => {
    await api.jobmarket.generateFleet(vehicleCount, driverCount)
    onFleetChange?.()
  }

  const handleFleetChange = () => {
    onFleetChange?.()
  }

  return (
    <div className="space-y-4">
      <FleetGenerateBar
        vehicleCount={3}
        driverCount={3}
        maxReached={vehicles.length >= 50 || drivers.length >= 50}
        onGenerate={handleGenerate}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VehicleManager
          vehicles={vehicles}
          drivers={drivers}
          hubs={hubs}
          onVehicleCreated={handleFleetChange}
        />
        <DriverManager
          drivers={drivers}
          onDriverCreated={handleFleetChange}
        />
      </div>
    </div>
  )
}
