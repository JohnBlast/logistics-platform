import './loadEnv.js'
import express from 'express'
import cors from 'cors'
import { profilesRouter } from './api/profiles.js'
import { ingestRouter } from './api/ingest.js'
import { mappingRouter } from './api/mapping.js'
import { pipelineRouter } from './api/pipeline.js'
import { filtersRouter } from './api/filters.js'
import { joinsRouter } from './api/joins.js'
import { schemaRouter } from './api/schema.js'
import { chatRouter } from './api/chat.js'
import { discoveryRouter } from './api/discovery.js'
import { jobmarketRouter } from './api/jobmarket.js'
import { isClaudeAvailable } from './services/claudeService.js'

const PORT = process.env.PORT || 3001

const app = express()
app.use(cors({ origin: true }))
app.use(express.json({ limit: '11mb' }))

app.use('/api/profiles', profilesRouter)
app.use('/api/ingest', ingestRouter)
app.use('/api/mapping', mappingRouter)
app.use('/api/pipeline', pipelineRouter)
app.use('/api/filters', filtersRouter)
app.use('/api/joins', joinsRouter)
app.use('/api/schema', schemaRouter)
app.use('/api/chat', chatRouter)
app.use('/api/discovery', discoveryRouter)
app.use('/api/job-market', jobmarketRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/health/ai', (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY
  const base = { claudeAvailable: isClaudeAvailable() }
  const debug = req.query.debug === '1'
  res.json(debug ? { ...base, keyPresent: !!key } : base)
})

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
