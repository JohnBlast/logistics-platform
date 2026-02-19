/**
 * Must be imported first so .env is loaded before any module reads process.env.
 * ES modules hoist imports, so this file's side effect runs before other imports.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..') // backend/src -> project root
const envPath = path.join(projectRoot, '.env')

// Try project root; fallback if running from backend/ (cwd = backend)
let loaded = dotenv.config({ path: envPath })
if (!loaded.parsed || Object.keys(loaded.parsed).length === 0) {
  const cwdEnv = path.join(process.cwd(), '..', '.env')
  loaded = dotenv.config({ path: cwdEnv })
}

// Startup diagnostic (no sensitive values)
const key = process.env.ANTHROPIC_API_KEY
const hasKey = !!key && key.startsWith('sk-ant-')
if (!hasKey) {
  console.warn('[backend] ANTHROPIC_API_KEY not set or invalid. Claude AI features will not work.')
}
