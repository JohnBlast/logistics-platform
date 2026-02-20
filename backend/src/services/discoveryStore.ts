/** In-memory store for last pipeline run output. Discovery fetches from here. */

export interface StoredPipelineOutput {
  flatRows: Record<string, unknown>[]
  quoteRows: Record<string, unknown>[]
  loadRows: Record<string, unknown>[]
  vehicleDriverRows: Record<string, unknown>[]
  truncated?: boolean
  totalRows?: number
}

let stored: StoredPipelineOutput | null = null

export function getDiscoveryData(): StoredPipelineOutput | null {
  return stored
}

export function setDiscoveryData(data: StoredPipelineOutput): void {
  stored = data
}

export function clearDiscoveryData(): void {
  stored = null
}
