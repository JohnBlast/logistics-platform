import { Link } from 'react-router-dom'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <p className="text-[rgba(0,0,0,0.6)] text-center mb-4 max-w-md">
        Add data and run pipeline in ETL to query.
      </p>
      <Link
        to="/etl/simulate"
        className="px-6 py-2.5 bg-primary text-white rounded font-medium hover:bg-primary-dark"
      >
        Go to Simulate Pipeline
      </Link>
    </div>
  )
}
