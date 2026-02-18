import { Link, useLocation } from 'react-router-dom'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const loc = useLocation()
  const isEtl = loc.pathname.startsWith('/etl')

  return (
    <div className="min-w-[1280px] flex min-h-screen bg-slate-50">
      <aside className="w-56 bg-slate-800 text-white shrink-0">
        <nav className="p-4 space-y-1">
          <Link
            to="/etl"
            className={`block px-3 py-2 rounded ${isEtl ? 'bg-slate-600' : 'hover:bg-slate-700'}`}
          >
            ETL
          </Link>
          <Link
            to="/etl/model"
            className={`block px-3 py-2 rounded ${loc.pathname === '/etl/model' ? 'bg-slate-600' : 'text-slate-400 hover:text-white'}`}
          >
            Data Model
          </Link>
          <Link
            to="/etl/simulate"
            className={`block px-3 py-2 rounded ${loc.pathname === '/etl/simulate' ? 'bg-slate-600' : 'text-slate-400 hover:text-white'}`}
          >
            Simulate Pipeline
          </Link>
          <span className="block px-3 py-2 text-slate-500 text-sm">Data Discovery (planned)</span>
          <span className="block px-3 py-2 text-slate-500 text-sm">Job Market (planned)</span>
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
