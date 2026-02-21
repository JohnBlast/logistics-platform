import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, type Profile } from '../services/api'
import { getRequiredFromSchema } from '../utils/schemaUtils'
import { Ingestion } from '../components/etl/Ingestion'
import { Mapping } from '../components/etl/Mapping'
import { EnumMapping } from '../components/etl/EnumMapping'
import { Joins } from '../components/etl/Joins'
import { Filtering } from '../components/etl/Filtering'
import { Validation } from '../components/etl/Validation'

const STEPS = ['ingestion', 'mapping', 'enum_mapping', 'joins', 'filtering', 'validation'] as const
type Step = (typeof STEPS)[number]

const STEP_LABELS: Record<Step, string> = {
  ingestion: 'Ingestion',
  mapping: 'Mapping',
  enum_mapping: 'Enum mapping',
  joins: 'Joins',
  filtering: 'Filtering',
  validation: 'Validation',
}

function allRequiredMapped(m: Record<string, string> | undefined, required: string[]): boolean {
  if (!m) return false
  return required.every((r) => m[r])
}

export function ETLFlow() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [step, setStep] = useState<Step>('ingestion')
  const [skippedSteps, setSkippedSteps] = useState<Set<Step>>(new Set())
  const [sessionData, setSessionData] = useState<{
    quote?: { headers: string[]; rows: Record<string, unknown>[] }
    load?: { headers: string[]; rows: Record<string, unknown>[]; loadIds?: string[] }
    driver_vehicle?: { headers: string[]; rows: Record<string, unknown>[] }
  }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successToast, setSuccessToast] = useState(false)
  const [lastValidFingerprint, setLastValidFingerprint] = useState<string | null>(null)
  const [claudeAvailable, setClaudeAvailable] = useState<boolean | null>(null)
  const [schemaEntities, setSchemaEntities] = useState<{ fields: { name: string; required?: boolean }[] }[] | null>(null)

  const computeFingerprint = () =>
    JSON.stringify({
      mappings: profile?.mappings,
      enumMappings: profile?.enumMappings,
      joins: profile?.joins,
      filters: profile?.filters,
      data: {
        quote: sessionData.quote?.rows?.length ?? 0,
        load: sessionData.load?.rows?.length ?? 0,
        dv: sessionData.driver_vehicle?.rows?.length ?? 0,
      },
    })

  const canProceedFromIngestion =
    !!sessionData.quote?.rows?.length &&
    !!sessionData.load?.rows?.length &&
    !!sessionData.driver_vehicle?.rows?.length

  const saveDisabledByReRun =
    lastValidFingerprint != null && computeFingerprint() !== lastValidFingerprint

  const requiredQuote = getRequiredFromSchema(schemaEntities, 'quote')
  const requiredLoad = getRequiredFromSchema(schemaEntities, 'load')
  const requiredDv = getRequiredFromSchema(schemaEntities, 'driver_vehicle')
  const mappingOk =
    allRequiredMapped(profile?.mappings?.quote, requiredQuote) &&
    allRequiredMapped(profile?.mappings?.load, requiredLoad) &&
    allRequiredMapped(profile?.mappings?.driver_vehicle, requiredDv)

  const currentStepIdx = STEPS.indexOf(step)
  const stepStatus: Record<Step, 'ok' | 'error' | 'active' | 'skipped' | 'pending'> = (() => {
    const out = {} as Record<Step, 'ok' | 'error' | 'active' | 'skipped' | 'pending'>
    STEPS.forEach((s, idx) => {
      if (step === s) {
        out[s] = 'active'
      } else if (skippedSteps.has(s)) {
        out[s] = 'skipped'
      } else if (idx < currentStepIdx) {
        if (s === 'ingestion') out[s] = canProceedFromIngestion ? 'ok' : 'error'
        else if (s === 'mapping') out[s] = mappingOk ? 'ok' : 'error'
        else out[s] = 'ok'
      } else {
        out[s] = 'pending'
      }
    })
    return out
  })()

  const handleSkip = (s: Step) => {
    setSkippedSteps((prev) => new Set(prev).add(s))
    const idx = STEPS.indexOf(s)
    if (idx >= 0 && idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }

  useEffect(() => {
    if (!id) return
    api.profiles
      .get(id)
      .then((p) => {
        setProfile(p)
        if (p.status !== 'draft') setStep('validation')
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
    api.health.ai().then((r) => setClaudeAvailable(r.claudeAvailable)).catch(() => setClaudeAvailable(false))
    api.schema.get().then((r) => setSchemaEntities((r as { entities: { fields: { name: string; required?: boolean }[] }[] }).entities ?? [])).catch(() => setSchemaEntities(null))
  }, [id])

  // Auto-load sample data for view-only mode so the pipeline can be previewed
  useEffect(() => {
    if (!profile || profile.status === 'draft') return
    if (sessionData.quote?.rows?.length && sessionData.load?.rows?.length && sessionData.driver_vehicle?.rows?.length) return
    let cancelled = false
    ;(async () => {
      try {
        const loadRes = await api.ingest.generate('load')
        if (cancelled) return
        const quoteRes = await api.ingest.generate('quote', { loadIds: loadRes.loadIds })
        if (cancelled) return
        const dvRes = await api.ingest.generate('driver_vehicle', { loadRows: loadRes.rows })
        if (cancelled) return
        const mergedLoadRows = dvRes.updatedLoadRows ?? loadRes.rows
        setSessionData({
          load: { headers: loadRes.headers, rows: mergedLoadRows, loadIds: loadRes.loadIds },
          quote: { headers: quoteRes.headers, rows: quoteRes.rows },
          driver_vehicle: { headers: dvRes.headers, rows: dvRes.rows },
        })
      } catch {
        if (!cancelled) setError('Could not load sample data for preview.')
      }
    })()
    return () => { cancelled = true }
  }, [profile?.id, profile?.status])

  const handleSave = async () => {
    if (!profile?.id || !sessionData.quote || !sessionData.load || !sessionData.driver_vehicle) return
    if (saveDisabledByReRun) return
    try {
      const summary = await api.pipeline.validate(profile.id, {
        quote: sessionData.quote,
        load: sessionData.load,
        driver_vehicle: sessionData.driver_vehicle,
      })
      if (summary.rowsSuccessful < 1) {
        setError('No rows passed. Adjust mapping, joins, or filters.')
        return
      }
      await api.profiles.activate(profile.id)
      setProfile(await api.profiles.get(profile.id))
      setError('')
      setSuccessToast(true)
      setTimeout(() => setSuccessToast(false), 4000)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (loading || !profile) return <div className="text-[rgba(0,0,0,0.6)]">Loading...</div>

  const viewOnly = profile.status !== 'draft'

  return (
    <div>
      {viewOnly && (
        <div className="mb-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-sm">
          View-only mode — this profile is {profile.status}. Duplicate to edit.
        </div>
      )}
      {profile.aiMode === 'claude' && claudeAvailable === false && (
        <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          Claude AI is selected but the API key is not configured. Add <code className="bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> to your <code className="bg-amber-100 px-1 rounded">.env</code> at project root and restart the backend. Until then, AI features (mapping suggestions, joins, natural-language filters) will not work.
        </div>
      )}
      <div className="flex items-center gap-2 mb-6">
        <Link to="/etl" className="text-primary hover:underline font-medium">
          ← Profiles
        </Link>
        <span className="text-[rgba(0,0,0,0.38)]">/</span>
        <span className="font-medium text-[rgba(0,0,0,0.87)]">{profile.name}</span>
        {profile.aiMode === 'claude' && (
          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary/12 text-primary rounded">Claude AI</span>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center overflow-x-auto pb-2">
          {STEPS.map((s, idx) => {
            const status = stepStatus[s]
            const isActive = step === s
            const isComplete = status === 'ok'
            const isSkipped = status === 'skipped'
            return (
              <div key={s} className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setStep(s)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-md-2 scale-105'
                      : status === 'error'
                        ? 'bg-red-50 text-red-800 border-2 border-red-300'
                        : isSkipped
                          ? 'bg-amber-50 text-amber-800 border-2 border-amber-300'
                          : 'bg-white border border-black/12 shadow-md-1 hover:shadow-md-2 hover:border-primary/30'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      isActive
                        ? 'bg-white/20'
                        : status === 'error'
                          ? 'bg-red-200'
                          : isSkipped
                            ? 'bg-amber-200'
                            : 'bg-black/8'
                    }`}
                    title={isSkipped ? 'Skipped' : isComplete ? 'Completed' : status === 'pending' ? 'Pending' : ''}
                  >
                    {isComplete && !isActive ? '✓' : isSkipped ? '⚠' : idx + 1}
                  </span>
                  <span className="font-medium text-sm hidden sm:inline">{STEP_LABELS[s]}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${isComplete || isSkipped ? 'bg-black/20' : 'bg-black/12'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-800 rounded shadow-md-1 border border-red-200">{error}</div>
      )}
      {successToast && (
        <div className="mb-6 p-4 bg-green-50 text-green-800 rounded shadow-md-1 border border-green-200">
          Profile saved and activated successfully.
        </div>
      )}

      {step === 'ingestion' && (
        <Ingestion
          sessionData={sessionData}
          onUpdate={setSessionData}
          onNext={() => setStep('mapping')}
          canProceed={!!canProceedFromIngestion}
          aiMode={profile.aiMode}
          viewOnly={viewOnly}
        />
      )}

      {step === 'mapping' && (
        <Mapping
          sessionData={sessionData}
          profile={profile}
          onUpdate={(mappings) => setProfile((p) => (p ? { ...p, mappings } : null))}
          onProfileUpdate={(updates) => setProfile((p) => (p ? { ...p, ...updates } : null))}
          onNext={() => setStep('enum_mapping')}
          onSaveProfile={api.profiles.update}
          viewOnly={viewOnly}
        />
      )}

      {step === 'enum_mapping' && (
        <EnumMapping
          sessionData={sessionData}
          profile={profile}
          onUpdate={(enumMappings) => setProfile((p) => (p ? { ...p, enumMappings } : null))}
          onNext={() => setStep('joins')}
          onSkip={() => handleSkip('enum_mapping')}
          onSaveProfile={api.profiles.update}
          viewOnly={viewOnly}
        />
      )}

      {step === 'joins' && (
        <Joins
          sessionData={sessionData}
          profile={profile}
          onUpdate={(joins) => setProfile((p) => (p ? { ...p, joins } : null))}
          onNext={() => setStep('filtering')}
          onSkip={() => handleSkip('joins')}
          onSaveProfile={api.profiles.update}
          viewOnly={viewOnly}
        />
      )}

      {step === 'filtering' && (
        <Filtering
          sessionData={sessionData}
          profile={profile}
          onUpdate={(filters) => setProfile((p) => (p ? { ...p, filters } : null))}
          onNext={() => setStep('validation')}
          onSkip={() => handleSkip('filtering')}
          onSaveProfile={api.profiles.update}
          viewOnly={viewOnly}
        />
      )}

      {step === 'validation' && (
        <Validation
          profileId={profile.id}
          sessionData={sessionData}
          onSave={handleSave}
          onSummaryChange={(s) =>
            setLastValidFingerprint((s?.rowsSuccessful ?? 0) >= 1 ? computeFingerprint() : null)
          }
          saveDisabledByReRun={saveDisabledByReRun}
          viewOnly={viewOnly}
        />
      )}
    </div>
  )
}
