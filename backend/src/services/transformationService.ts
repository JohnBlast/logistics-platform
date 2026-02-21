/**
 * AI-powered data transformation service.
 * Runs after enum mapping, before deduplication.
 * Applies deterministic cleaners based on TransformConfig.
 */

import { UK_CITIES, UK_TOWNS } from '../constants/ukLocations.js'
import type { TransformConfig, TransformRule } from '../types/transformConfig.js'

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return dp[m][n]
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

/** Parse date from various formats; output YYYY-MM-DD. */
export function cleanDate(val: unknown): string | null {
  if (val == null || val === '') return null
  const s = String(val).trim()
  if (!s) return null
  // Already ISO date
  const isoDateMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoDateMatch) return `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`
  // ISO datetime - extract date part
  const isoDtMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})T/)
  if (isoDtMatch) return `${isoDtMatch[1]}-${isoDtMatch[2]}-${isoDtMatch[3]}`
  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (UK-first: day before month)
  const ukMatch = s.replace(/\s+/g, '').replace(/\/\/+/g, '/').match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:[\sT].*)?$/)
  if (ukMatch) {
    const [, d, m, y] = ukMatch
    const day = parseInt(d!, 10)
    const month = parseInt(m!, 10)
    const year = parseInt(y!, 10)
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }
  // MM-DD-YYYY (US format)
  const usMatch = s.replace(/\s+/g, '').match(/^(\d{1,2})-(\d{1,2})-(\d{4})/)
  if (usMatch) {
    const [, m, d, y] = usMatch
    const month = parseInt(m!, 10)
    const day = parseInt(d!, 10)
    const year = parseInt(y!, 10)
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }
  try {
    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10)
    }
  } catch {
    // fall through
  }
  return null
}

/** Parse datetime; output ISO 8601. */
export function cleanDatetime(val: unknown): string | null {
  if (val == null || val === '') return null
  const s = String(val).trim()
  if (!s) return null
  // Already ISO datetime
  if (s.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) return new Date(s).toISOString()
  // Date only - treat as midnight UTC
  const datePart = cleanDate(s)
  if (datePart) return `${datePart}T00:00:00.000Z`
  try {
    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  } catch {
    // fall through
  }
  return null
}

/** Strip suffixes (e.g. £, GBP, km, kg), normalize comma-decimal and comma-thousands. Output string representation. */
export function cleanNumber(val: unknown, stripSuffixes?: string[]): string | number | null {
  if (val == null || val === '') return null
  if (typeof val === 'number') {
    return Number.isFinite(val) ? (val % 1 === 0 ? String(val) : val.toFixed(2)) : null
  }
  let s = String(val).trim()
  const suffixes = stripSuffixes ?? ['£', 'GBP', 'km', 'KM', 'kg', 'KG']
  for (const suf of suffixes) {
    const reSuffix = new RegExp(`\\s*${escapeRegex(suf)}\\s*$`, 'gi')
    const rePrefix = new RegExp(`^\\s*${escapeRegex(suf)}\\s*`, 'gi')
    s = s.replace(reSuffix, '').replace(rePrefix, '')
  }
  s = s.replace(/\s+$/, '').replace(/^\s+/, '').trim()
  if (!s) return null
  // Comma-decimal (European): 781,68
  if (/^\d[\d\s]*,\d+$/.test(s)) {
    const n = Number(s.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(n) ? (n % 1 === 0 ? String(n) : n.toFixed(2)) : null
  }
  // Comma-thousands: 1,234.56
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    const n = Number(s.replace(/,/g, ''))
    return Number.isFinite(n) ? (n % 1 === 0 ? String(n) : n.toFixed(2)) : null
  }
  const n = Number(s)
  return Number.isFinite(n) ? (n % 1 === 0 ? String(n) : n.toFixed(2)) : null
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Parse to integer. */
export function cleanInteger(val: unknown): number | null {
  if (val == null || val === '') return null
  if (typeof val === 'number') return Number.isFinite(val) ? Math.round(val) : null
  const s = String(val).replace(/[^\d.-]/g, '').trim()
  if (!s) return null
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : null
}

/** Fuzzy-match to closest UK city or town from reference list. Output canonical name. */
export function cleanLocation(val: unknown, referenceList: readonly string[]): string | null {
  if (val == null || val === '') return null
  const s = String(val).trim()
  if (!s) return null
  const list = referenceList as string[]
  const lowered = s.toLowerCase()
  // Exact match (case-insensitive)
  const exact = list.find((c) => c.toLowerCase() === lowered)
  if (exact) return exact
  // Trimmed match
  const trimmed = list.find((c) => c.trim().toLowerCase() === lowered)
  if (trimmed) return trimmed
  // Fuzzy match (Levenshtein)
  const norm = normalizeForMatch(s)
  let bestMatch: string | null = null
  let bestDist = Infinity
  for (const ref of list) {
    const refNorm = normalizeForMatch(ref)
    if (norm === refNorm) return ref
    const d = levenshtein(norm, refNorm)
    if (d < bestDist) {
      bestDist = d
      bestMatch = ref
    }
  }
  const threshold = Math.max(2, Math.floor(norm.length * 0.3))
  return bestDist <= threshold && bestMatch ? bestMatch : s.trim()
}

/** Title Case (first letter of each word uppercase). No spell correction. */
export function cleanPersonName(val: unknown): string | null {
  if (val == null || val === '') return null
  const s = String(val).trim()
  if (!s) return null
  return s
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
}

/** Lowercase, trim. */
export function cleanEmail(val: unknown): string | null {
  if (val == null || val === '') return null
  const s = String(val).trim().toLowerCase()
  if (!s) return null
  return s
}

/** Strip non-digits; keep as string. UK mobile 07XXXXXXXXX format preferred. */
export function cleanPhone(val: unknown): string | null {
  if (val == null || val === '') return null
  const s = String(val).trim()
  if (!s) return null
  const digits = s.replace(/\D/g, '')
  return digits.length >= 10 ? digits : s
}

/** Uppercase, normalize separators (dashes/spaces to single space). */
export function cleanRegistration(val: unknown): string | null {
  if (val == null || val === '') return null
  const s = String(val)
    .trim()
    .toUpperCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
  if (!s) return null
  return s
}

/** Trim whitespace. */
export function cleanUuid(val: unknown): string | null {
  if (val == null || val === '') return null
  const s = String(val).trim()
  if (!s) return null
  return s
}

function applyRule(val: unknown, rule: TransformRule): unknown {
  if (val == null || val === '') return val
  switch (rule.type) {
    case 'skip':
      return typeof val === 'string' ? val.trim() : val
    case 'date':
      return cleanDate(val)
    case 'datetime':
      return cleanDatetime(val)
    case 'number':
      return cleanNumber(val, rule.stripSuffixes)
    case 'integer':
      return cleanInteger(val)
    case 'location_city': {
      const list = rule.referenceList ?? [...UK_CITIES]
      return cleanLocation(val, list)
    }
    case 'location_town': {
      const list = rule.referenceList ?? [...UK_TOWNS]
      return cleanLocation(val, list)
    }
    case 'person_name':
      return cleanPersonName(val)
    case 'email':
      return cleanEmail(val)
    case 'phone':
      return cleanPhone(val)
    case 'registration':
      return cleanRegistration(val)
    case 'uuid':
      return cleanUuid(val)
    default:
      return val
  }
}

/**
 * Apply transformations to rows based on config.
 * Runs after enum mapping, before deduplication.
 */
export function applyTransformations(
  rows: Record<string, unknown>[],
  objectType: string,
  config: TransformConfig | undefined
): Record<string, unknown>[] {
  if (!config || !config[objectType]) return rows
  const entityConfig = config[objectType]
  return rows.map((row) => {
    const out = { ...row }
    for (const [field, rule] of Object.entries(entityConfig)) {
      if (!(field in row)) continue
      out[field] = applyRule(row[field], rule)
    }
    return out
  })
}