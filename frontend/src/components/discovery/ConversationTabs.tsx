import type { TableInstruction } from '../../lib/discovery/types'
import type { QueryResult } from '../../lib/discovery/queryEngine'
import type { StoredMessage } from '../../services/conversationStore'
import { AiWorkingIndicator } from '../AiWorkingIndicator'

export type DiscoveryTab = 'conversation' | 'output' | 'validate'

interface ConversationTabsProps {
  activeTab: DiscoveryTab
  onTabChange: (tab: DiscoveryTab) => void
  messages: StoredMessage[]
  isGenerating: boolean
  hasTable: boolean
  queryResult: QueryResult | null
  tableInstruction: TableInstruction | null
  renderOutputTable: () => React.ReactNode
  renderValidateTable: () => React.ReactNode
}

export function ConversationTabs({
  activeTab,
  onTabChange,
  messages,
  isGenerating,
  hasTable,
  queryResult,
  tableInstruction,
  renderOutputTable,
  renderValidateTable,
}: ConversationTabsProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex gap-1 border-b border-black/10 shrink-0">
        <button
          type="button"
          onClick={() => onTabChange('conversation')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'conversation'
              ? 'text-primary border-b-2 border-primary -mb-px'
              : 'text-[rgba(0,0,0,0.6)] hover:text-[rgba(0,0,0,0.87)]'
          }`}
        >
          Conversation
        </button>
        {hasTable && (
          <>
            <button
              type="button"
              onClick={() => onTabChange('output')}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'output'
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-[rgba(0,0,0,0.6)] hover:text-[rgba(0,0,0,0.87)]'
              }`}
            >
              Output
            </button>
            <button
              type="button"
              onClick={() => onTabChange('validate')}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'validate'
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-[rgba(0,0,0,0.6)] hover:text-[rgba(0,0,0,0.87)]'
              }`}
            >
              Validate
            </button>
          </>
        )}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'conversation' && (
          <div className="p-4 space-y-4">
            {messages.length === 0 && !isGenerating && (
              <p className="text-[rgba(0,0,0,0.6)] text-sm">
                Ask a question about your quotes and loads. For example: &quot;Show revenue by month&quot; or &quot;Top 5 load posters by quoted price&quot;
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-primary text-white'
                      : m.isError
                        ? 'bg-red-50 border border-red-200 text-red-800'
                        : 'bg-slate-100 border border-slate-200 text-[rgba(0,0,0,0.87)]'
                  }`}
                  role={m.isError ? 'alert' : undefined}
                >
                  {m.isError && (
                    <span className="inline-flex items-center gap-1.5 font-medium mb-1">
                      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Error
                    </span>
                  )}
                  {m.isError ? <span className="block">{m.content}</span> : m.content}
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="flex justify-start">
                <AiWorkingIndicator message="Generating response..." />
              </div>
            )}
          </div>
        )}
        {activeTab === 'output' && hasTable && (
          <div className="p-4">
            {queryResult && tableInstruction ? (
              renderOutputTable()
            ) : (
              <p className="text-[rgba(0,0,0,0.6)] text-sm">No table data.</p>
            )}
          </div>
        )}
        {activeTab === 'validate' && hasTable && (
          <div className="p-4">
            {queryResult && tableInstruction ? (
              renderValidateTable()
            ) : (
              <p className="text-[rgba(0,0,0,0.6)] text-sm">No validation data.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
