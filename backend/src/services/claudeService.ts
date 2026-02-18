import Anthropic from '@anthropic-ai/sdk'

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null

export async function claudeMappingSuggest(
  objectType: string,
  sourceHeaders: string[],
  targetFields: string[],
  lockedMappings?: Record<string, string>
): Promise<{ targetField: string; sourceColumn: string; confidence: number }[]> {
  if (!client) return []
  const locked = lockedMappings ? JSON.stringify(lockedMappings) : 'none'
  const prompt = `You are an ETL mapping assistant. Map source columns to target fields.
Object type: ${objectType}
Source columns: ${sourceHeaders.join(', ')}
Target fields (required): ${targetFields.join(', ')}
Locked mappings (do not change): ${locked}

Return a JSON array of { targetField, sourceColumn, confidence } where confidence is 0-1. Only suggest for unmapped target fields. Match by semantic similarity (e.g. "Quote Ref" -> quote_id, "Quoted Amount" -> quoted_price).`

  try {
    const msg = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text).join('')
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0]) as { targetField: string; sourceColumn: string; confidence: number }[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function claudeInterpretFilter(rule: string): Promise<{ field: string; op: string; value: unknown } | null> {
  if (!client) return null
  const prompt = `Parse this filter rule into structured form. Return ONLY valid JSON: { "field": "column_name", "op": "=" or "!=" or "contains", "value": "string or number" }
Rule: ${rule}
Examples: "exclude status = cancelled" -> {"field":"status","op":"=","value":"cancelled"}, "include status = completed" -> {"field":"status","op":"=","value":"completed"}
Type: inclusion starts with "include", exclusion with "exclude".`

  try {
    const msg = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text).join('')
    const match = text.match(/\{[^}]+\}/)
    if (!match) return null
    return JSON.parse(match[0]) as { field: string; op: string; value: unknown }
  } catch {
    return null
  }
}

export async function claudeInterpretJoin(rule: string): Promise<Record<string, unknown> | null> {
  if (!client) return null
  const prompt = `Parse this join description. Our schema: Quote->Load (on load_id), Load->Driver+Vehicle (on allocated_vehicle_id or driver_id).
Return JSON: { "name": "Quote→Load", "leftEntity": "quote", "rightEntity": "load", "leftKey": "load_id", "rightKey": "load_id" } or similar for Load->Driver+Vehicle.
Rule: ${rule}
Return ONLY the JSON object.`

  try {
    const msg = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text).join('')
    const match = text.match(/\{[^}]+\}/)
    if (!match) return null
    return JSON.parse(match[0]) as Record<string, unknown>
  } catch {
    return null
  }
}
