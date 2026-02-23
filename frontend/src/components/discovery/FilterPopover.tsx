import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { TableFilter } from '../../lib/discovery/types'

const NUMERIC_OPS = ['eq', 'ne', 'lt', 'lte', 'gt', 'gte', 'between'] as const

interface FilterPopoverProps {
  anchorEl: HTMLElement | null
  field: string
  header: string
  values: (string | number)[]
  sampleNum: number | null
  onClose: () => void
  onApply: (filter: TableFilter) => void
}

function isNumericColumn(values: (string | number)[], sampleNum: number | null): boolean {
  if (sampleNum != null) return true
  return values.every((v) => typeof v === 'number' || (typeof v === 'string' && /^-?\d*\.?\d+$/.test(v)))
}

export function FilterPopover({
  anchorEl,
  field,
  header,
  values,
  sampleNum,
  onClose,
  onApply,
}: FilterPopoverProps) {
  const [mode, setMode] = useState<'categorical' | 'numeric' | 'topbottom'>('categorical')
  const [op, setOp] = useState<string>('include')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [numOp, setNumOp] = useState<string>('eq')
  const [numVal, setNumVal] = useState<string>('')
  const [numValHi, setNumValHi] = useState<string>('')
  const [topBottom, setTopBottom] = useState<'top' | 'bottom'>('top')
  const [nVal, setNVal] = useState<string>('10')
  const popRef = useRef<HTMLDivElement>(null)
  const [adjustedLeft, setAdjustedLeft] = useState<number | null>(null)

  const numeric = isNumericColumn(values, sampleNum)
  const distinctVals = [...new Set(values)].slice(0, 100)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (anchorEl && popRef.current && !anchorEl.contains(e.target as Node) && !popRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [anchorEl, onClose])

  // Adjust position if popover would overflow viewport
  useEffect(() => {
    if (!popRef.current || !anchorEl) return
    const popRect = popRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const margin = 8
    if (popRect.right > viewportWidth - margin) {
      setAdjustedLeft(Math.max(margin, viewportWidth - popRect.width - margin))
    }
  }, [anchorEl])

  if (!anchorEl) return null

  const handleApplyCategorical = () => {
    if (checked.size === 0) return
    const arr = Array.from(checked)
    onApply({ field, operator: op as 'include' | 'exclude', value: arr })
    onClose()
  }

  const handleApplyNumeric = () => {
    const n = parseFloat(numVal)
    if (numOp === 'between') {
      const lo = parseFloat(numVal)
      const hi = parseFloat(numValHi)
      if (isNaN(lo) || isNaN(hi)) return
      onApply({ field, operator: 'between', value: [lo, hi] })
    } else {
      if (isNaN(n)) return
      onApply({ field, operator: numOp as TableFilter['operator'], value: n })
    }
    onClose()
  }

  const handleApplyTopBottom = () => {
    const n = parseInt(nVal, 10)
    if (isNaN(n) || n < 1) return
    onApply({
      field,
      operator: topBottom === 'top' ? 'top' : 'bottom',
      topBottomN: n,
    })
    onClose()
  }

  const toggleCheck = (v: string | number) => {
    const s = String(v)
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  const rect = anchorEl.getBoundingClientRect()
  const popoverEl = (
    <div
      ref={popRef}
      className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-black/12 py-3 min-w-[220px] max-w-[320px] max-h-[360px] overflow-y-auto"
      style={{ left: adjustedLeft ?? rect.left, top: rect.bottom + 4 }}
    >
      <div className="px-3 pb-2 border-b border-black/10 mb-2">
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode('categorical')}
            className={`px-2 py-1 rounded ${mode === 'categorical' ? 'bg-primary/15 text-primary' : 'text-[rgba(0,0,0,0.6)]'}`}
          >
            Include/Exclude
          </button>
          {numeric && (
            <>
              <button
                type="button"
                onClick={() => setMode('numeric')}
                className={`px-2 py-1 rounded ${mode === 'numeric' ? 'bg-primary/15 text-primary' : 'text-[rgba(0,0,0,0.6)]'}`}
              >
                Numeric
              </button>
              <button
                type="button"
                onClick={() => setMode('topbottom')}
                className={`px-2 py-1 rounded ${mode === 'topbottom' ? 'bg-primary/15 text-primary' : 'text-[rgba(0,0,0,0.6)]'}`}
              >
                Top/Bottom
              </button>
            </>
          )}
        </div>
      </div>
      {mode === 'categorical' && (
        <div className="px-3">
          <div className="flex gap-2 mb-2">
            <label className="flex items-center gap-1 text-sm">
              <input type="radio" checked={op === 'include'} onChange={() => setOp('include')} />
              Include
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input type="radio" checked={op === 'exclude'} onChange={() => setOp('exclude')} />
              Exclude
            </label>
          </div>
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {distinctVals.map((v) => (
              <label key={String(v)} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked.has(String(v))}
                  onChange={() => toggleCheck(v)}
                />
                <span className="truncate">{String(v)}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={handleApplyCategorical}
            disabled={checked.size === 0}
            className="mt-2 w-full px-3 py-1.5 bg-primary text-white rounded text-sm font-medium disabled:opacity-50"
          >
            Apply filter
          </button>
        </div>
      )}
      {mode === 'numeric' && (
        <div className="px-3">
          <select
            value={numOp}
            onChange={(e) => setNumOp(e.target.value)}
            className="w-full mb-2 px-2 py-1.5 border border-black/12 rounded text-sm"
          >
            {NUMERIC_OPS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          {numOp === 'between' ? (
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                value={numVal}
                onChange={(e) => setNumVal(e.target.value)}
                placeholder="Min"
                className="flex-1 px-2 py-1.5 border border-black/12 rounded text-sm"
              />
              <input
                type="number"
                value={numValHi}
                onChange={(e) => setNumValHi(e.target.value)}
                placeholder="Max"
                className="flex-1 px-2 py-1.5 border border-black/12 rounded text-sm"
              />
            </div>
          ) : (
            <input
              type="number"
              value={numVal}
              onChange={(e) => setNumVal(e.target.value)}
              className="w-full mb-2 px-2 py-1.5 border border-black/12 rounded text-sm"
            />
          )}
          <button
            type="button"
            onClick={handleApplyNumeric}
            className="w-full px-3 py-1.5 bg-primary text-white rounded text-sm font-medium"
          >
            Apply filter
          </button>
        </div>
      )}
      {mode === 'topbottom' && (
        <div className="px-3">
          <div className="flex gap-2 mb-2">
            <label className="flex items-center gap-1 text-sm">
              <input type="radio" checked={topBottom === 'top'} onChange={() => setTopBottom('top')} />
              Top
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input type="radio" checked={topBottom === 'bottom'} onChange={() => setTopBottom('bottom')} />
              Bottom
            </label>
          </div>
          <input
            type="number"
            min={1}
            value={nVal}
            onChange={(e) => setNVal(e.target.value)}
            className="w-full mb-2 px-2 py-1.5 border border-black/12 rounded text-sm"
          />
          <button
            type="button"
            onClick={handleApplyTopBottom}
            className="w-full px-3 py-1.5 bg-primary text-white rounded text-sm font-medium"
          >
            Apply filter
          </button>
        </div>
      )}
    </div>
  )
  return createPortal(popoverEl, document.body)
}
