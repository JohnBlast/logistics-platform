/** Generate Jobs — Load Poster generates jobs (US3) */
import { useState } from 'react'

interface GenerateJobsProps {
  onGenerate: (count: number) => Promise<void>
  disabled?: boolean
}

export function GenerateJobs({ onGenerate, disabled }: GenerateJobsProps) {
  const [count, setCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<number | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setLastGenerated(null)
    try {
      await onGenerate(count)
      setLastGenerated(count)
      setTimeout(() => setLastGenerated(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded border border-black/12 bg-white p-4">
      <h3 className="text-lg font-semibold mb-3">Generate Jobs</h3>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-sm">Count</span>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className="border border-black/20 rounded px-2 py-1.5 w-20 text-sm"
          />
          <span className="text-xs text-[var(--md-text-secondary)]">max 20</span>
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={disabled || loading}
          className="px-4 py-2 bg-primary text-white rounded font-medium text-sm hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? 'Generating\u2026' : 'Generate Jobs'}
        </button>
        {lastGenerated !== null && (
          <span className="text-xs text-green-600 font-medium">
            {lastGenerated} job{lastGenerated !== 1 ? 's' : ''} generated
          </span>
        )}
      </div>
    </div>
  )
}
