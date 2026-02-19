import Anthropic from '@anthropic-ai/sdk'

function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start < 0) return null
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    if (text[i] === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function getClient(): Anthropic | null {
  return process.env.ANTHROPIC_API_KEY ? new Anthropic() : null
}

/** Whether Claude API is available (API key is set). */
export function isClaudeAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

export interface TargetFieldMetadata {
  name: string
  type: string
  description?: string
  validValues?: string[]
}

export interface SourceColumnSample {
  columnName: string
  sampleValues: string[]
}

/**
 * Phase 1: AI-assisted mapping — suggests (targetField, sourceColumn) pairs.
 * Uses column names, sample values, and data model metadata.
 * Does NOT return confidence (decoupled from scorer).
 */
export async function claudeMappingSuggest(
  objectType: string,
  sourceHeaders: string[],
  targetFieldsWithMeta: TargetFieldMetadata[],
  sourceRows: Record<string, unknown>[],
  lockedMappings?: Record<string, string>
): Promise<{ targetField: string; sourceColumn: string }[]> {
  const client = getClient()
  if (!client) return []
  const locked = lockedMappings ? JSON.stringify(lockedMappings) : 'none'

  const columnSamples: SourceColumnSample[] = sourceHeaders.map((h) => {
    const vals = sourceRows
      .map((r) => r[h])
      .filter((v) => v != null && v !== '')
      .slice(0, 8)
      .map((v) => String(v).slice(0, 80))
    return { columnName: h, sampleValues: [...new Set(vals)] }
  })

  const targetDesc = targetFieldsWithMeta
    .map((f) => {
      let s = `- ${f.name} (${f.type})${f.description ? `: ${f.description}` : ''}`
      if (f.validValues?.length) s += ` [valid: ${f.validValues.join(', ')}]`
      return s
    })
    .join('\n')

  const sampleDesc = columnSamples
    .map((c) => `  "${c.columnName}": ${c.sampleValues.length ? c.sampleValues.join(' | ') : '(empty)'}`)
    .join('\n')

  const prompt = `You are an ETL mapping assistant. Map source columns to target fields using column names AND sample values.
Your task: fit the user's uploaded/generated data to our data model.

Object type: ${objectType}

TARGET FIELDS (data model - required/optional):
${targetDesc}

SOURCE COLUMNS with sample values:
${sampleDesc}

Locked mappings (do not change): ${locked}

Return a JSON array of { targetField, sourceColumn } for unmapped target fields.
- Match by semantic similarity of names AND by whether sample values fit the target (type, format, enum).
- Example: "Quote Ref" with values like "Q-001" -> quote_id; "Quoted Amount" with "1500" -> quoted_price.
- For enums: check sample values align with valid options (e.g. status: draft, sent, accepted).
- Only include pairs where you have a reasonable mapping. Skip if no good match.`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text).join('')
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0]) as { targetField: string; sourceColumn: string }[]
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('[claude] mapping suggest failed:', err instanceof Error ? err.message : String(err))
    return []
  }
}

/**
 * Phase 2: AI confidence scorer (decoupled).
 * Scores how well a source column (name + values) fits a target field.
 * Uses data model requirements, format, and enum constraints.
 */
export async function claudeScoreMappingConfidence(
  sourceColumnName: string,
  sourceColumnValues: string[],
  targetFieldMeta: TargetFieldMetadata
): Promise<number> {
  const client = getClient()
  if (!client) return 0.5
  const samples = sourceColumnValues.slice(0, 10).map((v) => v.slice(0, 100))
  const targetDesc = `${targetFieldMeta.name} (${targetFieldMeta.type})${targetFieldMeta.description ? `: ${targetFieldMeta.description}` : ''}`
  const validStr = targetFieldMeta.validValues?.length
    ? ` Valid values: ${targetFieldMeta.validValues.join(', ')}.`
    : ''

  const prompt = `Score how well this source column fits the target field. Return ONLY a number 0-1 (e.g. 0.85).

Source column: "${sourceColumnName}"
Sample values: ${samples.join(', ') || '(none)'}

Target field: ${targetDesc}${validStr}

Consider: semantic match of names, data type fit (UUID vs string, number vs decimal, date format), enum alignment.
Return a single number 0-1.`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 64,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text).join('')
    const num = parseFloat(text.replace(/[^\d.]/g, ''))
    if (Number.isFinite(num) && num >= 0 && num <= 1) return Math.round(num * 100) / 100
    return 0.5
  } catch {
    return 0.5
  }
}

/**
 * Batch confidence scoring — scores multiple candidate mappings in one call.
 */
export async function claudeScoreMappingConfidenceBatch(
  candidates: { targetField: string; sourceColumn: string; sourceValues: string[] }[],
  targetFieldsMap: Record<string, TargetFieldMetadata>
): Promise<Record<string, number>> {
  const client = getClient()
  if (!client || candidates.length === 0) return {}
  const entries = candidates
    .map((c) => {
      const meta = targetFieldsMap[c.targetField]
      if (!meta) return null
      const samples = c.sourceValues.slice(0, 6).join(', ')
      const validStr = meta.validValues?.length ? ` Valid: ${meta.validValues.join(', ')}` : ''
      return `"${c.sourceColumn}" -> ${c.targetField} (${meta.type})${meta.description ? `: ${meta.description}` : ''}${validStr}\n  Samples: ${samples}`
    })
    .filter(Boolean) as string[]

  const prompt = `For each candidate mapping below, score 0-1 how well the source column fits the target field.
Consider: name semantics, data type, format, enum alignment.

Candidates:
${entries.map((e, i) => `${i + 1}. ${e}`).join('\n\n')}

Return a JSON object: { "index_1": 0.9, "index_2": 0.7, ... } with keys index_1, index_2, etc. and values 0-1.
Use the same index numbers.`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text).join('')
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return {}
    const parsed = JSON.parse(match[0]) as Record<string, number>
    const out: Record<string, number> = {}
    candidates.forEach((c, i) => {
      const key = `index_${i + 1}`
      const v = parsed[key]
      const score = typeof v === 'number' ? Math.min(1, Math.max(0, v)) : 0.5
      out[`${c.targetField}:${c.sourceColumn}`] = Math.round(score * 100) / 100
    })
    return out
  } catch {
    return {}
  }
}

const FLAT_TABLE_FIELDS = `Available columns in the joined flat table:
- status (load/quote status: draft, posted, in_transit, completed, cancelled, accepted, rejected, etc.)
- collection_town, collection_city, delivery_town, delivery_city (location strings)
- load_id, quote_id, vehicle_id, driver_id (IDs)
- quoted_price, distance_km, capacity_kg (numbers)
- load_poster_name, name (driver name), registration_number
- vehicle_type, requested_vehicle_type
- email, phone, number_of_items
- created_at, updated_at, collection_date, delivery_date`

export type InterpretedRule = { structured: { field?: string; op: string; value?: unknown; type?: 'inclusion' | 'exclusion' }; label: string }

export async function claudeInterpretFilterRules(rule: string): Promise<InterpretedRule[]> {
  const client = getClient()
  if (!client) return []
  const prompt = `You are an ETL filter interpreter. Convert natural language into structured filter(s).

${FLAT_TABLE_FIELDS}

Rule: "${rule}"

Return a JSON ARRAY of rules. For compound conditions (e.g. "with X and more than Y"), return MULTIPLE rules.
Each rule: { "field": "column_name", "op": "=" | "!=" | "contains" | "in" | "is_null" | "is_not_null" | "<" | "<=" | ">" | ">=", "value": number/string/array (omit for is_null/is_not_null), "type": "inclusion" | "exclusion", "label": "short description" }

COMPOUND RULES - split into multiple rules (field present + numeric):
- "loads with capacity_kg and with more than 1000kg" → [{"field":"capacity_kg","op":"is_not_null","type":"inclusion","label":"capacity_kg present"}, {"field":"capacity_kg","op":">","value":1000,"type":"inclusion","label":"capacity_kg > 1000"}]
- "I want to see only loads with capacity_kg and with more than 1000kg" → same as above
- "loads with capacity_kg and less than 500" → [{"field":"capacity_kg","op":"is_not_null","type":"inclusion","label":"capacity_kg present"}, {"field":"capacity_kg","op":"<","value":500,"type":"inclusion","label":"capacity_kg < 500"}]
- "with quoted_price and over 2000" / "loads with quoted_price and over £2000" → [{"field":"quoted_price","op":"is_not_null","type":"inclusion","label":"quoted_price present"}, {"field":"quoted_price","op":">","value":2000,"type":"inclusion","label":"quoted_price > 2000"}]
- "distance_km present and at least 50km" → [{"field":"distance_km","op":"is_not_null","type":"inclusion","label":"distance_km present"}, {"field":"distance_km","op":">=","value":50,"type":"inclusion","label":"distance_km >= 50"}]
- "between 100 and 500 on capacity_kg" → [{"field":"capacity_kg","op":">=","value":100,"type":"inclusion","label":"capacity_kg >= 100"}, {"field":"capacity_kg","op":"<=","value":500,"type":"inclusion","label":"capacity_kg <= 500"}]

LOCATION EXCLUSION - "remove X loads" = exclude rows with X in ANY location field (return 4 rules: collection_town, collection_city, delivery_town, delivery_city):
- "remove London loads" → [{"field":"collection_town","op":"contains","value":"London","type":"exclusion","label":"exclude collection_town London"}, {"field":"collection_city","op":"contains","value":"London","type":"exclusion","label":"exclude collection_city London"}, {"field":"delivery_town","op":"contains","value":"London","type":"exclusion","label":"exclude delivery_town London"}, {"field":"delivery_city","op":"contains","value":"London","type":"exclusion","label":"exclude delivery_city London"}]
- "exclude Manchester loads" → same pattern for Manchester. NEVER use has_any_null or != for "remove X loads".

SINGLE RULES - return one-element array:
- "exclude cancelled loads" → [{"field":"status","op":"=","value":"cancelled","type":"exclusion","label":"exclude cancelled"}]
- "loads with collection time" → [{"field":"collection_time","op":"is_not_null","type":"inclusion","label":"collection_time present"}]
- "I only want Luton and large_van" → [{"field":"requested_vehicle_type","op":"in","value":["luton","large_van"],"type":"inclusion","label":"vehicle type in luton, large_van"}]

CRITICAL: collection_time ≠ collection_date. "collection time" → collection_time.
CRITICAL: For "has X and more than N (kg)" → two rules: is_not_null + numerical comparison.
Return ONLY a JSON array, no other text.`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text).join('')
    const arrMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/)
    const jsonStr = arrMatch ? arrMatch[0] : extractJsonObject(text)
    if (!jsonStr) {
      const single = await claudeInterpretFilter(rule)
      if (single) return [{ structured: single, label: rule }]
      return []
    }
    const parsed = JSON.parse(jsonStr) as { field?: string; op: string; value?: unknown; type?: 'inclusion' | 'exclusion'; label?: string }[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const single = await claudeInterpretFilter(rule)
      if (single) return [{ structured: single, label: rule }]
      return []
    }
    return parsed
      .filter((p) => p?.op)
      .filter((p) => p.op === 'has_any_null' || p.op === 'has_no_nulls' || p.field)
      .map((p) => ({ structured: { field: p.field, op: p.op, value: p.value, type: p.type }, label: p.label || rule }))
  } catch (err) {
    console.error('[claude] filter interpret failed:', err instanceof Error ? err.message : String(err))
    return []
  }
}

export async function claudeInterpretFilter(
  rule: string
): Promise<{ field?: string; op: string; value?: unknown; type?: 'inclusion' | 'exclusion' } | null> {
  const client = getClient()
  if (!client) return null
  const prompt = `You are an ETL filter interpreter. Convert natural language into a structured filter.

${FLAT_TABLE_FIELDS}

Rule: "${rule}"

Return ONLY a JSON object: { "field": "column_name" (omit for has_any_null), "op": "=" | "!=" | "contains" | "in" | "is_null" | "is_not_null" | "has_any_null" | "<" | "<=" | ">" | ">=", "value": "string, number, or array for 'in'" (omit for is_null/is_not_null/has_any_null), "type": "inclusion" | "exclusion" }
- field: must be one of the available columns above; omit for has_any_null
- op: "=" exact match | "!=" not equal | "contains" partial match | "in" value in array (e.g. vehicle types) | "is_null" blank/null/empty | "is_not_null" non-blank | "has_any_null" ANY null cell | "<" less than | "<=" at most | ">" greater than | ">=" at least (for numbers)
- value: required for =, !=, contains, <, <=, >, >=; omit for is_null, is_not_null, has_any_null. For <, <=, >, >= use a NUMBER.
- type: "inclusion" = KEEP rows matching | "exclusion" = REMOVE rows matching

CRITICAL: "remove/exclude blank or null status" means EXCLUDE rows WHERE status IS null/empty → op "is_null", type "exclusion"
CRITICAL: "Remove any row with a null value" / "exclude rows with nulls" means EXCLUDE rows with ANY null/empty cell → op "has_any_null", type "exclusion" (omit field). ONLY use has_any_null when the rule explicitly mentions null/blank/empty values. NEVER use has_any_null for "remove loads that are X" (vehicle types, statuses, etc).
CRITICAL: "Remove all loads that are small vans" = EXCLUDE rows where requested_vehicle_type = small_van → {"field":"requested_vehicle_type","op":"=","value":"small_van","type":"exclusion"}. Use exact schema value: small_van not "small vans".
CRITICAL: "remove London loads" / "exclude London loads" = EXCLUDE rows where London appears in ANY location (collection_town, collection_city, delivery_town, delivery_city). Return 4 rules, one per field, each with op "contains", value "London", type "exclusion". NEVER use has_any_null - that would exclude almost everything.
CRITICAL: "exclude London collection_town" / "exclude collection_town London" = EXCLUDE rows where that field CONTAINS London → {"field":"collection_town","op":"contains","value":"London","type":"exclusion"}. NEVER use op "!=" - that would exclude non-London rows (wrong!).
CRITICAL: "remove loads that don't have capacity_kg" / "remove loads without capacity_kg" = EXCLUDE rows where capacity_kg IS null → {"field":"capacity_kg","op":"is_null","type":"exclusion"}. This is FIELD-SPECIFIC is_null for ONE column. NEVER use has_any_null for these - has_any_null means "ANY column is null" and would exclude almost everything.
CRITICAL: "include loads that have capacity_kg" = INCLUDE rows where capacity_kg IS NOT null → {"field":"capacity_kg","op":"is_not_null","type":"inclusion"}
CRITICAL: "only want loads with status" / "I only want loads with status" means INCLUDE rows WHERE status IS NOT null/empty → op "is_not_null", type "inclusion"
CRITICAL: "I only want to see rows with less than 500 on capacity_kg" = INCLUDE rows where capacity_kg < 500 → {"field":"capacity_kg","op":"<","value":500,"type":"inclusion"}
CRITICAL: "rows with greater than 1000 on quoted_price" = INCLUDE rows where quoted_price > 1000 → {"field":"quoted_price","op":">","value":1000,"type":"inclusion"}
CRITICAL: "exclude rows where capacity_kg is over 500" = EXCLUDE rows where capacity_kg > 500 → {"field":"capacity_kg","op":">","value":500,"type":"exclusion"}
CRITICAL: "loads with a collection time" = collection_time is NOT null. Use field "collection_time" NOT "collection_date". They are different fields!
CRITICAL: "I only want to see Luton and large_van vehicle types" = INCLUDE where requested_vehicle_type IN [luton, large_van] → {"field":"requested_vehicle_type","op":"in","value":["luton","large_van"],"type":"inclusion"}
CRITICAL: Multiple inclusion rules are AND'd: rows must match ALL inclusion rules.

Examples:
"Remove all loads that are small vans" -> {"field":"requested_vehicle_type","op":"=","value":"small_van","type":"exclusion"}
"Remove all loads with a collection from Leeds" -> {"field":"collection_city","op":"contains","value":"Leeds","type":"exclusion"}
"exclude London collection_town" -> {"field":"collection_town","op":"contains","value":"London","type":"exclusion"}
"exclude Leeds collection_city" -> {"field":"collection_city","op":"contains","value":"Leeds","type":"exclusion"}
"exclude cancelled loads" -> {"field":"status","op":"=","value":"cancelled","type":"exclusion"}
"include only completed loads" -> {"field":"status","op":"=","value":"completed","type":"inclusion"}
"remove all loads with a blank or null status" -> {"field":"status","op":"is_null","type":"exclusion"}
"exclude loads where status is null" -> {"field":"status","op":"is_null","type":"exclusion"}
"I only want loads with status" -> {"field":"status","op":"is_not_null","type":"inclusion"}
"keep only loads that have a status" -> {"field":"status","op":"is_not_null","type":"inclusion"}
"keep only loads where delivery is in London" -> {"field":"delivery_city","op":"=","value":"London","type":"inclusion"}
"Remove any row with a null value" -> {"op":"has_any_null","type":"exclusion"}
"exclude rows with nulls" -> {"op":"has_any_null","type":"exclusion"}
"remove loads that don't have capacity_kg" -> {"field":"capacity_kg","op":"is_null","type":"exclusion"}
"remove loads that doesn't have capacity_kg" -> {"field":"capacity_kg","op":"is_null","type":"exclusion"}
"remove loads without capacity_kg" -> {"field":"capacity_kg","op":"is_null","type":"exclusion"}
"include only loads that have capacity_kg" -> {"field":"capacity_kg","op":"is_not_null","type":"inclusion"}
"keep loads with email" -> {"field":"email","op":"is_not_null","type":"inclusion"}
"I only want to see rows with less than 500 on capacity_kg" -> {"field":"capacity_kg","op":"<","value":500,"type":"inclusion"}
"rows with capacity_kg under 500" -> {"field":"capacity_kg","op":"<","value":500,"type":"inclusion"}
"exclude rows where quoted_price is over 2000" -> {"field":"quoted_price","op":">","value":2000,"type":"exclusion"}
"I want to only see loads with a collection time" -> {"field":"collection_time","op":"is_not_null","type":"inclusion"}
"I only want to see Luton and large_van vehicle types" -> {"field":"requested_vehicle_type","op":"in","value":["luton","large_van"],"type":"inclusion"}`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text).join('')
    const jsonStr = extractJsonObject(text)
    if (!jsonStr) return null
    const parsed = JSON.parse(jsonStr) as { field?: string; op: string; value?: unknown; type?: 'inclusion' | 'exclusion' }
    if (!parsed.op) return null
    if (parsed.op !== 'has_any_null' && parsed.op !== 'has_no_nulls' && !parsed.field) return null
    return parsed
  } catch (err) {
    console.error('[claude] filter interpret failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

export async function claudeSuggestEnumMappings(
  sourceValues: string[],
  validValues: string[]
): Promise<Record<string, string>> {
  const client = getClient()
  if (!client) return {}
  const prompt = `Map messy source enum values to these target schema values.

Target valid values: ${validValues.join(', ')}

Source values to map (may have typos, wrong case, extra spaces): ${sourceValues.join(', ')}

Return a JSON object: { "sourceValue": "targetValue", ... } where targetValue must be one of the valid values.
Map each source value to the best matching target. Skip unmappable. Examples: "Draft"->"draft", "DRAFT"->"draft", "draf"->"draft", "In Transit"->"in_transit".`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text).join('')
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return {}
    const parsed = JSON.parse(match[0]) as Record<string, string>
    if (typeof parsed !== 'object') return {}
    const validSet = new Set(validValues)
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => v && validSet.has(v))
    )
  } catch {
    return {}
  }
}

export async function claudeInterpretJoin(rule: string): Promise<Record<string, unknown> | null> {
  const client = getClient()
  if (!client) return null
  const prompt = `Parse this join description into a JSON object.

Our schema:
- Quote has load_id → joins to Load.load_id
- Load has allocated_vehicle_id and driver_id → joins to Driver+Vehicle (vehicle_id, driver_id)
- "vehicle_id" / "Vehicle ID" / "allocated_vehicle_id" on Load side all mean allocated_vehicle_id

Rule: "${rule}"

Return ONLY a JSON object with: name, leftEntity, rightEntity, leftKey, rightKey. Add fallbackKey for Load->Driver+Vehicle.
Examples:
Quote-Load: {"name":"Quote→Load","leftEntity":"quote","rightEntity":"load","leftKey":"load_id","rightKey":"load_id"}
Load-DriverVehicle (primary vehicle, fallback driver): {"name":"Load→Driver+Vehicle","leftEntity":"load","rightEntity":"driver_vehicle","leftKey":"allocated_vehicle_id","rightKey":"vehicle_id","fallbackKey":"driver_id"}
Load-DriverVehicle (user said "vehicle_id" on load): use leftKey "allocated_vehicle_id" (Load schema field)
Load-DriverVehicle (user said "vehicle ID" or "Vehicle ID"): use leftKey "allocated_vehicle_id"`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text).join('')
    const jsonStr = extractJsonObject(text)
    if (!jsonStr) return null
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>
    if (!parsed.name || !parsed.leftEntity || !parsed.rightEntity || !parsed.leftKey || !parsed.rightKey) return null
    return parsed
  } catch {
    return null
  }
}
