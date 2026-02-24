/** Fleet Profile — company name (editable), counts, rating (US4) */
import { useState, useEffect } from 'react'
import { getFieldLabel } from '../../lib/jobmarket/displayNames'
import { api } from '../../services/api'
import type { FleetProfile as FleetProfileType } from '../../lib/jobmarket/types'

interface FleetProfileProps {
  refreshTrigger?: number
}

export function FleetProfile({ refreshTrigger = 0 }: FleetProfileProps) {
  const [profile, setProfile] = useState<FleetProfileType | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [rating, setRating] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchProfile = async () => {
    try {
      const p = await api.jobmarket.getProfile()
      setProfile(p as FleetProfileType)
      setCompanyName(p.company_name)
      setRating(String(p.rating))
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [refreshTrigger])

  const handleSave = async () => {
    if (companyName.trim() === '') return
    setSaving(true)
    try {
      const updates: { company_name?: string; rating?: number } = { company_name: companyName.trim() }
      const r = Number(rating)
      if (!Number.isNaN(r)) updates.rating = Math.max(0, Math.min(5, r))
      await api.jobmarket.updateProfile(updates)
      setProfile((prev) =>
        prev
          ? { ...prev, company_name: companyName.trim(), rating: updates.rating ?? prev.rating }
          : null
      )
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return <p className="text-[var(--md-text-secondary)]">Loading profile…</p>

  return (
    <div className="rounded border border-black/12 bg-white p-4">
      <h3 className="text-lg font-semibold mb-3">Fleet Profile</h3>
      <dl className="grid grid-cols-2 gap-2 text-sm mb-4">
        <dt className="text-[var(--md-text-secondary)]">{getFieldLabel('total_jobs_completed')}</dt>
        <dd>{profile.total_jobs_completed}</dd>
        <dt className="text-[var(--md-text-secondary)]">{getFieldLabel('driver_count')}</dt>
        <dd>{profile.driver_count}</dd>
        <dt className="text-[var(--md-text-secondary)]">{getFieldLabel('vehicle_count')}</dt>
        <dd>{profile.vehicle_count}</dd>
      </dl>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <label htmlFor="fleet-rating" className="text-sm text-[var(--md-text-secondary)] min-w-[100px]">
            {getFieldLabel('rating')}
          </label>
          <input
            id="fleet-rating"
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="w-20 border border-black/20 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder={getFieldLabel('company_name')}
          className="flex-1 border border-black/20 rounded px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={
            saving ||
            (companyName.trim() === profile.company_name &&
              (rating === '' || Number(rating) === profile.rating || Number.isNaN(Number(rating))))
          }
          className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      </div>
    </div>
  )
}
