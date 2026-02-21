import { describe, it, expect } from 'vitest'
import { buildMockedTransformConfig } from './transformConfigService.js'
import { UK_CITIES, UK_TOWNS } from '../constants/ukLocations.js'

describe('transformConfigService', () => {
  describe('buildMockedTransformConfig', () => {
    it('produces config for quote entity', () => {
      const config = buildMockedTransformConfig()
      expect(config.quote).toBeDefined()
      expect(config.quote!.quoted_price).toEqual({ type: 'number', stripSuffixes: ['£', 'GBP'] })
      expect(config.quote!.date_created).toEqual({ type: 'date' })
      expect(config.quote!.created_at).toEqual({ type: 'datetime' })
      expect(config.quote!.status).toEqual({ type: 'skip' })
      expect(config.quote!.requested_vehicle_type).toEqual({ type: 'skip' })
      expect(config.quote!.quote_id).toEqual({ type: 'uuid' })
      expect(config.quote!.fleet_quoter_name).toEqual({ type: 'person_name' })
      expect(config.quote!.distance_km).toEqual({ type: 'number', stripSuffixes: ['km', 'KM'] })
    })

    it('produces config for load entity', () => {
      const config = buildMockedTransformConfig()
      expect(config.load).toBeDefined()
      expect(config.load!.collection_city).toEqual({
        type: 'location_city',
        referenceList: expect.arrayContaining([...UK_CITIES]),
      })
      expect(config.load!.collection_town).toEqual({
        type: 'location_town',
        referenceList: expect.arrayContaining([...UK_TOWNS]),
      })
      expect(config.load!.delivery_city).toEqual({
        type: 'location_city',
        referenceList: expect.arrayContaining([...UK_CITIES]),
      })
      expect(config.load!.load_poster_name).toEqual({ type: 'person_name' })
      expect(config.load!.number_of_items).toEqual({ type: 'integer' })
      expect(config.load!.status).toEqual({ type: 'skip' })
    })

    it('produces config for driver_vehicle entity', () => {
      const config = buildMockedTransformConfig()
      expect(config.driver_vehicle).toBeDefined()
      expect(config.driver_vehicle!.vehicle_type).toEqual({ type: 'skip' })
      expect(config.driver_vehicle!.capacity_kg).toEqual({ type: 'number', stripSuffixes: ['kg', 'KG'] })
      expect(config.driver_vehicle!.registration_number).toEqual({ type: 'registration' })
      expect(config.driver_vehicle!.name).toEqual({ type: 'person_name' })
      expect(config.driver_vehicle!.email).toEqual({ type: 'email' })
      expect(config.driver_vehicle!.phone).toEqual({ type: 'phone' })
    })

    it('has all quote fields', () => {
      const config = buildMockedTransformConfig()
      const quoteFields = [
        'quote_id',
        'load_id',
        'quoted_price',
        'status',
        'date_created',
        'distance_km',
        'associated_fleet_id',
        'fleet_quoter_name',
        'requested_vehicle_type',
        'created_at',
        'updated_at',
      ]
      for (const f of quoteFields) {
        expect(config.quote![f]).toBeDefined()
      }
    })

    it('has all load fields', () => {
      const config = buildMockedTransformConfig()
      const loadFields = [
        'load_id',
        'collection_town',
        'collection_city',
        'delivery_town',
        'delivery_city',
        'status',
        'load_poster_name',
        'number_of_items',
      ]
      for (const f of loadFields) {
        expect(config.load![f]).toBeDefined()
      }
    })
  })
})
