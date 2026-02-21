import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { api } from '../services/api'

const STORAGE_KEY = 'pipeline_output'

export interface PipelineOutput {
  flatRows: Record<string, unknown>[]
  quoteRows: Record<string, unknown>[]
  loadRows: Record<string, unknown>[]
  vehicleDriverRows: Record<string, unknown>[]
  truncated?: boolean
  totalRows?: number
}

interface PipelineOutputContextValue {
  pipelineOutput: PipelineOutput | null
  setPipelineOutput: (data: PipelineOutput) => void
  clearPipelineOutput: () => void
}

const PipelineOutputContext = createContext<PipelineOutputContextValue | null>(null)

export function usePipelineOutput() {
  const ctx = useContext(PipelineOutputContext)
  if (!ctx) throw new Error('usePipelineOutput must be used within PipelineOutputProvider')
  return ctx
}

function loadFromStorage(): PipelineOutput | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PipelineOutput
    if (!parsed.flatRows || !Array.isArray(parsed.flatRows)) return null
    return parsed
  } catch {
    return null
  }
}

function saveToStorage(data: PipelineOutput): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // QuotaExceededError or similar - ignore
  }
}

function clearStorage(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

interface PipelineOutputProviderProps {
  children: ReactNode
}

export function PipelineOutputProvider({ children }: PipelineOutputProviderProps) {
  const [pipelineOutput, setState] = useState<PipelineOutput | null>(() => loadFromStorage())

  useEffect(() => {
    api.discovery
      .getData()
      .then((data) => {
        if (data?.flatRows && Array.isArray(data.flatRows)) {
          setState(data)
          saveToStorage(data)
        }
      })
      .catch(() => {
        /* Keep state from storage or null on fetch failure */
      })
  }, [])

  const setPipelineOutput = useCallback((data: PipelineOutput) => {
    setState(data)
    saveToStorage(data)
  }, [])

  const clearPipelineOutput = useCallback(() => {
    setState(null)
    clearStorage()
    api.discovery.clearData().catch(() => {})
  }, [])

  return (
    <PipelineOutputContext.Provider
      value={{ pipelineOutput, setPipelineOutput, clearPipelineOutput }}
    >
      {children}
    </PipelineOutputContext.Provider>
  )
}
