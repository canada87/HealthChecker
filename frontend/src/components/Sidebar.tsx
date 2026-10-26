import { NavLink } from 'react-router-dom'
import { HeartPulse, LogOut } from 'lucide-react'
import { useUser } from '../contexts/UserContext'
import { useNavItems } from './BottomNav'

// Desktop-only navigation (≥1024px); BottomNav covers smaller screens.
export default function Sidebar() {
  const { currentUser, setCurrentUser } = useUser()
  const items = useNavItems()

  return (
    <aside className="hidden print:!hidden lg:flex flex-col w-60 shrink-0 bg-white border-r border-slate-200 px-3 py-5">
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
          <HeartPulse className="text-white" size={20} />
        </div>
        <span className="text-lg font-bold text-slate-800">HealthTracker</span>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-3 px-3 pt-4 border-t border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">
          {currentUser?.name.charAt(0).toUpperCase()}
        </div>
        <span className="flex-1 text-sm font-medium text-slate-700 truncate">{currentUser?.name}</span>
        <button
          onClick={() => setCurrentUser(null)}
          title="Cambia utente"
          aria-label="Cambia utente"
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  )
}
