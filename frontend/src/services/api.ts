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
  discovery: {
    getData: () =>
      fetch(`${API_URL}/api/discovery/data`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null) as Promise<{
        flatRows: Record<string, unknown>[]
        quoteRows: Record<string, unknown>[]
        loadRows: Record<string, unknown>[]
        vehicleDriverRows: Record<string, unknown>[]
        truncated?: boolean
        totalRows?: number
      } | null>,
    clearData: () => fetchApi<void>(`/api/discovery/data`, { method: 'DELETE' }),
  },
  chat: async (
    prompt: string,
    opts?: {
      conversationHistory?: { role: string; content: string }[]
      previousTableInstruction?: Record<string, unknown>
      dataColumns?: string[]
    }
  ): Promise<{ summary: string; title: string; tableInstruction?: Record<string, unknown> }> => {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        conversationHistory: opts?.conversationHistory ?? [],
        previousTableInstruction: opts?.previousTableInstruction,
        dataColumns: opts?.dataColumns ?? [],
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const code = body.code || (res.status === 429 ? 'RATE_LIMIT' : res.status === 503 ? 'CLAUDE_UNAVAILABLE' : 'GENERATION_FAILED')
      const msg = body.error || body.message || res.statusText
      const err = new Error(msg) as Error & { code?: string; summary?: string }
      err.code = code
      err.summary = body.summary || msg
      throw err
    }
    return body
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
        quoteRows: Record<string, unknown>[]
        loadRows: Record<string, unknown>[]
        vehicleDriverRows: Record<string, unknown>[]
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
      fetchApi<{ rowsSuccessful: number; rowsDropped: number; flatRows: Record<string, unknown>[]; quoteRows: Record<string, unknown>[]; loadRows: Record<string, unknown>[]; vehicleDriverRows: Record<string, unknown>[]; truncated?: boolean; totalRows?: number }>(
        '/api/pipeline/run',
        { method: 'POST', body: JSON.stringify({ sessionData }) }
      ),
  },
}
