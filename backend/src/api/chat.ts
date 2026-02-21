import { Router, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import Anthropic from '@anthropic-ai/sdk'

const CHAT_RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000 // 30 minutes
const CHAT_RATE_LIMIT_MAX = 10

const TABLE_INSTRUCTION_SCHEMA = `
TableInstruction JSON schema:
{
  "dataSource": "loads" | "quotes" | "loads_and_quotes",
  "columns": [{ "id": "string", "header": "string", "format?": "month_name" | "percent" | "currency" }] (optional; can be [] for aggregation-only; display will auto-infer),
  "filters": [{ "field": "string", "operator": "eq" | "ne" | "contains" | "include" | "exclude" | "lt" | "lte" | "gt" | "gte" | "between", "value": any, "topBottomN?": number }],
  "orFilters": [[...filters]] (optional; each inner array ANDed, results ORed; for "between London and Birmingham"),
  "groupBy": ["string"],
  "groupByFormats": { "field": "day" | "week" | "month" | "year" },
  "aggregations": [{ "field": "string", "op": "count" | "count_match" | "sum" | "avg" | "mode" | "win_rate" | "ratio", "alias": "string", "matchValue?": "string", "fieldA?": "string", "fieldB?": "string" }],
  "sort": [{ "field": "string", "dir": "asc" | "desc" }],
  "limit": number,
  "pctChange": { "field": "string", "alias": "string" }
}

Load fields: load_id, load_status, load_poster_name, allocated_vehicle_id, driver_id, driver_name, collection_town, collection_city, collection_date, collection_time, delivery_town, delivery_city, delivery_date, delivery_time, distance_km, number_of_items, completion_date, created_at, updated_at, vehicle_type
Quote fields: quote_id, load_id, associated_fleet_id, fleet_quoter_name, load_poster_name, quote_status, quoted_price, date_created, requested_vehicle_type, collection_town, collection_city, collection_date, collection_time, delivery_town, delivery_city, delivery_date, delivery_time, distance_km, created_at, updated_at
loads_and_quotes (flat table): Load + Quote fields merged. Has both load_status and quote_status. The loads_and_quotes dataSource ALREADY filters for quote_status=accepted, so DO NOT filter on quote_status.
STATUS FIELDS: The flat table has "load_status" (draft, posted, in_transit, completed, cancelled) and "quote_status" (draft, sent, accepted, rejected, expired). Use "load_status" for load-related statuses like "cancelled loads" or "completed loads". "status" field also exists and equals load_status.
ROUTES: No "route" field. Use groupBy ["collection_town", "delivery_town"] or ["collection_city", "delivery_city"].
VEHICLE TYPES: Use exact enum values: small_van, medium_van, large_van, luton, rigid_7_5t, rigid_18t, rigid_26t, articulated. For "small van" use value "small_van".
`

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

export const chatRouter = Router()

const chatLimiter = rateLimit({
  windowMs: CHAT_RATE_LIMIT_WINDOW_MS,
  max: CHAT_RATE_LIMIT_MAX,
  message: { error: 'Rate limit exceeded. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

chatRouter.use(chatLimiter)

chatRouter.post('/', async (req: Request, res: Response) => {
  const { prompt, conversationHistory = [], previousTableInstruction, dataColumns } = req.body
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required and must be a string' })
  }
  let dataSchema = ''
  if (Array.isArray(dataColumns) && dataColumns.length > 0) {
    dataSchema = `\n\nCRITICAL - The user's actual data has these EXACT column names. You MUST use these exact names in filters, groupBy, aggregations, and sort:
${dataColumns.join(', ')}

Field mapping guide (use the column name that exists in the list above):
- Revenue/price/profitability → "quoted_price"
- Route origin (city level) → "collection_city"  
- Route origin (town level) → "collection_town"
- Route destination (city level) → "delivery_city"
- Route destination (town level) → "delivery_town"
- Driver → "driver_name" (or "name" if driver_name missing). Use operator "contains" for name searches.
- Load poster → "load_poster_name". Use operator "contains" for name searches.
- Vehicle type → "vehicle_type" (or "requested_vehicle_type")
- Date of collection → "collection_date"
- Load identifier → "load_id"
- Load status (cancelled, completed, etc.) → "load_status" (or "status" which equals load_status)
- Quote status → "quote_status" (NOTE: loads_and_quotes dataSource already filters for accepted quotes, do NOT add extra quote_status filters)`
  }

  const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null
  if (!client) {
    return res.status(503).json({
      error: 'Claude API not configured. Set ANTHROPIC_API_KEY.',
      code: 'CLAUDE_UNAVAILABLE',
      summary: 'AI is not available. Please configure the API key.',
      title: 'Error',
    })
  }

  const systemPrompt = `You are a logistics analytics assistant. The user queries their fleet's quotes and loads data using natural language.

Your task: Interpret the user's question and produce EITHER:
1. A text-only answer (when no table is needed, or when refusing)
2. A summary PLUS a TableInstruction JSON for the client to execute

${TABLE_INSTRUCTION_SCHEMA}
${dataSchema}

IMPORTANT NOTES:
- The "loads_and_quotes" dataSource ALREADY filters for accepted quotes only. Do NOT add filters for quote_status or status = accepted.
- There is NO "route" field. Routes = groupBy collection + delivery fields.
- Filters use "operator" (NOT "op"). Include/exclude use value arrays.
- DATA CLEANLINESS: ETL pre-cleans data. Location values are canonical UK city/town names (e.g. "Birmingham", "London"). Numbers are clean decimals (no £, km, kg suffixes). Dates are ISO format (YYYY-MM-DD). Use exact values in filters (e.g. value "Birmingham" not "Birmigham").

Rules:
- Use ONLY fields from the data column list above. Do not invent field names.
- For "routes", "profitable routes", "top routes": groupBy ["collection_city","delivery_city"], aggregations on "quoted_price".
- For revenue/profit/profitability: dataSource "loads_and_quotes", field "quoted_price".
- For "top N profitable routes": { "dataSource":"loads_and_quotes", "groupBy":["collection_city","delivery_city"], "aggregations":[{"field":"quoted_price","op":"sum","alias":"total_revenue"}], "sort":[{"field":"total_revenue","dir":"desc"}], "limit":5 }
- For "how many jobs between X and Y": dataSource "loads_and_quotes", use orFilters: [[{"field":"collection_city","operator":"eq","value":"X"},{"field":"delivery_city","operator":"eq","value":"Y"}],[{"field":"collection_city","operator":"eq","value":"Y"},{"field":"delivery_city","operator":"eq","value":"X"}]], aggregations:[{"op":"count","alias":"job_count"}].
- For "show all loads with small van": dataSource "loads_and_quotes", filters:[{"field":"vehicle_type","operator":"eq","value":"small_van"}].
- For "most active drivers": dataSource "loads_and_quotes", groupBy:["driver_name"], aggregations:[{"op":"count","alias":"job_count"}], sort:[{"field":"job_count","dir":"desc"}].
- For "jobs from city X": dataSource "loads_and_quotes", filters:[{"field":"collection_city","operator":"eq","value":"X"}].
- For "jobs starting from date Y" (YYYY-MM-DD): dataSource "loads_and_quotes", filters:[{"field":"collection_date","operator":"gte","value":"Y"}].
- For "jobs by driver Z" or "show me Z's loads": dataSource "loads_and_quotes", filters:[{"field":"driver_name","operator":"contains","value":"Z"}]. Use "contains" (not "eq") for person name filters so partial/approximate matches work. Also check load_poster_name if the person might be a poster.
- For "cancelled routes" / "completed routes": filter on load_status (NOT status or quote_status). Example: filters:[{"field":"load_status","operator":"eq","value":"cancelled"}].
- For "most frequent X" / "top X": Use groupBy + count aggregation + sort desc + limit 10 (default to 10 unless user specifies). Do NOT set limit:1 just because "most" is singular.
- When the user asks for multiple metrics (e.g. "revenue AND top poster"), include multiple aggregations: e.g. [{"op":"count","alias":"job_count"},{"op":"sum","field":"quoted_price","alias":"total_revenue"},{"op":"mode","field":"load_poster_name","alias":"top_poster"}].
- For follow-ups, modify previousTableInstruction.
- If the question is ambiguous or outside scope, respond with text only.

When producing a table, respond with:
1. A brief summary (1-2 sentences) answering the question
2. A short title for the conversation
3. A tableInstruction JSON object (if applicable)

Format your response as JSON:
{"summary": "Your answer here", "title": "Short title", "tableInstruction": { ... } }
Omit tableInstruction when the answer is text-only or when refusing.`

  const history = Array.isArray(conversationHistory)
    ? conversationHistory
        .filter(
          (m: { role?: string; content?: string }) =>
            m?.role && m?.content && (m.role === 'user' || m.role === 'assistant')
        )
        .map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    : []

  const userContent =
    previousTableInstruction && typeof previousTableInstruction === 'object'
      ? `${prompt}\n\n[Previous table instruction to modify if relevant: ${JSON.stringify(previousTableInstruction)}]`
      : prompt

  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    ...history,
    { role: 'user' as const, content: userContent },
  ]

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const text = msg.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { text: string }).text)
      .join('')

    const jsonStr = extractJsonObject(text)
    if (!jsonStr) {
      return res.json({
        summary: text || 'No response generated.',
        title: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
      })
    }

    const parsed = JSON.parse(jsonStr) as {
      summary?: string
      title?: string
      tableInstruction?: Record<string, unknown>
    }

    console.log('[chat] Claude raw text:', text)
    console.log('[chat] Parsed tableInstruction:', JSON.stringify(parsed.tableInstruction, null, 2))

    res.json({
      summary: parsed.summary ?? text,
      title: parsed.title ?? prompt.slice(0, 50),
      tableInstruction: parsed.tableInstruction,
    })
  } catch (err) {
    console.error('[chat] Claude error:', err)
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({
      error: 'Generation failed',
      code: 'GENERATION_FAILED',
      summary: `Generation failed: ${message}. Please try again.`,
      title: 'Error',
    })
  }
})
