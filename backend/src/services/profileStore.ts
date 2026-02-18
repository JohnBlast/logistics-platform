import { db } from '../models/db.js'
import { randomUUID } from 'crypto'

export type ProfileStatus = 'active' | 'draft' | 'archive'
export type AiMode = 'claude' | 'mocked'

export interface FieldMapping {
  [targetField: string]: string // target -> source column
}

export interface JoinOperation {
  name: string
  leftEntity: string
  rightEntity: string
  leftKey: string
  rightKey: string
  fallbackKey?: string
}

export interface FilterRule {
  type: 'inclusion' | 'exclusion'
  rule: string
  structured?: unknown
}

/** entity -> field -> { sourceValue -> targetValue } */
export type EnumMappings = Record<string, Record<string, Record<string, string>>>

export interface Profile {
  id: string
  name: string
  description: string | null
  status: ProfileStatus
  dataModelVersion: string
  aiMode: AiMode
  mappings: Record<string, FieldMapping> // objectType -> { target -> source }
  lockedMappings?: Record<string, FieldMapping>
  enumMappings?: EnumMappings // entity -> field -> { sourceValue -> targetValue }
  joins: JoinOperation[]
  filters: FilterRule[]
  createdAt: string
  updatedAt: string
}

export function listProfiles(): Profile[] {
  const rows = db.prepare('SELECT * FROM profiles ORDER BY updatedAt DESC').all()
  return rows.map(rowToProfile)
}

export function getProfile(id: string): Profile | null {
  const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id)
  if (!row) return null
  return rowToProfile(row as Record<string, unknown>)
}

export function createProfile(data: {
  name: string
  description?: string
  dataModelVersion: string
  aiMode: AiMode
}): Profile {
  if (!data.name?.trim()) {
    throw new Error('Profile name is required')
  }
  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO profiles (id, name, description, status, dataModelVersion, aiMode, mappings, joins, filters, createdAt, updatedAt)
     VALUES (?, ?, ?, 'draft', ?, ?, '{}', '[]', '[]', ?, ?)`
  ).run(id, data.name.trim(), data.description ?? null, data.dataModelVersion, data.aiMode, now, now)
  const profile = getProfile(id)!
  return profile
}

export function updateProfile(
  id: string,
  updates: Partial<Pick<Profile, 'mappings' | 'lockedMappings' | 'enumMappings' | 'joins' | 'filters' | 'name' | 'description'>>
): Profile | null {
  const profile = getProfile(id)
  if (!profile) return null
  if (profile.status !== 'draft') {
    throw new Error('Cannot update Active or Archived profile')
  }
  const now = new Date().toISOString()
  const mappings = updates.mappings !== undefined ? JSON.stringify(updates.mappings) : undefined
  const lockedMappings = updates.lockedMappings !== undefined ? JSON.stringify(updates.lockedMappings) : undefined
  const enumMappings = updates.enumMappings !== undefined ? JSON.stringify(updates.enumMappings) : undefined
  const joins = updates.joins !== undefined ? JSON.stringify(updates.joins) : undefined
  const filters = updates.filters !== undefined ? JSON.stringify(updates.filters) : undefined
  const name = updates.name !== undefined ? updates.name : undefined
  const description = updates.description !== undefined ? updates.description : undefined

  const sets: string[] = ['updatedAt = ?']
  const vals: unknown[] = [now]
  if (mappings !== undefined) {
    sets.push('mappings = ?')
    vals.push(mappings)
  }
  if (lockedMappings !== undefined) {
    sets.push('lockedMappings = ?')
    vals.push(lockedMappings)
  }
  if (enumMappings !== undefined) {
    sets.push('enumMappings = ?')
    vals.push(enumMappings)
  }
  if (joins !== undefined) {
    sets.push('joins = ?')
    vals.push(joins)
  }
  if (filters !== undefined) {
    sets.push('filters = ?')
    vals.push(filters)
  }
  if (name !== undefined) {
    sets.push('name = ?')
    vals.push(name)
  }
  if (description !== undefined) {
    sets.push('description = ?')
    vals.push(description)
  }
  vals.push(id)
  db.prepare(`UPDATE profiles SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  return getProfile(id)
}

export function setProfileActive(id: string): Profile | null {
  const profile = getProfile(id)
  if (!profile) return null
  if (profile.status !== 'draft') {
    throw new Error('Only Draft profiles can be activated')
  }
  const now = new Date().toISOString()
  db.prepare("UPDATE profiles SET status = 'archive' WHERE status = 'active'").run()
  db.prepare('UPDATE profiles SET status = ? WHERE id = ?').run('active', id)
  db.prepare('UPDATE profiles SET updatedAt = ? WHERE id = ?').run(now, id)
  return getProfile(id)
}

export function deleteProfile(id: string): boolean {
  const count = db.prepare('SELECT COUNT(*) as c FROM profiles').get() as { c: number }
  if (count.c <= 1) {
    throw new Error('Cannot delete the last profile')
  }
  const result = db.prepare('DELETE FROM profiles WHERE id = ?').run(id)
  return result.changes > 0
}

export function duplicateProfile(id: string): Profile | null {
  const source = getProfile(id)
  if (!source) return null
  const data = {
    name: `${source.name} (copy)`,
    description: source.description ?? undefined,
    dataModelVersion: source.dataModelVersion,
    aiMode: source.aiMode,
  }
  const profile = createProfile(data)
  updateProfile(profile.id, {
    mappings: source.mappings,
    lockedMappings: source.lockedMappings,
    enumMappings: source.enumMappings,
    joins: source.joins,
    filters: source.filters,
    name: `${source.name} (copy)`,
  })
  return getProfile(profile.id)
}

function rowToProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    status: row.status as ProfileStatus,
    dataModelVersion: row.dataModelVersion as string,
    aiMode: row.aiMode as AiMode,
    mappings: JSON.parse((row.mappings as string) || '{}'),
    lockedMappings: JSON.parse((row.lockedMappings as string) || '{}'),
    enumMappings: JSON.parse((row.enumMappings as string) || '{}'),
    joins: JSON.parse((row.joins as string) || '[]'),
    filters: JSON.parse((row.filters as string) || '[]'),
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  }
}
