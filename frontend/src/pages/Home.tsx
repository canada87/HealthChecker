import { useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import { useUser } from '../contexts/UserContext'
import type { Medication, Illness } from '../types'
import { LogOut, Plus, Check, CalendarDays } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import LogPastModal from '../components/LogPastModal'

interface LoggedItem { id: number; type: 'med' | 'ill'; at: Date }

export default function Home() {
  const { currentUser, setCurrentUser } = useUser()
  const [medications, setMedications] = useState<Medication[]>([])
  const [illnesses, setIllnesses] = useState<Illness[]>([])
  const [recentLogs, setRecentLogs] = useState<LoggedItem[]>([])
  const [logging, setLogging] = useState<number | null>(null)
  const [justLogged, setJustLogged] = useState<number | null>(null)
  const [showPastModal, setShowPastModal] = useState(false)

  const load = useCallback(async () => {
    if (!currentUser) return
    const [meds, ills] = await Promise.all([
      api.getMedications(currentUser.id),
      api.getIllnesses(currentUser.id),
    ])
    setMedications(meds)
    setIllnesses(ills)
  }, [currentUser])

  useEffect(() => { load() }, [load])

  const handleLogMed = async (med: Medication) => {
    if (logging) return
    setLogging(med.id)
    try {
      const log = await api.logMedication(med.id)
      setJustLogged(med.id)
      setRecentLogs(prev => [{ id: log.id, type: 'med', at: new Date(log.taken_at) }, ...prev.slice(0, 4)])
      setTimeout(() => setJustLogged(null), 2000)
    } finally {
      setLogging(null)
    }
  }

  const handleLogIll = async (ill: Illness) => {
    if (logging) return
    setLogging(-ill.id)
    try {
      const log = await api.logIllness(ill.id)
      setJustLogged(-ill.id)
      setRecentLogs(prev => [{ id: log.id, type: 'ill', at: new Date(log.occurred_at) }, ...prev.slice(0, 4)])
      setTimeout(() => setJustLogged(null), 2000)
    } finally {
      setLogging(null)
    }
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-slate-500 text-sm">Ciao,</p>
          <h1 className="text-2xl font-bold text-slate-800">{currentUser?.name}</h1>
        </div>
        <button
          onClick={() => setCurrentUser(null)}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 active:bg-slate-200"
        >
          <LogOut size={20} />
        </button>
      </div>

      {recentLogs.length > 0 && (
        <div className="mb-6 bg-green-50 rounded-2xl p-3 border border-green-100">
          <p className="text-xs font-semibold text-green-700 mb-1">Registrato</p>
          {recentLogs.slice(0, 1).map(l => (
            <p key={l.id} className="text-sm text-green-800">
              {formatDistanceToNow(l.at, { addSuffix: true, locale: it })}
            </p>
          ))}
        </div>
      )}

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-700">💊 Farmaci</h2>
          <button
            onClick={() => setShowPastModal(true)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-500 transition-colors px-2 py-1"
          >
            <CalendarDays size={14} />
            Passato
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {medications.map(med => {
            const isJust = justLogged === med.id
            return (
              <button
                key={med.id}
                onClick={() => handleLogMed(med)}
                disabled={!!logging}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center gap-2 active:scale-95 transition-all disabled:opacity-70"
                style={{ borderColor: isJust ? med.color : undefined, borderWidth: isJust ? 2 : undefined }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm"
                  style={{ backgroundColor: med.color + '20' }}
                >
                  {isJust ? <Check style={{ color: med.color }} size={28} /> : med.emoji}
                </div>
                <span className="text-sm font-semibold text-slate-700 text-center">{med.name}</span>
              </button>
            )
          })}
          {medications.length === 0 && (
            <div className="col-span-2 text-center py-6 text-slate-400 text-sm">
              <Plus size={24} className="mx-auto mb-1 opacity-50" />
              Aggiungi farmaci nelle impostazioni
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-700">🤒 Malattie</h2>
          <button
            onClick={() => setShowPastModal(true)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-500 transition-colors px-2 py-1"
          >
            <CalendarDays size={14} />
            Passato
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {illnesses.map(ill => {
            const isJust = justLogged === -ill.id
            return (
              <button
                key={ill.id}
                onClick={() => handleLogIll(ill)}
                disabled={!!logging}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center gap-2 active:scale-95 transition-all disabled:opacity-70"
                style={{ borderColor: isJust ? ill.color : undefined, borderWidth: isJust ? 2 : undefined }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm"
                  style={{ backgroundColor: ill.color + '20' }}
                >
                  {isJust ? <Check style={{ color: ill.color }} size={28} /> : ill.emoji}
                </div>
                <span className="text-sm font-semibold text-slate-700 text-center">{ill.name}</span>
              </button>
            )
          })}
          {illnesses.length === 0 && (
            <div className="col-span-2 text-center py-6 text-slate-400 text-sm">
              <Plus size={24} className="mx-auto mb-1 opacity-50" />
              Aggiungi malattie nelle impostazioni
            </div>
          )}
        </div>
      </section>
      {showPastModal && (
        <LogPastModal
          medications={medications}
          illnesses={illnesses}
          onClose={() => setShowPastModal(false)}
          onSaved={() => {}}
        />
      )}
    </div>
  )
}
