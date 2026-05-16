import { useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import { useUser } from '../contexts/UserContext'
import type { Medication, Illness, IllnessEpisode } from '../types'
import { LogOut, Plus, Check, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import LogPastModal from '../components/LogPastModal'
import IllnessEpisodeModal from '../components/IllnessEpisodeModal'

const LEVEL_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444']

function IntensityDots({ intensity, color }: { intensity: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: i <= intensity ? color : '#e2e8f0' }} />
      ))}
    </div>
  )
}

export default function Home() {
  const { currentUser, setCurrentUser } = useUser()
  const [medications, setMedications] = useState<Medication[]>([])
  const [illnesses, setIllnesses] = useState<Illness[]>([])
  const [activeEpisodes, setActiveEpisodes] = useState<IllnessEpisode[]>([])
  const [logging, setLogging] = useState<number | null>(null)
  const [justLogged, setJustLogged] = useState<number | null>(null)
  const [showPastModal, setShowPastModal] = useState(false)
  const [selectedIllness, setSelectedIllness] = useState<Illness | null>(null)

  const load = useCallback(async () => {
    if (!currentUser) return
    const [meds, ills, eps] = await Promise.all([
      api.getMedications(currentUser.id),
      api.getIllnesses(currentUser.id),
      api.getActiveIllnessEpisodes(currentUser.id),
    ])
    setMedications(meds)
    setIllnesses(ills)
    setActiveEpisodes(eps)
  }, [currentUser])

  useEffect(() => { load() }, [load])

  const handleLogMed = async (med: Medication) => {
    if (logging) return
    setLogging(med.id)
    try {
      await api.logMedication(med.id)
      setJustLogged(med.id)
      setTimeout(() => setJustLogged(null), 2000)
    } finally {
      setLogging(null)
    }
  }

  const handleIllnessTap = (ill: Illness) => {
    setSelectedIllness(ill)
  }

  const activeEpisodeForIllness = (illId: number) =>
    activeEpisodes.find(ep => ep.illness_id === illId) ?? null

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

      {activeEpisodes.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-100 rounded-2xl p-3">
          <p className="text-xs font-semibold text-amber-700 mb-1.5">Malattie in corso</p>
          <div className="space-y-1.5">
            {activeEpisodes.map(ep => {
              const lastLog = ep.logs[ep.logs.length - 1]
              const intensity = lastLog?.intensity
              const color = intensity ? LEVEL_COLORS[intensity - 1] : ep.illness.color
              return (
                <div key={ep.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{ep.illness.emoji}</span>
                    <span className="text-sm font-medium text-amber-800">{ep.illness.name}</span>
                    <span className="text-xs text-amber-500">
                      dal {format(new Date(ep.started_at), 'd MMM', { locale: it })}
                    </span>
                  </div>
                  {intensity && <IntensityDots intensity={intensity} color={color} />}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {justLogged !== null && (
        <div className="mb-5 bg-green-50 rounded-2xl p-3 border border-green-100">
          <p className="text-sm text-green-800 font-medium">Registrato</p>
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
            const ep = activeEpisodeForIllness(ill.id)
            const lastLog = ep?.logs[ep.logs.length - 1]
            const intensity = lastLog?.intensity
            const activeColor = intensity ? LEVEL_COLORS[intensity - 1] : ill.color
            return (
              <button
                key={ill.id}
                onClick={() => handleIllnessTap(ill)}
                className="bg-white rounded-2xl p-4 shadow-sm border-2 flex flex-col items-center gap-2 active:scale-95 transition-all"
                style={{ borderColor: ep ? ill.color : 'transparent', borderWidth: ep ? 2 : 0 }}
              >
                <div className="relative">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm"
                    style={{ backgroundColor: ill.color + '20' }}
                  >
                    {ill.emoji}
                  </div>
                  {ep && (
                    <span
                      className="absolute -top-1 -right-1 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: ill.color }}
                    >
                      In corso
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-700 text-center">{ill.name}</span>
                {ep && intensity && (
                  <IntensityDots intensity={intensity} color={activeColor} />
                )}
                {!ep && <span className="text-xs text-slate-400">Tocca per iniziare</span>}
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
          onSaved={load}
        />
      )}

      {selectedIllness && (
        <IllnessEpisodeModal
          illness={selectedIllness}
          activeEpisode={activeEpisodeForIllness(selectedIllness.id)}
          onClose={() => setSelectedIllness(null)}
          onAction={load}
        />
      )}
    </div>
  )
}
