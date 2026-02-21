/**
 * Integration test: dirty data flows through mapping → enum → transform → dedup → join.
 * Asserts that flatRows contain clean values (ISO dates, canonical locations, numeric values).
 */

import { describe, it, expect } from 'vitest'
import { generateQuotes, generateLoads, generateDriverVehicle } from '../generators/dirtyDataGenerator.js'
import { runValidation } from './validationService.js'
import { createProfile, updateProfile } from './profileStore.js'
import { UK_CITIES, UK_TOWNS } from '../constants/ukLocations.js'

const QUOTE_MAPPINGS = {
  quote_id: 'Quote Ref',
  load_id: 'Load Reference',
  quoted_price: 'Quoted Amount',
  status: 'Status',
  date_created: 'Date Created',
  distance_km: 'Distance (km)',
  associated_fleet_id: 'Fleet ID',
  fleet_quoter_name: 'Quoter Name',
  requested_vehicle_type: 'Vehicle Type',
  created_at: 'created_at',
  updated_at: 'updated_at',
}

const LOAD_MAPPINGS = {
  load_id: 'Load Number',
  collection_town: 'Collection Town',
  collection_city: 'Collection City',
  collection_time: 'Collection Time',
  collection_date: 'Collection Date',
  delivery_town: 'Delivery Town',
  delivery_city: 'Delivery City',
  delivery_time: 'Delivery Time',
  delivery_date: 'Delivery Date',
  distance_km: 'Distance km',
  status: 'Status',
  load_poster_name: 'Poster Name',
  allocated_vehicle_id: 'Vehicle ID',
  driver_id: 'Driver ID',
  number_of_items: 'Number of Items',
  created_at: 'created_at',
  updated_at: 'updated_at',
}

const DRIVER_VEHICLE_MAPPINGS = {
  vehicle_id: 'Vehicle ID',
  vehicle_type: 'Type',
  registration_number: 'Registration',
  capacity_kg: 'Capacity kg',
  driver_id: 'Driver ID',
  name: 'Driver Name',
  fleet_id: 'Fleet ID',
  email: 'Email',
  phone: 'Phone',
  created_at: 'created_at',
  updated_at: 'updated_at',
}

const DEFAULT_JOINS = [
  { name: 'Quote→Load', leftEntity: 'quote', rightEntity: 'load', leftKey: 'load_id', rightKey: 'load_id' },
  {
    name: 'Load→Driver+Vehicle',
    leftEntity: 'load',
    rightEntity: 'driver_vehicle',
    leftKey: 'allocated_vehicle_id',
    rightKey: 'vehicle_id',
    fallbackKey: 'driver_id',
  },
]

describe('transformation pipeline integration', () => {
  it('produces clean flatRows from dirty generated data', () => {
    const { rows: loadRows, loadIds } = generateLoads()
    const quoteRows = generateQuotes(loadIds.slice(0, 5))
    const { driverVehicleRows, updatedLoadRows } = generateDriverVehicle(loadRows.slice(0, 5), true)

    const profile = createProfile({
      name: 'Transform Pipeline Test',
      dataModelVersion: 'V1',
      aiMode: 'mocked',
    })
    updateProfile(profile.id, {
      mappings: {
        quote: QUOTE_MAPPINGS,
        load: LOAD_MAPPINGS,
        driver_vehicle: DRIVER_VEHICLE_MAPPINGS,
      },
      joins: DEFAULT_JOINS,
    })

    const sessionData = {
      quote: {
        headers: Object.values(QUOTE_MAPPINGS),
        rows: quoteRows,
      },
      load: {
        headers: Object.values(LOAD_MAPPINGS),
        rows: updatedLoadRows,
      },
      driver_vehicle: {
        headers: Object.values(DRIVER_VEHICLE_MAPPINGS),
        rows: driverVehicleRows,
      },
    }

    const summary = runValidation(profile.id, sessionData, { joinOnly: true })
    const flat = summary.flatRows

    expect(flat.length).toBeGreaterThan(0)

    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/
    const isoDatetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    const ukCitiesSet = new Set(UK_CITIES)
    const ukTownsSet = new Set(UK_TOWNS)

    for (const row of flat) {
      const r = row as Record<string, unknown>

      if (r.quoted_price != null && r.quoted_price !== '') {
        const s = String(r.quoted_price)
        expect(s).not.toMatch(/£|GBP|km/i)
        expect(Number(s)).not.toBeNaN()
      }

      if (r.date_created != null && r.date_created !== '') {
        expect(String(r.date_created)).toMatch(isoDatePattern)
      }

      if (r.created_at != null && r.created_at !== '') {
        expect(String(r.created_at)).toMatch(isoDatetimePattern)
      }
      if (r.updated_at != null && r.updated_at !== '') {
        expect(String(r.updated_at)).toMatch(isoDatetimePattern)
      }

      if (r.collection_city != null && r.collection_city !== '') {
        expect(ukCitiesSet.has(String(r.collection_city))).toBe(true)
      }
      if (r.delivery_city != null && r.delivery_city !== '') {
        expect(ukCitiesSet.has(String(r.delivery_city))).toBe(true)
      }
      if (r.collection_town != null && r.collection_town !== '') {
        expect(ukTownsSet.has(String(r.collection_town))).toBe(true)
      }
      if (r.delivery_town != null && r.delivery_town !== '') {
        expect(ukTownsSet.has(String(r.delivery_town))).toBe(true)
      }

      if (r.capacity_kg != null && r.capacity_kg !== '') {
        const s = String(r.capacity_kg)
        expect(s).not.toMatch(/kg/i)
        expect(Number(s)).not.toBeNaN()
      }

      if (r.fleet_quoter_name != null && r.fleet_quoter_name !== '') {
        const s = String(r.fleet_quoter_name)
        expect(s[0]).toBe(s[0].toUpperCase())
      }

      for (const [, v] of Object.entries(r)) {
        if (typeof v === 'string' && (v.startsWith(' ') || v.endsWith(' '))) {
          expect(v).not.toMatch(/^\s|\s$/)
        }
      }
    }
  })
})
