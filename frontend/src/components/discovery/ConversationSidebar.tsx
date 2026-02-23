import { useState } from 'react'
import type { StoredConversation } from '../../services/conversationStore'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import {
  listConversations,
  createConversation,
  deleteConversation,
  bookmarkConversation,
  canBookmark,
  canCreate,
  MAX_CONVERSATIONS,
  MAX_BOOKMARKS,
} from '../../services/conversationStore'

interface ConversationSidebarProps {
  currentId: string | null
  onSelect: (id: string) => void
  onRefresh: () => void
  isGenerating?: boolean
}

export function ConversationSidebar({ currentId, onSelect, onRefresh, isGenerating }: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<StoredConversation[]>(() => listConversations())
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const refresh = () => {
    setConversations(listConversations())
    onRefresh()
  }

  const handleCreate = () => {
    if (!canCreate()) return
    const conv = createConversation()
    setConversations(listConversations())
    onSelect(conv.id)
    onRefresh()
  }

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeleteTarget(id)
  }

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    deleteConversation(deleteTarget)
    setDeleteTarget(null)
    refresh()
    if (currentId === deleteTarget) onSelect(listConversations()[0]?.id ?? '')
  }

  const handleBookmark = (e: React.MouseEvent, id: string, bookmarked: boolean) => {
    e.stopPropagation()
    if (bookmarked) {
      bookmarkConversation(id, false)
    } else if (canBookmark()) {
      bookmarkConversation(id, true)
    }
    setConversations(listConversations())
    onRefresh()
  }

  const sorted = [...conversations].sort((a, b) => {
    if (a.bookmarked && !b.bookmarked) return -1
    if (!a.bookmarked && b.bookmarked) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <aside className="w-56 shrink-0 border-r border-black/10 bg-white/80 flex flex-col">
      <div className="p-3 border-b border-black/10">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!canCreate()}
          className="w-full px-4 py-2.5 bg-primary text-white rounded font-medium text-sm hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          New conversation
        </button>
        {!canCreate() && (
          <p className="mt-2 text-xs text-[rgba(0,0,0,0.6)]">Maximum {MAX_CONVERSATIONS} conversations. Delete one to continue.</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {sorted.length === 0 ? (
          <p className="px-3 py-4 text-sm text-[rgba(0,0,0,0.6)]">No conversations yet</p>
        ) : (
          <ul className="space-y-0.5">
            {sorted.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm group rounded-r transition-colors ${
                    currentId === c.id ? 'bg-[rgba(25,118,210,0.12)] text-primary font-medium' : 'text-[rgba(0,0,0,0.87)] hover:bg-black/4'
                  }`}
                >
                  {currentId === c.id && isGenerating && (
                    <span className="shrink-0 text-primary" title="Generating...">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleBookmark(e, c.id, c.bookmarked)}
                    aria-label={c.bookmarked ? 'Unbookmark conversation' : 'Bookmark conversation'}
                    className={`shrink-0 ${c.bookmarked ? 'text-amber-500' : 'text-[rgba(0,0,0,0.38)] opacity-40 group-hover:opacity-100 focus:opacity-100'}`}
                    title={c.bookmarked ? 'Unbookmark' : canBookmark() || c.bookmarked ? 'Bookmark (max 2)' : `Maximum ${MAX_BOOKMARKS} bookmarks`}
                  >
                    {c.bookmarked ? '★' : '☆'}
                  </button>
                  <span className="flex-1 truncate" title={c.title}>{c.title}</span>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteClick(e, c.id)}
                    aria-label="Delete conversation"
                    className="shrink-0 text-[rgba(0,0,0,0.38)] hover:text-red-600 focus:text-red-600 opacity-40 group-hover:opacity-100 focus:opacity-100 px-1"
                    title="Delete"
                  >
                    ×
                  </button>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <DeleteConfirmModal
        open={!!deleteTarget}
        title="Delete this conversation?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
      {sorted.filter((c) => c.bookmarked).length >= MAX_BOOKMARKS && (
        <div className="px-3 py-2 text-xs text-[rgba(0,0,0,0.6)] border-t border-black/10">
          Maximum {MAX_BOOKMARKS} bookmarks. Unbookmark one first.
        </div>
      )}
    </aside>
  )
}
