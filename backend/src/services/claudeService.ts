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
- quoted_price, distance_km (numbers)
- load_poster_name, name (driver name), registration_number
- vehicle_type, requested_vehicle_type
- created_at, updated_at, collection_date, delivery_date`

export async function claudeInterpretFilter(
  rule: string
): Promise<{ field: string; op: string; value: unknown; type?: 'inclusion' | 'exclusion' } | null> {
  const client = getClient()
  if (!client) return null
  const prompt = `You are an ETL filter interpreter. Convert natural language into a structured filter.

${FLAT_TABLE_FIELDS}

Rule: "${rule}"

Return ONLY a JSON object: { "field": "column_name", "op": "=" | "!=" | "contains", "value": "string or number", "type": "inclusion" | "exclusion" }
- field: must be one of the available columns above
- op: "=" for exact match, "!=" for not equal, "contains" for partial match (e.g. town/city name)
- value: the value to match (use exact schema values for status enums)
- type: "inclusion" = KEEP rows matching (include, only, keep); "exclusion" = REMOVE rows matching (exclude, drop, remove)

Examples:
"Remove all loads with a collection from Leeds" -> {"field":"collection_city","op":"contains","value":"Leeds","type":"exclusion"}
"exclude cancelled loads" -> {"field":"status","op":"=","value":"cancelled","type":"exclusion"}
"include only completed loads" -> {"field":"status","op":"=","value":"completed","type":"inclusion"}
"drop quotes from rejected status" -> {"field":"status","op":"=","value":"rejected","type":"exclusion"}
"keep only loads where delivery is in London" -> {"field":"delivery_city","op":"=","value":"London","type":"inclusion"}`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text).join('')
    const jsonStr = extractJsonObject(text)
    if (!jsonStr) return null
    const parsed = JSON.parse(jsonStr) as { field: string; op: string; value: unknown; type?: 'inclusion' | 'exclusion' }
    if (!parsed.field || !parsed.op) return null
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

Our schema: Quote -> Load (on load_id), Load -> Driver+Vehicle (on allocated_vehicle_id or driver_id).
Possible joins: Quote→Load, Load→Driver+Vehicle.

Rule: "${rule}"

Return ONLY a JSON object with: name, leftEntity, rightEntity, leftKey, rightKey. Add fallbackKey for Load->Driver+Vehicle.
Example for Quote-Load: {"name":"Quote→Load","leftEntity":"quote","rightEntity":"load","leftKey":"load_id","rightKey":"load_id"}
Example for Load-DriverVehicle: {"name":"Load→Driver+Vehicle","leftEntity":"load","rightEntity":"driver_vehicle","leftKey":"allocated_vehicle_id","rightKey":"vehicle_id","fallbackKey":"driver_id"}`

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
