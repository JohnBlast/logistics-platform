import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const loc = useLocation()
  const [etlOpen, setEtlOpen] = useState(true)

  return (
    <div className="flex min-h-screen bg-background w-full">
      <aside className="w-64 bg-white shrink-0 shadow-md-2 border-r border-black/10">
        <nav className="py-4">
          <button
            type="button"
            onClick={() => setEtlOpen(!etlOpen)}
            className="flex items-center justify-between w-full px-4 py-3 text-left text-[rgba(0,0,0,0.87)] hover:bg-black/4 transition-colors"
          >
            <span className="font-medium text-[15px]">ETL</span>
            <span className="text-[rgba(0,0,0,0.6)]">{etlOpen ? '▼' : '▶'}</span>
          </button>
          {etlOpen && (
            <div className="mt-1">
              <Link
                to="/etl"
                className={`block px-4 py-2.5 text-sm transition-colors ${loc.pathname === '/etl' || loc.pathname.startsWith('/etl/profiles/') ? 'bg-[rgba(25,118,210,0.08)] text-primary font-medium' : 'text-[rgba(0,0,0,0.6)] hover:bg-black/4'}`}
              >
                Configuration
              </Link>
              <Link
                to="/etl/model"
                className={`block px-4 py-2.5 text-sm transition-colors ${loc.pathname === '/etl/model' ? 'bg-[rgba(25,118,210,0.08)] text-primary font-medium' : 'text-[rgba(0,0,0,0.6)] hover:bg-black/4'}`}
              >
                Data Model
              </Link>
              <Link
                to="/etl/simulate"
                className={`block px-4 py-2.5 text-sm transition-colors ${loc.pathname === '/etl/simulate' ? 'bg-[rgba(25,118,210,0.08)] text-primary font-medium' : 'text-[rgba(0,0,0,0.6)] hover:bg-black/4'}`}
              >
                Simulate Pipeline
              </Link>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-black/10">
            <Link
              data-testid="nav-discovery"
              to="/discovery"
              className={`block px-4 py-2.5 text-sm transition-colors ${loc.pathname === '/discovery' ? 'bg-[rgba(25,118,210,0.08)] text-primary font-medium' : 'text-[rgba(0,0,0,0.6)] hover:bg-black/4'}`}
            >
              Data Discovery
            </Link>
            <span className="block px-4 py-2 text-[rgba(0,0,0,0.38)] text-xs">Job Market (planned)</span>
          </div>
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
