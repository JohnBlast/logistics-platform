import type { TableInstruction } from '../lib/discovery/types'

const STORAGE_KEY = 'discovery_conversations'
export const MAX_CONVERSATIONS = 10
export const MAX_BOOKMARKS = 2

export interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface StoredConversation {
  id: string
  title: string
  messages: StoredMessage[]
  tableInstruction?: TableInstruction
  createdAt: string
  bookmarked: boolean
}

function loadAll(): StoredConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveAll(items: StoredConversation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function listConversations(): StoredConversation[] {
  const items = loadAll()
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getConversation(id: string): StoredConversation | null {
  return loadAll().find((c) => c.id === id) ?? null
}

export function createConversation(title?: string): StoredConversation {
  const items = loadAll()
  const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const conv: StoredConversation = {
    id,
    title: title || 'New conversation',
    messages: [],
    createdAt: new Date().toISOString(),
    bookmarked: false,
  }
  const next = [conv, ...items].slice(0, MAX_CONVERSATIONS)
  saveAll(next)
  return conv
}

export function updateConversation(
  id: string,
  patch: Partial<Pick<StoredConversation, 'title' | 'messages' | 'tableInstruction' | 'bookmarked'>>
): StoredConversation | null {
  const items = loadAll()
  const idx = items.findIndex((c) => c.id === id)
  if (idx < 0) return null
  items[idx] = { ...items[idx], ...patch }
  saveAll(items)
  return items[idx]
}

export function deleteConversation(id: string): void {
  const items = loadAll().filter((c) => c.id !== id)
  saveAll(items)
}

export function bookmarkConversation(id: string, bookmarked: boolean): StoredConversation | null {
  const items = loadAll()
  const bookmarkedCount = items.filter((c) => c.bookmarked).length
  if (bookmarked && bookmarkedCount >= MAX_BOOKMARKS) {
    const firstBookmarked = items.find((c) => c.bookmarked)
    if (firstBookmarked && firstBookmarked.id !== id) {
      updateConversation(firstBookmarked.id, { bookmarked: false })
    }
  }
  return updateConversation(id, { bookmarked })
}

export function canBookmark(): boolean {
  return loadAll().filter((c) => c.bookmarked).length < MAX_BOOKMARKS
}

export function canCreate(): boolean {
  return loadAll().length < MAX_CONVERSATIONS
}
