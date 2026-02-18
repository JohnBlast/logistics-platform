import { Router } from 'express'
import multer from 'multer'
import { parseFile, ParseError } from '../parsers/fileParser.js'
import { generateQuotes, generateLoads, generateDriverVehicle } from '../generators/dirtyDataGenerator.js'

export const ingestRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

ingestRouter.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  try {
    const result = parseFile(req.file.buffer, req.file.originalname)
    res.json(result)
  } catch (e) {
    if (e instanceof ParseError) {
      return res.status(400).json({ error: e.message })
    }
    throw e
  }
})

ingestRouter.post('/generate', (req, res) => {
  const { objectType, loadIds, loadRows } = req.body
  if (!objectType || !['quote', 'load', 'driver_vehicle'].includes(objectType)) {
    return res.status(400).json({ error: 'objectType must be quote, load, or driver_vehicle' })
  }

  if (objectType === 'load') {
    const { rows, loadIds: ids } = generateLoads()
    return res.json({ headers: Object.keys(rows[0]), rows, loadIds: ids })
  }

  if (objectType === 'quote') {
    const ids = loadIds && loadIds.length ? loadIds : generateLoads().loadIds
    const quotes = generateQuotes(ids)
    return res.json({ headers: Object.keys(quotes[0]), rows: quotes })
  }

  if (objectType === 'driver_vehicle') {
    const lr = loadRows && loadRows.length ? loadRows : generateLoads().rows
    const { driverVehicleRows, updatedLoadRows } = generateDriverVehicle(lr)
    return res.json({
      headers: Object.keys(driverVehicleRows[0]),
      rows: driverVehicleRows,
      updatedLoadRows,
    })
  }

  res.status(400).json({ error: 'Invalid objectType' })
})
