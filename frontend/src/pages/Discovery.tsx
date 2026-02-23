import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePipelineOutput } from '../context/PipelineOutputContext'
import { api } from '../services/api'
import { EmptyState } from '../components/discovery/EmptyState'
import { ConversationSidebar } from '../components/discovery/ConversationSidebar'
import { ChatInput } from '../components/discovery/ChatInput'
import { ConversationTabs, type DiscoveryTab } from '../components/discovery/ConversationTabs'
import { OutputTable } from '../components/discovery/OutputTable'
import { ValidateTable } from '../components/discovery/ValidateTable'
import { getConversation, createConversation, updateConversation, listConversations } from '../services/conversationStore'
import { execute } from '../lib/discovery/queryEngine'
import type { TableInstruction, TableFilter } from '../lib/discovery/types'

export function Discovery() {
  const { pipelineOutput, clearPipelineOutput } = usePipelineOutput()
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [sidebarKey, setSidebarKey] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<DiscoveryTab>('conversation')
  const [clientFilters, setClientFilters] = useState<TableFilter[]>([])
  const [claudeAvailable, setClaudeAvailable] = useState<boolean | null>(null)

  const refreshSidebar = useCallback(() => setSidebarKey((k) => k + 1), [])

  useEffect(() => {
    const convos = listConversations()
    if (convos.length > 0 && !currentId) {
      setCurrentId(convos[0].id)
    } else if (convos.length === 0 && currentId) {
      setCurrentId(null)
    }
  }, [currentId, sidebarKey])

  useEffect(() => {
    api.health.ai().then((r) => setClaudeAvailable(r.claudeAvailable)).catch(() => setClaudeAvailable(false))
  }, [])

  useEffect(() => {
    setClientFilters([])
  }, [currentId])

  const conv = currentId ? getConversation(currentId) : null

  const queryResult = useMemo(() => {
    if (!pipelineOutput?.flatRows?.length || !conv?.tableInstruction) return null
    try {
      const ti = conv.tableInstruction as TableInstruction
      return execute(ti, pipelineOutput.flatRows)
    } catch {
      return null
    }
  }, [pipelineOutput?.flatRows, conv?.tableInstruction])

  const hasTable = !!(conv?.tableInstruction && queryResult)

  const handleSelect = (id: string) => {
    setCurrentId(id)
    setActiveTab('conversation')
  }

  const handleSubmit = async (prompt: string) => {
    let convId = currentId
    if (!convId) {
      const conv = createConversation()
      convId = conv.id
      setCurrentId(convId)
      refreshSidebar()
    }

    const conv = getConversation(convId)
    if (!conv) return

    const history = conv.messages.map((m) => ({ role: m.role, content: m.content }))
    const prevTitle = conv.messages.length === 0 ? prompt.slice(0, 50) + (prompt.length > 50 ? '...' : '') : undefined

    updateConversation(convId, {
      messages: [...conv.messages, { role: 'user' as const, content: prompt }],
      ...(prevTitle && { title: prevTitle }),
    })
    refreshSidebar()
    setIsGenerating(true)

    try {
      const dataColumns =
        pipelineOutput?.flatRows?.length && pipelineOutput.flatRows[0]
          ? Object.keys(pipelineOutput.flatRows[0] as Record<string, unknown>)
          : undefined
      const res = await api.chat(prompt, {
        conversationHistory: history,
        previousTableInstruction: conv.tableInstruction as Record<string, unknown> | undefined,
        dataColumns,
      })

      const updated = getConversation(convId)
      if (!updated) return

      const newMessages = [
        ...updated.messages,
        { role: 'assistant' as const, content: res.summary },
      ]

      updateConversation(convId, {
        messages: newMessages,
        title: res.title || updated.title,
        tableInstruction: res.tableInstruction as typeof conv.tableInstruction | undefined,
      })
      refreshSidebar()
      if (res.tableInstruction) setActiveTab('output')
    } catch (err) {
      const e = err as Error & { code?: string; summary?: string }
      let msg: string
      if (e.code === 'RATE_LIMIT') msg = 'Rate limit exceeded. Try again later.'
      else if (e.code === 'CLAUDE_UNAVAILABLE') msg = e.summary || 'AI is not available. Please configure ANTHROPIC_API_KEY in .env and restart the backend.'
      else if (e.code === 'GENERATION_FAILED') msg = e.summary || 'Generation failed. Please try again.'
      else msg = e.message || String(err)
      updateConversation(convId, {
        messages: [
          ...(getConversation(convId)?.messages ?? []),
          { role: 'assistant' as const, content: msg, isError: true },
        ],
      })
      refreshSidebar()
    } finally {
      setIsGenerating(false)
    }
  }

  if (!pipelineOutput || pipelineOutput.flatRows.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-medium mb-4 text-[rgba(0,0,0,0.87)]">Data Discovery</h1>
        {claudeAvailable === false && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            Claude AI is not configured. Add <code className="bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> to your <code className="bg-amber-100 px-1 rounded">.env</code> and restart the backend to use natural language queries.
          </div>
        )}
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -m-4">
      {claudeAvailable === false && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Claude AI is not configured. Add <code className="bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> to your <code className="bg-amber-100 px-1 rounded">.env</code> at project root and restart the backend to use natural language queries.
        </div>
      )}
      <div className="flex flex-1 min-h-0 border border-black/10 rounded-lg overflow-hidden bg-white shadow-sm">
        <ConversationSidebar
          key={sidebarKey}
          currentId={currentId}
          onSelect={handleSelect}
          onRefresh={refreshSidebar}
          isGenerating={isGenerating}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 pt-4 pb-2 border-b border-black/6 flex items-center justify-between gap-4">
            <h1 className="text-xl font-medium text-[rgba(0,0,0,0.87)]">
              {conv?.title ?? 'Data Discovery'}
            </h1>
            <button
              type="button"
              onClick={() => clearPipelineOutput()}
              className="shrink-0 px-3 py-1.5 text-sm font-medium text-[rgba(0,0,0,0.6)] hover:text-red-600 hover:bg-red-50 rounded border border-black/10 hover:border-red-200"
            >
              Clear pipeline data
            </button>
          </div>
          <ConversationTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            messages={conv?.messages ?? []}
            isGenerating={isGenerating}
            hasTable={!!hasTable}
            queryResult={queryResult}
            tableInstruction={(conv?.tableInstruction ?? null) as TableInstruction | null}
            renderOutputTable={() =>
              queryResult && conv?.tableInstruction ? (
                <OutputTable
                  queryResult={queryResult}
                  tableInstruction={conv.tableInstruction as TableInstruction}
                  clientFilters={clientFilters}
                  onFiltersChange={setClientFilters}
                />
              ) : null
            }
            renderValidateTable={() =>
              queryResult ? (
                <ValidateTable
                  queryResult={queryResult}
                  clientFilters={clientFilters}
                  onFiltersChange={setClientFilters}
                />
              ) : null
            }
          />
          <ChatInput onSubmit={handleSubmit} disabled={isGenerating} />
        </div>
      </div>
    </div>
  )
}
