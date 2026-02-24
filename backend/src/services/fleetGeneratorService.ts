/**
 * Fleet generator — creates random drivers and vehicles (C-13: append, max 50 each)
 */

import { getHubNames } from '../lib/ukHubs.js'
import { addDriver, addVehicle, getDrivers, getVehicles, getDefaultFleetId } from './jobmarketStore.js'
import type { VehicleType } from './jobmarketStore.js'

const VEHICLE_TYPES: VehicleType[] = [
  'small_van',
  'medium_van',
  'large_van',
  'luton',
  'rigid_7_5t',
  'rigid_18t',
  'rigid_26t',
  'articulated',
]

const FIRST_NAMES = ['Alice', 'Bob', 'Carol', 'David', 'Emma', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack']
const SURNAMES = ['Smith', 'Jones', 'Davis', 'Wilson', 'Brown', 'Taylor', 'Clark', 'Lewis', 'Walker', 'Hall']

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomReg(): string {
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ'.split('')
  const nums = '0123456789'.split('')
  const p1 = Array.from({ length: 2 }, () => pickRandom(letters)).join('')
  const p2 = Array.from({ length: 2 }, () => pickRandom(nums)).join('')
  const p3 = ' ' + Array.from({ length: 3 }, () => pickRandom(letters)).join('')
  return p1 + p2 + p3
}

export function generateFleet(vehicleCount: number, driverCount: number): {
  drivers: ReturnType<typeof addDriver>[]
  vehicles: ReturnType<typeof addVehicle>[]
} {
  const fleetId = getDefaultFleetId()
  const hubs = getHubNames()
  const currentDrivers = getDrivers()
  const currentVehicles = getVehicles()

  const vehicleTotal = currentVehicles.length + vehicleCount
  const driverTotal = currentDrivers.length + driverCount
  const cappedVehicles = Math.min(vehicleCount, Math.max(0, 50 - currentVehicles.length))
  const cappedDrivers = Math.min(driverCount, Math.max(0, 50 - currentDrivers.length))

  const createdDrivers: ReturnType<typeof addDriver>[] = []
  const createdVehicles: ReturnType<typeof addVehicle>[] = []

  console.log(
    `[fleet] Fleet generate: ${cappedVehicles} vehicles, ${cappedDrivers} drivers to add (total cap: 50 each)`
  )

  for (let i = 0; i < cappedDrivers; i++) {
    const name = `${pickRandom(FIRST_NAMES)} ${pickRandom(SURNAMES)}`
    const driver = addDriver({
      name,
      fleet_id: fleetId,
      has_adr_certification: Math.random() < 0.4,
    })
    createdDrivers.push(driver)
  }

  const allDrivers = [...currentDrivers, ...createdDrivers]
  for (let i = 0; i < cappedVehicles; i++) {
    const driver = allDrivers[i % allDrivers.length]
    const vehicle = addVehicle({
      vehicle_type: pickRandom(VEHICLE_TYPES),
      registration_number: randomReg(),
      capacity_kg: 1000 + Math.floor(Math.random() * 25000),
      driver_id: driver?.driver_id,
      current_city: pickRandom(hubs),
    })
    createdVehicles.push(vehicle)
  }

  const totalV = getVehicles().length
  const totalD = getDrivers().length
  console.log(`[fleet] Fleet generate: total now ${totalV} vehicles, ${totalD} drivers`)

  return { drivers: createdDrivers, vehicles: createdVehicles }
}
