import { useEffect, useState } from 'react'
import { api } from '../api'
import { useUser } from '../contexts/UserContext'
import type { User } from '../types'
import { HeartPulse, UserPlus } from 'lucide-react'

export default function SelectUser() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { setCurrentUser } = useUser()

  useEffect(() => {
    api.getUsers().then(setUsers).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
      <HeartPulse className="text-indigo-400 animate-pulse" size={40} />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center px-6 pb-10">
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <HeartPulse className="text-white" size={40} />
        </div>
        <h1 className="text-3xl font-bold text-slate-800">HealthTracker</h1>
        <p className="text-slate-500 mt-2">Chi sei?</p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {users.map(user => (
          <button
            key={user.id}
            onClick={() => setCurrentUser(user)}
            className="w-full bg-white rounded-2xl p-4 text-left shadow-sm border border-slate-100 flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-slate-800">{user.name}</div>
              {user.is_admin && (
                <div className="text-xs text-indigo-500 font-medium">Amministratore</div>
              )}
            </div>
          </button>
        ))}

        {users.length === 0 && (
          <div className="text-center text-slate-400 py-8">
            <UserPlus size={40} className="mx-auto mb-3 opacity-50" />
            <p>Nessun utente trovato.</p>
            <p className="text-sm mt-1">Configura il server.</p>
          </div>
        )}
      </div>
    </div>
  )
}
