import { describe, it, expect } from 'vitest'
import {
  cleanDate,
  cleanDatetime,
  cleanNumber,
  cleanInteger,
  cleanLocation,
  cleanPersonName,
  cleanEmail,
  cleanPhone,
  cleanRegistration,
  cleanUuid,
  applyTransformations,
} from './transformationService.js'
import { UK_CITIES, UK_TOWNS } from '../constants/ukLocations.js'

describe('transformationService', () => {
  describe('cleanDate', () => {
    it('passes through ISO date', () => {
      expect(cleanDate('2025-01-15')).toBe('2025-01-15')
    })
    it('extracts date from ISO datetime', () => {
      expect(cleanDate('2025-01-15T14:30:00.000Z')).toBe('2025-01-15')
    })
    it('parses DD/MM/YYYY', () => {
      expect(cleanDate('15/01/2025')).toBe('2025-01-15')
    })
    it('parses MM-DD-YYYY (US)', () => {
      expect(cleanDate('01-15-2025')).toBe('2025-01-15')
    })
    it('parses DD-MM-YYYY', () => {
      expect(cleanDate('15-01-2025')).toBe('2025-01-15')
    })
    it('parses DD.MM.YYYY', () => {
      expect(cleanDate('15.01.2025')).toBe('2025-01-15')
    })
    it('fixes double slash', () => {
      expect(cleanDate('15//01/2025')).toBe('2025-01-15')
    })
    it('trims trailing space', () => {
      expect(cleanDate('15/01/2025 ')).toBe('2025-01-15')
    })
    it('returns null for null/empty', () => {
      expect(cleanDate(null)).toBe(null)
      expect(cleanDate('')).toBe(null)
    })
  })

  describe('cleanDatetime', () => {
    it('passes through ISO datetime', () => {
      const r = cleanDatetime('2025-01-15T14:30:00.000Z')
      expect(r).toMatch(/^2025-01-15T\d{2}:\d{2}:\d{2}/)
    })
    it('parses date-only to midnight UTC', () => {
      const r = cleanDatetime('15/01/2025')
      expect(r).toBe('2025-01-15T00:00:00.000Z')
    })
    it('returns null for null/empty', () => {
      expect(cleanDatetime(null)).toBe(null)
      expect(cleanDatetime('')).toBe(null)
    })
  })

  describe('cleanNumber', () => {
    it('keeps standard decimal', () => {
      expect(cleanNumber('1234.56')).toBe('1234.56')
    })
    it('converts European comma-decimal', () => {
      expect(cleanNumber('781,68')).toBe('781.68')
    })
    it('converts comma-thousands', () => {
      expect(cleanNumber('1,234.56')).toBe('1234.56')
    })
    it('strips currency suffix', () => {
      expect(cleanNumber('1234.56£')).toBe('1234.56')
      expect(cleanNumber('1234.56 GBP')).toBe('1234.56')
    })
    it('strips unit suffix km', () => {
      expect(cleanNumber('350km')).toBe('350')
      expect(cleanNumber('350 km')).toBe('350')
    })
    it('strips unit suffix kg', () => {
      expect(cleanNumber('3500 kg')).toBe('3500')
      expect(cleanNumber('3500kg')).toBe('3500')
    })
    it('trims trailing space', () => {
      expect(cleanNumber('1234.56 ')).toBe('1234.56')
    })
    it('handles number type', () => {
      expect(cleanNumber(1234.56)).toBe('1234.56')
      expect(cleanNumber(100)).toBe('100')
    })
    it('returns null for null/empty', () => {
      expect(cleanNumber(null)).toBe(null)
      expect(cleanNumber('')).toBe(null)
    })
    it('custom stripSuffixes for quoted_price', () => {
      expect(cleanNumber('1500.50£', ['£', 'GBP'])).toBe('1500.50')
    })
  })

  describe('cleanInteger', () => {
    it('parses string to int', () => {
      expect(cleanInteger('42')).toBe(42)
    })
    it('rounds float', () => {
      expect(cleanInteger(42.7)).toBe(43)
    })
    it('returns null for null/empty', () => {
      expect(cleanInteger(null)).toBe(null)
      expect(cleanInteger('')).toBe(null)
    })
  })

  describe('cleanLocation', () => {
    it('passes through clean city', () => {
      expect(cleanLocation('Birmingham', UK_CITIES)).toBe('Birmingham')
    })
    it('normalizes lowercase to canonical', () => {
      expect(cleanLocation('london', UK_CITIES)).toBe('London')
    })
    it('normalizes uppercase to canonical', () => {
      expect(cleanLocation('MANCHESTER', UK_CITIES)).toBe('Manchester')
    })
    it('fuzzy-matches typo Birmigham to Birmingham', () => {
      expect(cleanLocation('Birmigham', UK_CITIES)).toBe('Birmingham')
    })
    it('fuzzy-matches typo Glasow to Glasgow', () => {
      expect(cleanLocation('Glasow', UK_CITIES)).toBe('Glasgow')
    })
    it('fuzzy-matches typo Sheffeild to Sheffield', () => {
      expect(cleanLocation('Sheffeild', UK_CITIES)).toBe('Sheffield')
    })
    it('trims space-padded Leeds', () => {
      expect(cleanLocation('Leeds ', UK_CITIES)).toBe('Leeds')
    })
    it('keeps unknown value as-is', () => {
      expect(cleanLocation('Unknown Town XYZ', UK_CITIES)).toBe('Unknown Town XYZ')
    })
    it('returns null for null/empty', () => {
      expect(cleanLocation(null, UK_CITIES)).toBe(null)
      expect(cleanLocation('', UK_TOWNS)).toBe(null)
    })
    it('works with UK_TOWNS for towns', () => {
      expect(cleanLocation('Oxfrord', UK_TOWNS)).toBe('Oxford')
      expect(cleanLocation('Nothampton', UK_TOWNS)).toBe('Northampton')
    })
  })

  describe('cleanPersonName', () => {
    it('keeps correct name', () => {
      expect(cleanPersonName('James Smith')).toBe('James Smith')
    })
    it('title cases lowercase', () => {
      expect(cleanPersonName('james smith')).toBe('James Smith')
    })
    it('title cases uppercase', () => {
      expect(cleanPersonName('JOHN DAVIS')).toBe('John Davis')
    })
    it('preserves typo (no spell fix)', () => {
      expect(cleanPersonName('james Smyth')).toBe('James Smyth')
    })
    it('trims space-padded', () => {
      expect(cleanPersonName(' John Smith ')).toBe('John Smith')
    })
    it('returns null for null/empty', () => {
      expect(cleanPersonName(null)).toBe(null)
      expect(cleanPersonName('')).toBe(null)
    })
  })

  describe('cleanEmail', () => {
    it('lowercases and trims', () => {
      expect(cleanEmail('JOHN@Example.COM')).toBe('john@example.com')
    })
    it('returns null for null/empty', () => {
      expect(cleanEmail(null)).toBe(null)
    })
  })

  describe('cleanPhone', () => {
    it('passes through valid UK mobile', () => {
      expect(cleanPhone('07123456789')).toBe('07123456789')
    })
    it('keeps invalid as-is', () => {
      expect(cleanPhone('555-1234')).toBe('555-1234')
    })
    it('returns null for null/empty', () => {
      expect(cleanPhone(null)).toBe(null)
    })
  })

  describe('cleanRegistration', () => {
    it('uppercases and normalizes dash to space', () => {
      expect(cleanRegistration('ab12-cd 345')).toBe('AB12 CD 345')
    })
    it('returns null for null/empty', () => {
      expect(cleanRegistration(null)).toBe(null)
    })
  })

  describe('cleanUuid', () => {
    it('trims whitespace', () => {
      expect(cleanUuid('  abc-123  ')).toBe('abc-123')
    })
    it('returns null for null/empty', () => {
      expect(cleanUuid(null)).toBe(null)
    })
  })

  describe('applyTransformations', () => {
    it('applies number and date rules to quote rows', () => {
      const config = {
        quote: {
          quoted_price: { type: 'number' as const, stripSuffixes: ['£', 'GBP'] },
          date_created: { type: 'date' as const },
          fleet_quoter_name: { type: 'person_name' as const },
        },
      }
      const rows = [
        { quoted_price: '1234.56£', date_created: '15/01/2025', fleet_quoter_name: 'james smith' },
      ]
      const result = applyTransformations(rows, 'quote', config)
      expect(result[0].quoted_price).toBe('1234.56')
      expect(result[0].date_created).toBe('2025-01-15')
      expect(result[0].fleet_quoter_name).toBe('James Smith')
    })
    it('applies location rules to load rows', () => {
      const config = {
        load: {
          collection_city: { type: 'location_city' as const, referenceList: [...UK_CITIES] },
          collection_town: { type: 'location_town' as const, referenceList: [...UK_TOWNS] },
        },
      }
      const rows = [
        { collection_city: 'Birmigham', collection_town: 'Oxfrord' },
      ]
      const result = applyTransformations(rows, 'load', config)
      expect(result[0].collection_city).toBe('Birmingham')
      expect(result[0].collection_town).toBe('Oxford')
    })
    it('skips when config is undefined', () => {
      const rows = [{ quoted_price: '1234.56£' }]
      const result = applyTransformations(rows, 'quote', undefined)
      expect(result[0].quoted_price).toBe('1234.56£')
    })
    it('skips enum fields', () => {
      const config = {
        quote: {
          status: { type: 'skip' as const },
        },
      }
      const rows = [{ status: 'accepted' }]
      const result = applyTransformations(rows, 'quote', config)
      expect(result[0].status).toBe('accepted')
    })
  })
})
