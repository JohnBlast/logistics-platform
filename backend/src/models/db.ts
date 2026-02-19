import Database from 'better-sqlite3'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const dbPath = process.env.DATABASE_PATH || join(__dirname, '../../data/etl.db')

// Ensure data dir exists
const dataDir = dirname(dbPath)
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

export const db: import('better-sqlite3').Database = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK(status IN ('active', 'draft', 'archive')),
    dataModelVersion TEXT NOT NULL DEFAULT 'V1',
    aiMode TEXT NOT NULL DEFAULT 'mocked' CHECK(aiMode IN ('claude', 'mocked')),
    mappings TEXT DEFAULT '{}',
    joins TEXT DEFAULT '[]',
    filters TEXT DEFAULT '[]',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`)

// Migration: add lockedMappings if missing
try {
  db.prepare('SELECT lockedMappings FROM profiles LIMIT 1').get()
} catch {
  db.exec('ALTER TABLE profiles ADD COLUMN lockedMappings TEXT DEFAULT "{}"')
}
// Migration: add enumMappings if missing
try {
  db.prepare('SELECT enumMappings FROM profiles LIMIT 1').get()
} catch {
  db.exec('ALTER TABLE profiles ADD COLUMN enumMappings TEXT DEFAULT "{}"')
}

// Seed default template if empty (T011)
const count = db.prepare('SELECT COUNT(*) as c FROM profiles').get() as { c: number }
if (count.c === 0) {
  const id = 'default-template'
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO profiles (id, name, description, status, dataModelVersion, aiMode, mappings, joins, filters, createdAt, updatedAt)
     VALUES (?, ?, ?, 'draft', 'V1', 'mocked', '{}', '[]', '[]', ?, ?)`
  ).run(id, 'Default Template', 'ETL configuration template', now, now)
}
