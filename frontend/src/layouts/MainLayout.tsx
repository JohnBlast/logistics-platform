import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const loc = useLocation()
  const [etlOpen, setEtlOpen] = useState(true)

  return (
    <div className="flex min-h-screen bg-slate-50 w-full">
      <aside className="w-56 bg-slate-800 text-white shrink-0">
        <nav className="p-4 space-y-1">
          <button
            type="button"
            onClick={() => setEtlOpen(!etlOpen)}
            className="flex items-center justify-between w-full px-3 py-2 rounded text-left hover:bg-slate-700"
          >
            <span className="font-medium">ETL</span>
            <span className="text-slate-400">{etlOpen ? '▼' : '▶'}</span>
          </button>
          {etlOpen && (
            <>
              <Link
                to="/etl"
                className={`block px-3 py-2 pl-6 rounded text-sm ${loc.pathname === '/etl' ? 'bg-slate-600' : 'text-slate-400 hover:text-white'}`}
              >
                Configuration
              </Link>
              <Link
                to="/etl/model"
                className={`block px-3 py-2 pl-6 rounded text-sm ${loc.pathname === '/etl/model' ? 'bg-slate-600' : 'text-slate-400 hover:text-white'}`}
              >
                Data Model
              </Link>
              <Link
                to="/etl/simulate"
                className={`block px-3 py-2 pl-6 rounded text-sm ${loc.pathname === '/etl/simulate' ? 'bg-slate-600' : 'text-slate-400 hover:text-white'}`}
              >
                Simulate Pipeline
              </Link>
            </>
          )}
          <span className="block px-3 py-2 text-slate-500 text-sm">Data Discovery (planned)</span>
          <span className="block px-3 py-2 text-slate-500 text-sm">Job Market (planned)</span>
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
