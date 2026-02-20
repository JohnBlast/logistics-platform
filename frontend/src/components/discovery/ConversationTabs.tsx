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
                      : 'bg-black/6 text-[rgba(0,0,0,0.87)]'
                  }`}
                >
                  {m.content}
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
