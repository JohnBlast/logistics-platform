import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, type Profile } from '../services/api'
import { Ingestion } from '../components/Ingestion'
import { Mapping } from '../components/Mapping'
import { EnumMapping } from '../components/EnumMapping'
import { Joins } from '../components/Joins'
import { Filtering } from '../components/Filtering'
import { Validation } from '../components/Validation'

const STEPS = ['ingestion', 'mapping', 'enum_mapping', 'joins', 'filtering', 'validation'] as const
type Step = (typeof STEPS)[number]

const REQUIRED_QUOTE = ['quote_id', 'load_id', 'quoted_price', 'status', 'created_at', 'updated_at']
const REQUIRED_LOAD = ['load_id', 'status', 'load_poster_name', 'created_at', 'updated_at']
const REQUIRED_DV = ['vehicle_id', 'driver_id', 'vehicle_type', 'registration_number', 'name', 'fleet_id', 'created_at', 'updated_at']

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

  const mappingOk =
    allRequiredMapped(profile?.mappings?.quote, REQUIRED_QUOTE) &&
    allRequiredMapped(profile?.mappings?.load, REQUIRED_LOAD) &&
    allRequiredMapped(profile?.mappings?.driver_vehicle, REQUIRED_DV)

  const stepStatus: Record<Step, 'ok' | 'error' | 'active' | 'skipped'> = {
    ingestion: step === 'ingestion' ? 'active' : canProceedFromIngestion ? 'ok' : 'error',
    mapping: step === 'mapping' ? 'active' : mappingOk ? 'ok' : 'error',
    enum_mapping: step === 'enum_mapping' ? 'active' : skippedSteps.has('enum_mapping') ? 'skipped' : 'ok',
    joins: step === 'joins' ? 'active' : skippedSteps.has('joins') ? 'skipped' : 'ok',
    filtering: step === 'filtering' ? 'active' : skippedSteps.has('filtering') ? 'skipped' : 'ok',
    validation: step === 'validation' ? 'active' : 'ok',
  }

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
      .catch(setError)
      .finally(() => setLoading(false))
  }, [id])

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

  if (loading || !profile) return <div>Loading...</div>
  if (profile.status !== 'draft') {
    return (
      <div>
        <p>This profile is {profile.status}. Duplicate to edit.</p>
        <Link to="/etl">← Back to profiles</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link to="/etl" className="text-blue-600 hover:underline">
          ← Profiles
        </Link>
        <span className="text-slate-400">/</span>
        <span className="font-medium">{profile.name}</span>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {STEPS.map((s) => {
          const status = stepStatus[s]
          return (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`px-3 py-2 rounded text-sm capitalize flex items-center gap-1 ${
                step === s
                  ? 'bg-blue-600 text-white'
                  : status === 'error'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : status === 'skipped'
                      ? 'bg-slate-100 text-slate-500 border border-slate-200'
                      : 'bg-slate-200 hover:bg-slate-300'
              }`}
            >
              {s.replace('_', ' ')}
              {status === 'ok' && step !== s && <span>✓</span>}
              {status === 'error' && step !== s && <span>!</span>}
              {status === 'skipped' && step !== s && <span>—</span>}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>
      )}
      {successToast && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
          Profile saved and activated successfully.
        </div>
      )}

      {step === 'ingestion' && (
        <Ingestion
          sessionData={sessionData}
          onUpdate={setSessionData}
          onNext={() => setStep('mapping')}
          canProceed={!!canProceedFromIngestion}
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
        />
      )}

      {step === 'joins' && (
        <Joins
          sessionData={sessionData}
          profile={profile}
          onNext={() => setStep('filtering')}
          onSkip={() => handleSkip('joins')}
          onSaveProfile={api.profiles.update}
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
        />
      )}
    </div>
  )
}
