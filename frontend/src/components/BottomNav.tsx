import { NavLink } from 'react-router-dom'
import { Home, Zap, Calendar, BarChart2, Settings, Shield } from 'lucide-react'
import { useUser } from '../contexts/UserContext'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/crises', icon: Zap, label: 'Crisi' },
  { to: '/history', icon: Calendar, label: 'Storico' },
  { to: '/stats', icon: BarChart2, label: 'Statistiche' },
  { to: '/settings', icon: Settings, label: 'Impostazioni' },
]

export function useNavItems() {
  const { currentUser } = useUser()
  return currentUser?.is_admin
    ? [...navItems, { to: '/admin', icon: Shield, label: 'Admin' }]
    : navItems
}

export default function BottomNav() {
  const items = useNavItems()

  return (
    <nav className="bg-white border-t border-slate-200 safe-bottom lg:hidden">
      <div className="flex">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
                isActive ? 'text-indigo-600' : 'text-slate-500'
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
