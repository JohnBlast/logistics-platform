/**
 * Transformation config for AI-powered data cleaning.
 * Stored in profile; applied after enum mapping, before deduplication.
 */

export type TransformRuleType =
  | 'date'
  | 'datetime'
  | 'number'
  | 'integer'
  | 'location_city'
  | 'location_town'
  | 'person_name'
  | 'email'
  | 'phone'
  | 'registration'
  | 'uuid'
  | 'skip'

export interface TransformRule {
  type: TransformRuleType
  /** e.g. ['£', 'GBP', 'km'] for quoted_price, distance_km */
  stripSuffixes?: string[]
  /** Reference list for location_city / location_town (UK_CITIES, UK_TOWNS) */
  referenceList?: string[]
}

/** entity -> field -> rule */
export type TransformConfig = Record<string, Record<string, TransformRule>>
