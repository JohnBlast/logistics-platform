import express from 'express'
import cors from 'cors'
import { profilesRouter } from './api/profiles.js'
import { ingestRouter } from './api/ingest.js'
import { mappingRouter } from './api/mapping.js'
import { pipelineRouter } from './api/pipeline.js'
import { filtersRouter } from './api/filters.js'
import { joinsRouter } from './api/joins.js'
import { schemaRouter } from './api/schema.js'

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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
