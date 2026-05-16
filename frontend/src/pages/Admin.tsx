import { useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import { useUser } from '../contexts/UserContext'
import type { User } from '../types'
import { Plus, Pencil, Trash2, X, Check, Shield } from 'lucide-react'

export default function Admin() {
  const { currentUser } = useUser()
  const [users, setUsers] = useState<User[]>([])
  const [adding, setAdding] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const load = useCallback(() => api.getUsers().then(setUsers), [])
  useEffect(() => { load() }, [load])

  if (!currentUser?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Shield size={48} className="mb-4 opacity-30" />
        <p>Accesso riservato agli amministratori</p>
      </div>
    )
  }

  const save = async () => {
    if (!name.trim()) return
    if (editUser) {
      await api.updateUser(editUser.id, { name, is_admin: isAdmin })
      setEditUser(null)
    } else {
      await api.createUser(name, isAdmin)
      setAdding(false)
    }
    setName('')
    setIsAdmin(false)
    load()
  }

  const showForm = adding || !!editUser

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Admin</h1>
        {!showForm && (
          <button onClick={() => { setAdding(true); setName(''); setIsAdmin(false) }}
            className="flex items-center gap-1 text-sm text-indigo-600 font-medium">
            <Plus size={18} /> Nuovo utente
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100 mb-4">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome utente..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            autoFocus
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setIsAdmin(!isAdmin)}
              className={`w-12 h-6 rounded-full transition-colors ${isAdmin ? 'bg-indigo-600' : 'bg-slate-200'} relative`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isAdmin ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-slate-600">Amministratore</span>
          </label>
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setEditUser(null) }}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm flex items-center justify-center gap-1">
              <X size={16} /> Annulla
            </button>
            <button onClick={save} disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50">
              <Check size={16} /> Salva
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {users.map(user => (
          <div key={user.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="font-medium text-slate-700">{user.name}</div>
              {user.is_admin && (
                <div className="flex items-center gap-1 text-xs text-indigo-500">
                  <Shield size={11} /> Amministratore
                </div>
              )}
            </div>
            <button onClick={() => { setEditUser(user); setName(user.name); setIsAdmin(user.is_admin); setAdding(false) }}
              className="p-2 text-slate-400 hover:text-indigo-500"><Pencil size={16} /></button>
            {user.id !== currentUser.id && (
              <button onClick={async () => { await api.deleteUser(user.id); load() }}
                className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
