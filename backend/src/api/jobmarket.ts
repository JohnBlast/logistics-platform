import { Router } from 'express'
import { UK_HUBS } from '../lib/ukHubs.js'
import { generateJobs } from '../services/jobGeneratorService.js'
import {
  getLoadsByStatus,
  getLoad,
  getQuoteCountForLoad,
  getQuote,
  getQuotesByLoad,
  getQuotesByFleet,
  getQuoteScoreBreakdown,
  getQuoteFeedback,
  deleteQuote,
  addVehicle,
  addDriver,
  getFleetProfile,
  updateFleetProfile,
  getVehicles,
  getDrivers,
  validateCityInHubs,
  getDefaultFleetId,
} from '../services/jobmarketStore.js'
import { generateFleet } from '../services/fleetGeneratorService.js'
import { recommendPrice } from '../services/recommenderService.js'
import { submitQuote } from '../services/quoteSubmissionService.js'
import { generateCompetingQuotes } from '../services/competingQuoteService.js'

export const jobmarketRouter = Router()

/** GET /api/job-market/hubs — returns UK hubs for frontend dropdowns and map */
jobmarketRouter.get('/hubs', (_req, res) => {
  const hubs = Object.entries(UK_HUBS).map(([city, coord]) => ({
    city,
    lat: coord.lat,
    lng: coord.lng,
  }))
  res.json({ hubs })
})

/** POST /api/job-market/jobs/generate — generate N jobs (count 1-20, C-12) */
jobmarketRouter.post('/jobs/generate', (req, res) => {
  const count = typeof req.body?.count === 'number' ? req.body.count : 5
  const jobs = generateJobs(count)
  const competingQuoteCount = generateCompetingQuotes(jobs)
  res.json({
    jobs: jobs.map((j) => ({
      ...j,
      quote_count: getQuoteCountForLoad(j.load_id),
    })),
    competing_quotes_generated: competingQuoteCount,
  })
})

/** GET /api/job-market/jobs — job board, optional ?status=posted */
jobmarketRouter.get('/jobs', (req, res) => {
  const status = (req.query.status as string) || 'posted'
  const loads = getLoadsByStatus(status)
  const jobs = loads.map((load) => ({
    ...load,
    quote_count: getQuoteCountForLoad(load.load_id),
  }))
  res.json({ jobs })
})

/** GET /api/job-market/jobs/:id — single job details */
jobmarketRouter.get('/jobs/:id', (req, res) => {
  const load = getLoad(req.params.id)
  if (!load) {
    return res.status(404).json({ error: 'Job not found' })
  }
  res.json({
    ...load,
    quote_count: getQuoteCountForLoad(load.load_id),
  })
})

// ─── Quotes ─────────────────────────────────────────────────────────────────

/** GET /api/job-market/quotes/recommend — must be before /quotes/:id */
jobmarketRouter.get('/quotes/recommend', (req, res) => {
  const loadId = req.query.load_id as string
  const vehicleType = req.query.vehicle_type as string | undefined
  if (!loadId) {
    return res.status(400).json({ error: 'load_id is required' })
  }
  const rec = recommendPrice(loadId, vehicleType as any)
  if (!rec) {
    return res.status(404).json({ error: 'Load not found' })
  }
  res.json({
    recommended_price: { min: rec.min, mid: rec.mid, max: rec.max },
    signals: rec.signals,
  })
})

/** POST /api/job-market/quotes */
jobmarketRouter.post('/quotes', (req, res) => {
  const { load_id, quoted_price, vehicle_id, driver_id } = req.body ?? {}
  if (!load_id || quoted_price == null || !vehicle_id || !driver_id) {
    return res.status(400).json({ error: 'load_id, quoted_price, vehicle_id, and driver_id are required' })
  }

  const result = submitQuote({
    load_id,
    quoted_price: Number(quoted_price),
    vehicle_id,
    driver_id,
  })

  if ('code' in result) {
    if (result.code === 'ADR_REQUIRED') {
      return res.status(422).json({ error: result.code, message: result.message })
    }
    if (result.code === 'DUPLICATE_QUOTE') {
      return res.status(409).json({ error: result.code, message: result.message })
    }
    return res.status(400).json({ error: result.code, message: result.message })
  }

  res.status(201).json(result)
})

/** GET /api/job-market/quotes — fleet's quote history */
jobmarketRouter.get('/quotes', (_req, res) => {
  const quotes = getQuotesByFleet(getDefaultFleetId()).map((q) => ({
    ...q,
    score_breakdown: getQuoteScoreBreakdown(q.quote_id),
    feedback: getQuoteFeedback(q.quote_id),
  }))
  res.json({ quotes })
})

/** GET /api/job-market/jobs/:id/quotes — all quotes for a load (reveals competition) */
jobmarketRouter.get('/jobs/:id/quotes', (req, res) => {
  const load = getLoad(req.params.id)
  if (!load) {
    return res.status(404).json({ error: 'Job not found' })
  }
  const loadQuotes = getQuotesByLoad(req.params.id).map((q) => ({
    quote_id: q.quote_id,
    fleet_quoter_name: q.fleet_quoter_name,
    quoted_price: q.quoted_price,
    offered_vehicle_type: q.offered_vehicle_type,
    eta_to_collection: q.eta_to_collection,
    status: q.status,
    adr_certified: q.adr_certified,
    score_breakdown: getQuoteScoreBreakdown(q.quote_id),
  }))
  // Sort by price ascending so cheapest is first
  loadQuotes.sort((a, b) => a.quoted_price - b.quoted_price)
  res.json({ quotes: loadQuotes, max_budget: load.max_budget })
})

/** DELETE /api/job-market/quotes/:id — remove a quote (own fleet only) */
jobmarketRouter.delete('/quotes/:id', (req, res) => {
  const quote = getQuote(req.params.id)
  if (!quote) {
    return res.status(404).json({ error: 'Quote not found' })
  }
  if (quote.associated_fleet_id !== getDefaultFleetId()) {
    return res.status(403).json({ error: 'Cannot delete another fleet\'s quote' })
  }
  deleteQuote(req.params.id)
  res.status(204).send()
})

/** GET /api/job-market/quotes/:id */
jobmarketRouter.get('/quotes/:id', (req, res) => {
  const quote = getQuote(req.params.id)
  if (!quote) {
    return res.status(404).json({ error: 'Quote not found' })
  }
  res.json({
    ...quote,
    score_breakdown: getQuoteScoreBreakdown(quote.quote_id),
    feedback: getQuoteFeedback(quote.quote_id),
  })
})

// ─── Fleet Management ──────────────────────────────────────────────────────

/** POST /api/job-market/fleet/vehicles */
jobmarketRouter.post('/fleet/vehicles', (req, res) => {
  const { vehicle_type, registration_number, capacity_kg, driver_id, current_city } = req.body ?? {}
  if (!vehicle_type || !registration_number || !current_city) {
    return res.status(400).json({ error: 'vehicle_type, registration_number, and current_city are required' })
  }
  if (!validateCityInHubs(current_city)) {
    return res.status(400).json({ error: `Invalid city: ${current_city}. Must be a valid UK hub.` })
  }
  const vehicle = addVehicle({
    vehicle_type,
    registration_number: String(registration_number),
    capacity_kg: capacity_kg != null ? Number(capacity_kg) : undefined,
    driver_id: driver_id || undefined,
    current_city: String(current_city),
  })
  res.status(201).json(vehicle)
})

/** POST /api/job-market/fleet/drivers */
jobmarketRouter.post('/fleet/drivers', (req, res) => {
  const { name, has_adr_certification } = req.body ?? {}
  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }
  const driver = addDriver({
    name: String(name),
    fleet_id: getDefaultFleetId(),
    has_adr_certification: Boolean(has_adr_certification),
  })
  res.status(201).json(driver)
})

/** POST /api/job-market/fleet/generate */
jobmarketRouter.post('/fleet/generate', (req, res) => {
  const vehicleCount = Math.max(0, Math.min(50, Math.floor(Number(req.body?.vehicle_count) || 0)))
  const driverCount = Math.max(0, Math.min(50, Math.floor(Number(req.body?.driver_count) || 0)))
  const { drivers, vehicles } = generateFleet(vehicleCount, driverCount)
  const profile = getFleetProfile()
  res.json({
    drivers,
    vehicles,
    profile: {
      ...profile,
      vehicles: getVehicles(),
      drivers: getDrivers(),
    },
  })
})

/** GET /api/job-market/fleet/profile */
jobmarketRouter.get('/fleet/profile', (_req, res) => {
  const profile = getFleetProfile()
  res.json({
    ...profile,
    vehicles: getVehicles(),
    drivers: getDrivers(),
  })
})

/** PATCH /api/job-market/fleet/profile — company_name, rating (C-20) */
jobmarketRouter.patch('/fleet/profile', (req, res) => {
  const { company_name, rating } = req.body ?? {}
  const updates: { company_name?: string; rating?: number } = {}
  if (company_name !== undefined) updates.company_name = String(company_name)
  if (rating !== undefined) updates.rating = Number(rating)
  if (Object.keys(updates).length > 0) {
    updateFleetProfile(updates)
  }
  const profile = getFleetProfile()
  res.json({
    ...profile,
    vehicles: getVehicles(),
    drivers: getDrivers(),
  })
})
