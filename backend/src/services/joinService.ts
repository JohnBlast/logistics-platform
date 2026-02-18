/**
 * Join: Quote -> Load -> Driver+Vehicle
 * Rows are already mapped to target schema field names
 */
export function runJoins(
  quoteRows: Record<string, unknown>[],
  loadRows: Record<string, unknown>[],
  driverVehicleRows: Record<string, unknown>[]
): Record<string, unknown>[] {
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

  const joined: Record<string, unknown>[] = []
  for (const q of quoteRows) {
    const loadId = q.load_id
    if (loadId == null) continue
    const load = loadById.get(String(loadId))
    if (!load) continue

    const vehicleId = load.allocated_vehicle_id
    const driverId = load.driver_id
    const dv =
      (vehicleId != null && dvByVehicle.get(String(vehicleId))) ||
      (driverId != null && dvByDriver.get(String(driverId)))
    if (!dv) continue

    joined.push({ ...q, ...load, ...dv })
  }
  return joined
}
