/** Debug Log page — accessible via /debug-log, shows captured errors/warnings/API failures with copy-paste */
import { useState, useEffect, useCallback } from 'react'
import {
  getLogEntries,
  clearLogEntries,
  subscribe,
  formatLogsAsText,
  type DebugLogEntry,
} from '../services/debugLogStore'

const LEVEL_STYLES: Record<string, string> = {
  error: 'bg-red-100 text-red-800',
  warn: 'bg-amber-100 text-amber-800',
  info: 'bg-blue-100 text-blue-800',
  api: 'bg-purple-100 text-purple-800',
}

export function DebugLog() {
  const [entries, setEntries] = useState<DebugLogEntry[]>(getLogEntries)
  const [copied, setCopied] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    return subscribe(() => setEntries(getLogEntries()))
  }, [])

  const handleCopy = useCallback(async () => {
    const text = formatLogsAsText()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: open in a textarea for manual copy
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [])

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--md-text-primary)]">Debug Log</h1>
          <p className="text-sm text-[var(--md-text-secondary)] mt-1">
            Captures console errors, API failures, and warnings. Copy and share to report issues.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
              copied
                ? 'bg-green-100 text-green-800 border-green-300'
                : 'bg-white text-[var(--md-text-primary)] border-black/20 hover:bg-black/4'
            }`}
          >
            {copied ? 'Copied!' : 'Copy All'}
          </button>
          <button
            type="button"
            onClick={clearLogEntries}
            className="px-4 py-2 text-sm font-medium rounded border border-black/20 bg-white text-[var(--md-text-primary)] hover:bg-black/4"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Summary counters */}
      <div className="flex gap-3 text-sm">
        {(['error', 'warn', 'api', 'info'] as const).map((level) => {
          const count = entries.filter((e) => e.level === level).length
          if (count === 0) return null
          return (
            <span
              key={level}
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${LEVEL_STYLES[level]}`}
            >
              {count} {level === 'api' ? 'API error' : level}{count !== 1 ? 's' : ''}
            </span>
          )
        })}
        {entries.length === 0 && (
          <span className="text-[var(--md-text-secondary)]">No entries captured yet. Errors and API failures will appear here automatically.</span>
        )}
      </div>

      {/* Log entries */}
      {entries.length > 0 && (
        <div className="rounded border border-black/12 bg-white overflow-hidden divide-y divide-black/6">
          {[...entries].reverse().map((entry) => (
            <div key={entry.id} className="px-4 py-2.5 text-sm hover:bg-black/2">
              <div className="flex items-start gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${LEVEL_STYLES[entry.level]}`}>
                  {entry.level.toUpperCase()}
                </span>
                <span className="text-xs text-[var(--md-text-secondary)] shrink-0 font-mono mt-0.5">
                  {entry.timestamp.slice(11, 23)}
                </span>
                <span className="text-xs text-[var(--md-text-secondary)] shrink-0 mt-0.5">
                  [{entry.source}]
                </span>
                <span className="min-w-0 break-words flex-1 text-[var(--md-text-primary)]">
                  {entry.message}
                </span>
                {entry.data && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(entry.id)}
                    className="text-xs text-primary hover:underline shrink-0"
                  >
                    {expandedIds.has(entry.id) ? 'Hide' : 'Details'}
                  </button>
                )}
              </div>
              {entry.data && expandedIds.has(entry.id) && (
                <pre className="mt-2 ml-[4.5rem] p-3 bg-slate-50 rounded text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap border border-slate-200">
                  {entry.data}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
