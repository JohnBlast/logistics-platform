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

export interface JoinConfig {
  name: string
  leftEntity: string
  rightEntity: string
  leftKey: string
  rightKey: string
  fallbackKey?: string
}

const DEFAULT_JOINS: JoinConfig[] = [
  { name: 'Quote→Load', leftEntity: 'quote', rightEntity: 'load', leftKey: 'load_id', rightKey: 'load_id' },
  {
    name: 'Load→Driver+Vehicle',
    leftEntity: 'load',
    rightEntity: 'driver_vehicle',
    leftKey: 'allocated_vehicle_id',
    rightKey: 'vehicle_id',
    fallbackKey: 'driver_id',
  },
]

/** Resolve leftKey for Load→Driver+Vehicle: vehicle_id / Vehicle ID → allocated_vehicle_id */
function resolveLoadDvLeftKey(key: string): string {
  const k = key.toLowerCase().replace(/\s+/g, '_')
  if (k === 'vehicle_id' || k === 'allocated_vehicle_id') return 'allocated_vehicle_id'
  return key
}

/** Vehicle ID keys to try when linking Load to Driver+Vehicle (handles different column naming) */
const LOAD_VEHICLE_ID_KEYS = ['allocated_vehicle_id', 'vehicle_id', 'Vehicle ID']

function getVehicleIdFromRow(row: Record<string, unknown>, leftKey: string): unknown {
  let v = row[leftKey]
  if (v != null) return v
  for (const k of LOAD_VEHICLE_ID_KEYS) {
    v = row[k]
    if (v != null) return v
  }
  return null
}

/**
 * Join: Quote -> Load -> Driver+Vehicle
 * Rows are already mapped to target schema field names.
 * Uses profileJoins when provided; otherwise defaults.
 */
export function runJoins(
  quoteRows: Record<string, unknown>[],
  loadRows: Record<string, unknown>[],
  driverVehicleRows: Record<string, unknown>[],
  profileJoins?: JoinConfig[]
): Record<string, unknown>[] {
  const result = runJoinsWithSteps(quoteRows, loadRows, driverVehicleRows, profileJoins)
  return result.rows
}

export function runJoinsWithSteps(
  quoteRows: Record<string, unknown>[],
  loadRows: Record<string, unknown>[],
  driverVehicleRows: Record<string, unknown>[],
  profileJoins?: JoinConfig[]
): { rows: Record<string, unknown>[]; steps: JoinStep[] } {
  const joins = profileJoins?.length ? profileJoins : DEFAULT_JOINS
  const quoteLoadJoin = joins.find((j) => j.leftEntity === 'quote' && j.rightEntity === 'load')
  const loadDvJoin = joins.find(
    (j) => j.leftEntity === 'load' && (j.rightEntity === 'driver_vehicle' || j.rightEntity === 'driver+vehicle')
  )

  const steps: JoinStep[] = []
  let currentRows: Record<string, unknown>[] = []
  let prevRows = quoteRows

  if (quoteLoadJoin) {
    const loadById = new Map<string, Record<string, unknown>>()
    const loadRightKey = quoteLoadJoin.rightKey
    for (const l of loadRows) {
      const id = l[loadRightKey]
      if (id != null) loadById.set(String(id), l)
    }
    const qLeftKey = quoteLoadJoin.leftKey
    for (const q of quoteRows) {
      const loadId = q[qLeftKey]
      if (loadId == null) continue
      const load = loadById.get(String(loadId))
      if (!load) continue
      const row = { ...q, ...load }
      if (q.status != null) (row as Record<string, unknown>).quote_status = q.status
      if (load.status != null) (row as Record<string, unknown>).load_status = load.status
      currentRows.push(row)
    }
    steps.push({
      name: quoteLoadJoin.name,
      leftEntity: quoteLoadJoin.leftEntity,
      rightEntity: quoteLoadJoin.rightEntity,
      leftKey: quoteLoadJoin.leftKey,
      rightKey: quoteLoadJoin.rightKey,
      rowsBefore: prevRows.length,
      rowsAfter: currentRows.length,
    })
    prevRows = currentRows
  } else {
    currentRows = quoteRows.map((q) => ({ ...q }))
  }

  if (loadDvJoin) {
    const dvByVehicle = new Map<string, Record<string, unknown>>()
    const dvByDriver = new Map<string, Record<string, unknown>>()
    for (const dv of driverVehicleRows) {
      const vid = dv.vehicle_id ?? dv['Vehicle ID']
      const did = dv.driver_id ?? dv['Driver ID']
      if (vid != null) {
        const key = String(vid).trim().toLowerCase()
        if (!dvByVehicle.has(key)) dvByVehicle.set(key, dv)
      }
      if (did != null) dvByDriver.set(String(did).trim().toLowerCase(), dv)
    }
    const leftKey = resolveLoadDvLeftKey(loadDvJoin.leftKey)
    const fallbackKey = loadDvJoin.fallbackKey ?? 'driver_id'
    const dvColumns = driverVehicleRows.length > 0 ? Object.keys(driverVehicleRows[0]) : []
    const emptyDv = Object.fromEntries(dvColumns.map((c) => [c, null]))
    const nextRows: Record<string, unknown>[] = []
    for (const r of currentRows) {
      const vehicleId = getVehicleIdFromRow(r, leftKey)
      const driverId = r[fallbackKey] ?? r['Driver ID']
      const vidKey = vehicleId != null ? String(vehicleId).trim().toLowerCase() : null
      const dv =
        (vidKey && dvByVehicle.get(vidKey)) ||
        (driverId != null && dvByDriver.get(String(driverId).trim().toLowerCase()))
      nextRows.push(dv ? { ...r, ...dv } : { ...r, ...emptyDv })
    }
    currentRows = nextRows
    steps.push({
      name: loadDvJoin.name,
      leftEntity: loadDvJoin.leftEntity,
      rightEntity: loadDvJoin.rightEntity,
      leftKey: loadDvJoin.leftKey,
      rightKey: loadDvJoin.rightKey,
      fallbackKey: loadDvJoin.fallbackKey,
      rowsBefore: prevRows.length,
      rowsAfter: currentRows.length,
    })
  } else if (currentRows.length > 0) {
    const dvColumns = driverVehicleRows.length > 0 ? Object.keys(driverVehicleRows[0]) : []
    const emptyDv = Object.fromEntries(dvColumns.map((c) => [c, null]))
    currentRows = currentRows.map((r) => ({ ...r, ...emptyDv }))
  }

  return { rows: currentRows, steps }
}
