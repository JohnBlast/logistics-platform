import { Link } from 'react-router-dom'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <svg className="w-16 h-16 text-[rgba(0,0,0,0.2)] mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
      <h2 className="text-lg font-medium text-[rgba(0,0,0,0.87)] mb-2">
        Ask questions about your logistics data
      </h2>
      <p className="text-[rgba(0,0,0,0.6)] text-center mb-6 max-w-md text-sm">
        Query your quotes, loads, and fleet data using natural language. To get started, generate data and run the pipeline first.
      </p>
      <ol className="text-sm text-[rgba(0,0,0,0.6)] mb-8 space-y-2 max-w-sm">
        <li className="flex items-start gap-3">
          <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
          <span>Go to <strong>Simulate Pipeline</strong> and click <strong>Add</strong> to generate data</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
          <span>Click <strong>Run Pipeline</strong> to process the data through your active ETL profile</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
          <span>Return here and ask questions like &quot;Top 5 profitable routes&quot; or &quot;Monthly revenue trend&quot;</span>
        </li>
      </ol>
      <Link
        to="/etl/simulate"
        className="px-6 py-2.5 bg-primary text-white rounded font-medium hover:bg-primary-dark"
      >
        Go to Simulate Pipeline
      </Link>
    </div>
  )
}
