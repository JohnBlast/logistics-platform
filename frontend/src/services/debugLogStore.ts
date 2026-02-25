/**
 * Global debug log store — captures console errors, API failures, and app events.
 * Accessible via /debug-log route so users can copy-paste issues to report.
 */

export interface DebugLogEntry {
  id: number
  timestamp: string
  level: 'error' | 'warn' | 'info' | 'api'
  source: string
  message: string
  data?: string
}

let nextId = 1
let entries: DebugLogEntry[] = []
let listeners: (() => void)[] = []

const MAX_ENTRIES = 500

function notify() {
  for (const fn of listeners) fn()
}

export function addLogEntry(level: DebugLogEntry['level'], source: string, message: string, data?: unknown) {
  const entry: DebugLogEntry = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    level,
    source,
    message: String(message),
    data: data !== undefined ? safeStringify(data) : undefined,
  }
  entries = [...entries.slice(-(MAX_ENTRIES - 1)), entry]
  notify()
}

function safeStringify(val: unknown): string {
  try {
    return JSON.stringify(val, null, 2)
  } catch {
    return String(val)
  }
}

export function getLogEntries(): DebugLogEntry[] {
  return entries
}

export function clearLogEntries() {
  entries = []
  notify()
}

export function subscribe(fn: () => void): () => void {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

/**
 * Format all log entries as plain text for copy-paste.
 */
export function formatLogsAsText(): string {
  if (entries.length === 0) return '(no debug log entries captured)'
  const lines = entries.map((e) => {
    const parts = [
      `[${e.timestamp}]`,
      `[${e.level.toUpperCase()}]`,
      `[${e.source}]`,
      e.message,
    ]
    if (e.data) parts.push(`\n  ${e.data.replace(/\n/g, '\n  ')}`)
    return parts.join(' ')
  })
  return [
    `Debug Log — ${new Date().toISOString()}`,
    `User Agent: ${navigator.userAgent}`,
    `URL: ${window.location.href}`,
    `Entries: ${entries.length}`,
    '---',
    ...lines,
  ].join('\n')
}

/**
 * Install global interceptors (call once at app boot):
 * - Patches console.error / console.warn
 * - Patches window.onerror / unhandledrejection
 * - Patches fetch to log API errors
 */
export function installGlobalInterceptors() {
  // Console.error
  const origError = console.error
  console.error = (...args: unknown[]) => {
    addLogEntry('error', 'console', args.map(String).join(' '))
    origError.apply(console, args)
  }

  // Console.warn
  const origWarn = console.warn
  console.warn = (...args: unknown[]) => {
    addLogEntry('warn', 'console', args.map(String).join(' '))
    origWarn.apply(console, args)
  }

  // Unhandled errors
  window.addEventListener('error', (ev) => {
    addLogEntry('error', 'uncaught', ev.message, {
      filename: ev.filename,
      lineno: ev.lineno,
      colno: ev.colno,
    })
  })

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (ev) => {
    addLogEntry('error', 'promise', String(ev.reason))
  })

  // Fetch interceptor for API errors (both HTTP errors and soft errors in response body)
  const origFetch = window.fetch
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : String(args[0])
    if (!url.includes('/api/')) {
      return origFetch.apply(window, args)
    }
    const method = (args[1] as RequestInit)?.method ?? 'GET'
    try {
      const res = await origFetch.apply(window, args)
      if (!res.ok) {
        const body = await res.clone().text().catch(() => '')
        addLogEntry('api', 'fetch', `${res.status} ${method} ${url}`, body.slice(0, 1000))
      } else {
        // Also detect soft errors: 200 responses that contain error/ai_error fields
        try {
          const cloned = res.clone()
          const contentType = cloned.headers.get('content-type') ?? ''
          if (contentType.includes('application/json')) {
            const json = await cloned.json()
            if (json && typeof json === 'object') {
              if (json.ai_error) {
                addLogEntry('warn', 'api-soft', `AI error in ${method} ${url}: ${json.ai_error}`, json)
              } else if (json.error && typeof json.error === 'string') {
                addLogEntry('warn', 'api-soft', `Error in ${method} ${url}: ${json.error}`, json)
              }
            }
          }
        } catch {
          // ignore JSON parse failures on clone — don't break the response
        }
      }
      return res
    } catch (err) {
      addLogEntry('api', 'fetch', `Network error: ${method} ${url}`, String(err))
      throw err
    }
  }
}
