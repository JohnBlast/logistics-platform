const API_URL = import.meta.env.VITE_API_URL || ''

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export interface FilterInterpretedRule {
  structured: { field?: string; op: string; value?: unknown; type?: 'inclusion' | 'exclusion' }
  label?: string
}

export interface Profile {
  id: string
  name: string
  description: string | null
  status: 'active' | 'draft' | 'archive'
  dataModelVersion: string
  aiMode: 'claude' | 'mocked'
  mappings: Record<string, Record<string, string>>
  lockedMappings?: Record<string, Record<string, string>>
  enumMappings?: Record<string, Record<string, Record<string, string>>>
  joins: unknown[]
  filters: unknown[]
  createdAt: string
  updatedAt: string
}

export const api = {
  health: {
    ai: () => fetchApi<{ claudeAvailable: boolean }>('/api/health/ai'),
  },
  profiles: {
    list: () => fetchApi<Profile[]>('/api/profiles'),
    get: (id: string) => fetchApi<Profile>(`/api/profiles/${id}`),
    create: (data: { name: string; description?: string; dataModelVersion?: string; aiMode?: 'claude' | 'mocked' }) =>
      fetchApi<Profile>('/api/profiles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Profile>) =>
      fetchApi<Profile>(`/api/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    activate: (id: string) =>
      fetchApi<Profile>(`/api/profiles/${id}/activate`, { method: 'POST' }),
    duplicate: (id: string) =>
      fetchApi<Profile>(`/api/profiles/${id}/duplicate`, { method: 'POST' }),
    delete: (id: string) =>
      fetchApi<void>(`/api/profiles/${id}`, { method: 'DELETE' }),
  },
  ingest: {
    generate: (objectType: string, extras?: { loadIds?: string[]; loadRows?: Record<string, unknown>[] }) =>
      fetchApi<{ headers: string[]; rows: Record<string, unknown>[]; loadIds?: string[]; updatedLoadRows?: Record<string, unknown>[] }>(
        '/api/ingest/generate',
        { method: 'POST', body: JSON.stringify({ objectType, ...extras }) }
      ),
    upload: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_URL}/api/ingest/upload`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || res.statusText)
      }
      return res.json()
    },
  },
  mapping: {
    suggest: (
      objectType: string,
      sourceHeaders: string[],
      sourceRows: Record<string, unknown>[],
      lockedMappings?: Record<string, string>,
      aiMode?: 'claude' | 'mocked'
    ) =>
      fetchApi<{ suggestions: { targetField: string; sourceColumn: string; confidence: number }[] }>(
        '/api/mapping/suggest',
        { method: 'POST', body: JSON.stringify({ objectType, sourceHeaders, sourceRows, lockedMappings, aiMode }) }
      ),
  },
  schema: {
    get: () => fetchApi<{ entities: { name: string; description?: string; fields: { name: string; type: string; required: boolean; description?: string }[]; enums?: Record<string, readonly string[]> }[]; flatTableEnums?: Record<string, string[]> }>('/api/schema'),
    enumValues: (field: string) => fetchApi<{ validValues: string[] }>(`/api/schema/enum/${field}`),
    enumFields: (entity: string) =>
      fetchApi<{ enumFields: { field: string; validValues: string[] }[] }>(`/api/schema/enum-fields/${entity}`),
    suggestEnumMappings: (sourceValues: string[], validValues: string[], aiMode?: 'claude' | 'mocked') =>
      fetchApi<{ suggestions: Record<string, string> }>('/api/schema/suggest-enum-mappings', {
        method: 'POST',
        body: JSON.stringify({ sourceValues, validValues, aiMode }),
      }),
  },
  joins: {
    interpret: (rule: string, aiMode?: 'claude' | 'mocked') =>
      fetchApi<{ structured: Record<string, unknown> }>('/api/joins/interpret', {
        method: 'POST',
        body: JSON.stringify({ rule, aiMode }),
      }),
  },
  filters: {
    interpret: (rule: string, aiMode?: 'claude' | 'mocked') =>
      fetchApi<{ rules: FilterInterpretedRule[] }>(
        '/api/filters/interpret',
        { method: 'POST', body: JSON.stringify({ rule, aiMode }) }
      ),
  },
  pipeline: {
    validate: (profileId: string, sessionData: unknown, opts?: { joinOnly?: boolean; filtersOverride?: unknown[]; joinsOverride?: unknown[] }) =>
      fetchApi<{
        rowsSuccessful: number
        rowsDropped: number
        fieldsWithWarnings: string[]
        dedupWarnings: string[]
        filterFieldWarnings: string[]
        flatRows: Record<string, unknown>[]
        excludedByFilter?: Record<string, unknown>[]
        excludedByFilterCount?: number
        ruleEffects?: { ruleIndex: number; rule: string; type: string; before: number; after: number; excluded: number }[]
        cellsWithWarnings?: number
        nullOrEmptyCells?: number
        nullOrErrorFields?: string[]
        joinSteps?: { name: string; leftEntity: string; rightEntity: string; leftKey: string; rightKey: string; fallbackKey?: string; rowsBefore: number; rowsAfter: number }[]
      }>(
        '/api/pipeline/validate',
        { method: 'POST', body: JSON.stringify({ profileId, sessionData, joinOnly: opts?.joinOnly, filtersOverride: opts?.filtersOverride, joinsOverride: opts?.joinsOverride }) }
      ),
    run: (sessionData: unknown) =>
      fetchApi<{ rowsSuccessful: number; rowsDropped: number; flatRows: Record<string, unknown>[] }>(
        '/api/pipeline/run',
        { method: 'POST', body: JSON.stringify({ sessionData }) }
      ),
  },
}
