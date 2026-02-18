import { Router } from 'express'
import {
  listProfiles,
  getProfile,
  createProfile,
  updateProfile,
  setProfileActive,
  deleteProfile,
  duplicateProfile,
} from '../services/profileStore.js'

export const profilesRouter = Router()

profilesRouter.get('/', (_req, res) => {
  const profiles = listProfiles()
  res.json(profiles)
})

profilesRouter.post('/', (req, res) => {
  const { name, description, dataModelVersion, aiMode } = req.body
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Profile name is required' })
  }
  try {
    const profile = createProfile({
      name: name.trim(),
      description,
      dataModelVersion: dataModelVersion || 'V1',
      aiMode: aiMode || 'mocked',
    })
    res.status(201).json(profile)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

profilesRouter.get('/:id', (req, res) => {
  const profile = getProfile(req.params.id)
  if (!profile) return res.status(404).json({ error: 'Profile not found' })
  res.json(profile)
})

profilesRouter.patch('/:id', (req, res) => {
  const { mappings, lockedMappings, enumMappings, joins, filters, name, description } = req.body
  try {
    const profile = updateProfile(req.params.id, {
      mappings,
      lockedMappings,
      enumMappings,
      joins,
      filters,
      name,
      description,
    })
    if (!profile) return res.status(404).json({ error: 'Profile not found' })
    res.json(profile)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

profilesRouter.post('/:id/activate', (req, res) => {
  try {
    const profile = setProfileActive(req.params.id)
    if (!profile) return res.status(404).json({ error: 'Profile not found' })
    res.json(profile)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

profilesRouter.post('/:id/duplicate', (req, res) => {
  const profile = duplicateProfile(req.params.id)
  if (!profile) return res.status(404).json({ error: 'Profile not found' })
  res.status(201).json(profile)
})

profilesRouter.delete('/:id', (req, res) => {
  try {
    const ok = deleteProfile(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Profile not found' })
    res.status(204).send()
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})
