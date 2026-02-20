/**
 * Derive Discovery views (quotes, loads, loads_and_quotes) from flat table.
 * Tenant = first distinct associated_fleet_id (C-1).
 * C-2: loads = awarded loads only (quote status accepted, tenant match)
 * C-3: loads_and_quotes = filter by quote_status = accepted; use quote_status/load_status for disambiguation
 * Uses flexible key resolution for flat tables with raw or mapped column names.
 */

const FIELD_ALIASES: Record<string, string[]> = {
  associated_fleet_id: ['Fleet ID', 'fleet_id', 'fleetid'],
  quote_status: ['Quote Status', 'quote status'],
  status: ['Status'],
  load_id: ['Load Number', 'Load Reference', 'load_number'],
}

function resolveKey(row: Record<string, unknown>, logical: string): string | null {
  if (row[logical] !== undefined && row[logical] !== null) return logical
  for (const a of FIELD_ALIASES[logical] ?? []) {
    if (row[a] !== undefined && row[a] !== null) return a
  }
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '_').replace(/_+/g, '_')
  const logicalNorm = norm(logical)
  for (const k of Object.keys(row)) {
    if (norm(k) === logicalNorm) return k
  }
  return null
}

export function getTenantId(flatRows: Record<string, unknown>[]): string | null {
  if (flatRows.length === 0) return null
  const first = flatRows[0] as Record<string, unknown>
  const key = resolveKey(first, 'associated_fleet_id')
  if (!key) return null
  // Pick the fleet with the most rows (ensures we use the dominant tenant for demo data)
  const counts = new Map<string, number>()
  for (const row of flatRows) {
    const fid = row[key] ?? row.associated_fleet_id
    if (fid != null && fid !== '') {
      const s = String(fid)
      counts.set(s, (counts.get(s) ?? 0) + 1)
    }
  }
  if (counts.size === 0) return null
  let best = ''
  let bestCount = 0
  for (const [fid, count] of counts) {
    if (count > bestCount) { best = fid; bestCount = count }
  }
  return best || null
}

/** quotes: Quote fields from flat; filter by tenant (associated_fleet_id). When tenant null, use all rows. */
export function deriveQuotes(
  flatRows: Record<string, unknown>[],
  tenantId: string | null
): Record<string, unknown>[] {
  if (flatRows.length === 0) return []
  const first = flatRows[0] as Record<string, unknown>
  const fidKey = resolveKey(first, 'associated_fleet_id')
  if (!fidKey && tenantId != null) return []
  return flatRows.filter((r) => {
    if (tenantId == null) return true
    const fid = fidKey ? r[fidKey] : r.associated_fleet_id
    return String(fid || '') === tenantId
  })
}

/**
 * loads: Distinct by load_id; only loads where accepted quote. When tenant null, use all accepted rows.
 */
export function deriveLoads(
  flatRows: Record<string, unknown>[],
  tenantId: string | null
): Record<string, unknown>[] {
  return deriveLoadsAndQuotes(flatRows, tenantId)
}

/**
 * loads_and_quotes: Filter flat where quote.status = 'accepted'; distinct by load_id; tenant filter (C-3).
 * When tenantId is null (no associated_fleet_id in data), use all rows with accepted quote for demo/single-tenant.
 * Uses resolveKey for flexible column names (quote_status/Status, load_id/Load Number, etc.).
 */
export function deriveLoadsAndQuotes(
  flatRows: Record<string, unknown>[],
  tenantId: string | null
): Record<string, unknown>[] {
  if (flatRows.length === 0) return []
  const first = flatRows[0] as Record<string, unknown>
  const statusKey = resolveKey(first, 'quote_status') ?? resolveKey(first, 'status') ?? 'status'
  const loadIdKey = resolveKey(first, 'load_id') ?? 'load_id'
  const fidKey = resolveKey(first, 'associated_fleet_id')
  const seen = new Set<string>()
  const result: Record<string, unknown>[] = []
  for (const row of flatRows) {
    if (tenantId != null && fidKey) {
      const fid = row[fidKey] ?? row.associated_fleet_id
      if (String(fid || '') !== tenantId) continue
    }
    const qStatus = row[statusKey] ?? row.quote_status ?? row.status
    if (String(qStatus).toLowerCase() !== 'accepted') continue
    const loadId = row[loadIdKey] ?? row.load_id
    if (loadId == null) continue
    const key = String(loadId)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(row)
  }
  return result
}
