export interface JoinStep {
  name: string
  leftEntity: string
  rightEntity: string
  leftKey: string
  rightKey: string
  fallbackKey?: string
  rowsBefore: number
  rowsAfter: number
}

/**
 * Join: Quote -> Load -> Driver+Vehicle
 * Rows are already mapped to target schema field names
 */
export function runJoins(
  quoteRows: Record<string, unknown>[],
  loadRows: Record<string, unknown>[],
  driverVehicleRows: Record<string, unknown>[]
): Record<string, unknown>[] {
  const result = runJoinsWithSteps(quoteRows, loadRows, driverVehicleRows)
  return result.rows
}

export function runJoinsWithSteps(
  quoteRows: Record<string, unknown>[],
  loadRows: Record<string, unknown>[],
  driverVehicleRows: Record<string, unknown>[]
): { rows: Record<string, unknown>[]; steps: JoinStep[] } {
  const loadById = new Map<string, Record<string, unknown>>()
  for (const l of loadRows) {
    const id = l.load_id
    if (id != null) loadById.set(String(id), l)
  }

  const dvByVehicle = new Map<string, Record<string, unknown>>()
  const dvByDriver = new Map<string, Record<string, unknown>>()
  for (const dv of driverVehicleRows) {
    const vid = dv.vehicle_id
    const did = dv.driver_id
    if (vid != null) dvByVehicle.set(String(vid), dv)
    if (did != null) dvByDriver.set(String(did), dv)
  }

  const step1Rows: Record<string, unknown>[] = []
  for (const q of quoteRows) {
    const loadId = q.load_id
    if (loadId == null) continue
    const load = loadById.get(String(loadId))
    if (!load) continue
    step1Rows.push({ ...q, ...load })
  }

  const joined: Record<string, unknown>[] = []
  for (const r of step1Rows) {
    const vehicleId = r.allocated_vehicle_id
    const driverId = r.driver_id
    const dv =
      (vehicleId != null && dvByVehicle.get(String(vehicleId))) ||
      (driverId != null && dvByDriver.get(String(driverId)))
    if (!dv) continue
    joined.push({ ...r, ...dv })
  }

  const steps: JoinStep[] = [
    {
      name: 'Quote→Load',
      leftEntity: 'quote',
      rightEntity: 'load',
      leftKey: 'load_id',
      rightKey: 'load_id',
      rowsBefore: quoteRows.length,
      rowsAfter: step1Rows.length,
    },
    {
      name: 'Load→Driver+Vehicle',
      leftEntity: 'load',
      rightEntity: 'driver_vehicle',
      leftKey: 'allocated_vehicle_id',
      rightKey: 'vehicle_id',
      fallbackKey: 'driver_id',
      rowsBefore: step1Rows.length,
      rowsAfter: joined.length,
    },
  ]

  return { rows: joined, steps }
}
