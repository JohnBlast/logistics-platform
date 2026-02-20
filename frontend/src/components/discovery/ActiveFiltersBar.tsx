import type { TableFilter } from '../../lib/discovery/types'

interface ActiveFiltersBarProps {
  filters: TableFilter[]
  onRemove: (index: number) => void
  onClearAll: () => void
}

function filterLabel(f: TableFilter): string {
  if (f.operator === 'include' && Array.isArray(f.value)) {
    return `${f.field}: include ${f.value.length} value(s)`
  }
  if (f.operator === 'exclude' && Array.isArray(f.value)) {
    return `${f.field}: exclude ${f.value.length} value(s)`
  }
  if (f.operator === 'top' && typeof f.topBottomN === 'number') {
    return `${f.field}: top ${f.topBottomN}`
  }
  if (f.operator === 'bottom' && typeof f.topBottomN === 'number') {
    return `${f.field}: bottom ${f.topBottomN}`
  }
  if (f.operator === 'between' && Array.isArray(f.value) && f.value.length >= 2) {
    return `${f.field}: ${f.value[0]}–${f.value[1]}`
  }
  if (f.value != null) {
    return `${f.field} ${f.operator} ${String(f.value)}`
  }
  return `${f.field} ${f.operator}`
}

export function ActiveFiltersBar({ filters, onRemove, onClearAll }: ActiveFiltersBarProps) {
  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-black/4 rounded-lg">
      <span className="text-xs text-[rgba(0,0,0,0.6)] font-medium">Filters:</span>
      {filters.map((f, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onRemove(i)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-black/12 rounded text-xs font-medium text-[rgba(0,0,0,0.87)] hover:bg-black/4 hover:border-black/20"
        >
          {filterLabel(f)}
          <span className="text-[rgba(0,0,0,0.5)] hover:text-red-600">×</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-primary hover:underline"
      >
        Clear all
      </button>
    </div>
  )
}
