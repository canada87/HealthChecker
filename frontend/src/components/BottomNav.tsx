import { NavLink } from 'react-router-dom'
import { Home, Calendar, BarChart2, Settings, Shield } from 'lucide-react'
import { useUser } from '../contexts/UserContext'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/history', icon: Calendar, label: 'Storico' },
  { to: '/stats', icon: BarChart2, label: 'Statistiche' },
  { to: '/settings', icon: Settings, label: 'Impostazioni' },
]

export default function BottomNav() {
  const { currentUser } = useUser()
  const items = currentUser?.is_admin
    ? [...navItems, { to: '/admin', icon: Shield, label: 'Admin' }]
    : navItems

  return (
    <nav className="bg-white border-t border-slate-200 safe-bottom">
      <div className="flex">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
                isActive ? 'text-indigo-600' : 'text-slate-400'
              }`
            }
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
