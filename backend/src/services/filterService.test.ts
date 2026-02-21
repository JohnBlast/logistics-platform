/**
 * Tests for filter interpretation and application, including orGroup for "London loads".
 */

import { describe, it, expect } from 'vitest'
import {
  interpretFilterRules,
  applyFilters,
  applyFiltersWithRuleEffects,
  type StructuredFilter,
} from './filterService.js'
import type { FilterRule } from './profileStore.js'

describe('filterService', () => {
  const rowsWithLondon = [
    { collection_town: 'Southwark', collection_city: 'London', delivery_town: 'Birmingham', delivery_city: 'Birmingham' },
    { collection_town: 'Leeds', collection_city: 'Leeds', delivery_town: 'Westminster', delivery_city: 'London' },
    { collection_town: 'Manchester', collection_city: 'Manchester', delivery_town: 'Salford', delivery_city: 'Manchester' },
  ]

  describe('tryIncludePlaceLoads', () => {
    it('interprets "I only want London loads" as 4 inclusion rules with orGroup', () => {
      const rules = interpretFilterRules('I only want London loads')
      expect(rules.length).toBe(4)
      expect(rules.every((r) => r.structured?.type === 'inclusion')).toBe(true)
      expect(rules.every((r) => (r.structured as StructuredFilter)?.orGroup === 1)).toBe(true)
      const fields = rules.map((r) => (r.structured as { field?: string })?.field)
      expect(fields).toContain('collection_town')
      expect(fields).toContain('collection_city')
      expect(fields).toContain('delivery_town')
      expect(fields).toContain('delivery_city')
    })

    it('interprets "include London loads" as 4 inclusion rules with orGroup', () => {
      const rules = interpretFilterRules('include London loads')
      expect(rules.length).toBe(4)
      expect(rules.every((r) => (r.structured as StructuredFilter)?.orGroup === 1)).toBe(true)
    })
  })

  describe('applyFilters with orGroup', () => {
    it('ORs inclusion rules with orGroup (London in ANY location)', () => {
      const filters: FilterRule[] = [
        { type: 'inclusion', rule: 'collection_town contains London', structured: { field: 'collection_town', op: 'contains' as const, value: 'London', type: 'inclusion' as const, orGroup: 1 } },
        { type: 'inclusion', rule: 'collection_city contains London', structured: { field: 'collection_city', op: 'contains' as const, value: 'London', type: 'inclusion' as const, orGroup: 1 } },
        { type: 'inclusion', rule: 'delivery_town contains London', structured: { field: 'delivery_town', op: 'contains' as const, value: 'London', type: 'inclusion' as const, orGroup: 1 } },
        { type: 'inclusion', rule: 'delivery_city contains London', structured: { field: 'delivery_city', op: 'contains' as const, value: 'London', type: 'inclusion' as const, orGroup: 1 } },
      ]
      const result = applyFilters(rowsWithLondon, filters)
      expect(result.length).toBe(2)
      expect(result.some((r) => (r as { collection_city?: string }).collection_city === 'London')).toBe(true)
      expect(result.some((r) => (r as { delivery_city?: string }).delivery_city === 'London')).toBe(true)
      expect(result.every((r) => {
        const x = r as { collection_town?: string; collection_city?: string; delivery_town?: string; delivery_city?: string }
        return x.collection_city?.includes('London') || x.collection_town?.includes('London') ||
          x.delivery_city?.includes('London') || x.delivery_town?.includes('London')
      })).toBe(true)
    })

    it('excludes Manchester when no London (50→0 was the bug)', () => {
      const onlyManchester = [
        { collection_town: 'Manchester', collection_city: 'Manchester', delivery_town: 'Salford', delivery_city: 'Manchester' },
      ]
      const filters: FilterRule[] = [
        { type: 'inclusion', rule: 'collection_town contains London', structured: { field: 'collection_town', op: 'contains' as const, value: 'London', type: 'inclusion' as const, orGroup: 1 } },
        { type: 'inclusion', rule: 'collection_city contains London', structured: { field: 'collection_city', op: 'contains' as const, value: 'London', type: 'inclusion' as const, orGroup: 1 } },
        { type: 'inclusion', rule: 'delivery_town contains London', structured: { field: 'delivery_town', op: 'contains' as const, value: 'London', type: 'inclusion' as const, orGroup: 1 } },
        { type: 'inclusion', rule: 'delivery_city contains London', structured: { field: 'delivery_city', op: 'contains' as const, value: 'London', type: 'inclusion' as const, orGroup: 1 } },
      ]
      const result = applyFilters(onlyManchester, filters)
      expect(result.length).toBe(0)
    })
  })

  describe('applyFiltersWithRuleEffects', () => {
    it('returns correct ruleEffects for orGroup inclusion', () => {
      const filters: FilterRule[] = [
        { type: 'inclusion', rule: 'collection_town contains London', structured: { field: 'collection_town', op: 'contains' as const, value: 'London', type: 'inclusion' as const, orGroup: 1 } },
        { type: 'inclusion', rule: 'collection_city contains London', structured: { field: 'collection_city', op: 'contains' as const, value: 'London', type: 'inclusion' as const, orGroup: 1 } },
        { type: 'inclusion', rule: 'delivery_town contains London', structured: { field: 'delivery_town', op: 'contains' as const, value: 'London', type: 'inclusion' as const, orGroup: 1 } },
        { type: 'inclusion', rule: 'delivery_city contains London', structured: { field: 'delivery_city', op: 'contains' as const, value: 'London', type: 'inclusion' as const, orGroup: 1 } },
      ]
      const { result, ruleEffects } = applyFiltersWithRuleEffects(rowsWithLondon, filters)
      expect(result.length).toBe(2)
      expect(ruleEffects.length).toBe(4)
      const firstEffect = ruleEffects[0]
      expect(firstEffect.before).toBe(3)
      expect(firstEffect.after).toBe(2)
    })
  })
})
