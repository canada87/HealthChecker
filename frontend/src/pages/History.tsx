import { useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import { useUser } from '../contexts/UserContext'
import type { MedicationLog, IllnessLog, Medication, Illness, IllnessEpisode } from '../types'
import CalendarView from '../components/CalendarView'
import LogPastModal from '../components/LogPastModal'
import EditLogModal from '../components/EditLogModal'
import { format, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { Trash2, Plus, Pencil, Clock } from 'lucide-react'

const LEVEL_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444']
const LEVEL_LABELS = ['Lieve', 'Moderata', 'Forte', 'Molto forte', 'Severa']

interface EditTarget {
  logId: number
  type: 'med' | 'ill'
  name: string
  emoji: string
  color: string
  at: Date
}

function IntensityDots({ intensity }: { intensity: number }) {
  const color = LEVEL_COLORS[intensity - 1]
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: i <= intensity ? color : '#e2e8f0' }} />
      ))}
      <span className="text-xs ml-1" style={{ color }}>{LEVEL_LABELS[intensity - 1]}</span>
    </div>
  )
}

function EpisodeDuration({ started_at, ended_at }: { started_at: string; ended_at: string | null }) {
  if (!ended_at) return <span className="text-xs font-medium text-amber-500">In corso</span>
  const ms = new Date(ended_at).getTime() - new Date(started_at).getTime()
  const mins = Math.floor(ms / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  let text = ''
  if (days > 0) text = `${days}g ${hrs % 24}h`
  else if (hrs > 0) text = `${hrs}h ${mins % 60}m`
  else text = `${mins > 0 ? mins + 'm' : '< 1m'}`
  return <span className="text-xs text-slate-400">{text}</span>
}

export default function History() {
  const { currentUser } = useUser()
  const [medLogs, setMedLogs] = useState<MedicationLog[]>([])
  const [illLogs, setIllLogs] = useState<IllnessLog[]>([])
  const [illEpisodes, setIllEpisodes] = useState<IllnessEpisode[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [illnesses, setIllnesses] = useState<Illness[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [tab, setTab] = useState<'cal' | 'list'>('cal')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [listFilter, setListFilter] = useState<{ type: 'med' | 'ill' | 'episode'; id: number } | null>(null)

  const load = useCallback(async () => {
    if (!currentUser) return
    const [ml, il, eps, meds, ills] = await Promise.all([
      api.getMedicationLogs(currentUser.id),
      api.getIllnessLogs(currentUser.id),
      api.getIllnessEpisodes(currentUser.id),
      api.getMedications(currentUser.id),
      api.getIllnesses(currentUser.id),
    ])
    setMedLogs(ml)
    setIllLogs(il)
    setIllEpisodes(eps)
    setMedications(meds)
    setIllnesses(ills)
  }, [currentUser])

  useEffect(() => { load() }, [load])

  // Calendar: compute synthetic ill dates from episodes + legacy logs
  const illCalendarDots = [
    ...illLogs.filter(l => !l.episode_id).map(l => ({ occurred_at: l.occurred_at, illness: l.illness })),
    ...illEpisodes.map(ep => ({ occurred_at: ep.started_at, illness: ep.illness })),
    ...illEpisodes.filter(ep => ep.ended_at).map(ep => ({ occurred_at: ep.ended_at!, illness: ep.illness })),
  ]

  const dayMedLogs = selectedDay ? medLogs.filter(l => isSameDay(new Date(l.taken_at), selectedDay)) : []
  const dayIllLogs = selectedDay ? illLogs.filter(l => !l.episode_id && isSameDay(new Date(l.occurred_at), selectedDay)) : []
  const dayEpStarts = selectedDay ? illEpisodes.filter(ep => isSameDay(new Date(ep.started_at), selectedDay)) : []
  const dayEpEnds = selectedDay ? illEpisodes.filter(ep => ep.ended_at && isSameDay(new Date(ep.ended_at), selectedDay)) : []

  const deleteML = async (id: number) => { await api.deleteMedicationLog(id); load() }
  const deleteIL = async (id: number) => { await api.deleteIllnessLog(id); load() }
  const deleteEp = async (id: number) => { await api.deleteIllnessEpisode(id); load() }

  // List view items
  const legacyIllLogs = illLogs.filter(l => !l.episode_id)

  const recentAll = [
    ...medLogs.map(l => ({ kind: 'med' as const, id: l.id, at: new Date(l.taken_at), data: l })),
    ...legacyIllLogs.map(l => ({ kind: 'ill' as const, id: l.id, at: new Date(l.occurred_at), data: l })),
    ...illEpisodes.map(ep => ({ kind: 'episode' as const, id: ep.id, at: new Date(ep.started_at), data: ep })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .filter(item => {
      if (!listFilter) return true
      if (listFilter.type === 'med' && item.kind === 'med') {
        return (item.data as MedicationLog).medication_id === listFilter.id
      }
      if (listFilter.type === 'ill' && item.kind === 'ill') {
        return (item.data as IllnessLog).illness_id === listFilter.id
      }
      if (listFilter.type === 'episode') {
        if (item.kind === 'episode') return (item.data as IllnessEpisode).illness_id === listFilter.id
        if (item.kind === 'ill') return (item.data as IllnessLog).illness_id === listFilter.id
        return false
      }
      return false
    })
    .slice(0, 50)

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">Storico</h1>

      <div className="flex bg-slate-100 rounded-xl p-1 mb-4">
        {(['cal', 'list'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            {t === 'cal' ? 'Calendario' : 'Lista'}
          </button>
        ))}
      </div>

      {tab === 'cal' && (
        <>
          <CalendarView
            medLogs={medLogs}
            illLogs={illCalendarDots}
            onDayClick={d => setSelectedDay(prev => prev && isSameDay(prev, d) ? null : d)}
          />
          {selectedDay && (
            <div className="mt-4 bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700 capitalize">
                  {format(selectedDay, 'd MMMM', { locale: it })}
                </h3>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1 text-sm text-indigo-600 font-medium hover:text-indigo-700"
                >
                  <Plus size={16} /> Aggiungi
                </button>
              </div>

              {/* Medication logs */}
              {dayMedLogs.map(l => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    <span>{l.medication.emoji}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-700">{l.medication.name}</div>
                      <div className="text-xs text-slate-400">{format(new Date(l.taken_at), 'HH:mm')}</div>
                    </div>
                  </div>
                  <div className="flex">
                    <button onClick={() => setEditTarget({ logId: l.id, type: 'med', name: l.medication.name, emoji: l.medication.emoji, color: l.medication.color, at: new Date(l.taken_at) })} className="p-2 text-slate-300 hover:text-indigo-400"><Pencil size={15} /></button>
                    <button onClick={() => deleteML(l.id)} className="p-2 text-slate-300 hover:text-red-400"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}

              {/* Legacy illness logs */}
              {dayIllLogs.map(l => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    <span>{l.illness.emoji}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-700">{l.illness.name}</div>
                      <div className="text-xs text-slate-400">{format(new Date(l.occurred_at), 'HH:mm')}</div>
                    </div>
                  </div>
                  <div className="flex">
                    <button onClick={() => setEditTarget({ logId: l.id, type: 'ill', name: l.illness.name, emoji: l.illness.emoji, color: l.illness.color, at: new Date(l.occurred_at) })} className="p-2 text-slate-300 hover:text-indigo-400"><Pencil size={15} /></button>
                    <button onClick={() => deleteIL(l.id)} className="p-2 text-slate-300 hover:text-red-400"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}

              {/* Episode starts on this day */}
              {dayEpStarts.map(ep => (
                <div key={`ep-start-${ep.id}`} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    <span>{ep.illness.emoji}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-700">{ep.illness.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">Inizio {format(new Date(ep.started_at), 'HH:mm')}</span>
                        {ep.logs[0]?.intensity && <IntensityDots intensity={ep.logs[0].intensity} />}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteEp(ep.id)} className="p-2 text-slate-300 hover:text-red-400"><Trash2 size={15} /></button>
                </div>
              ))}

              {/* Episode ends on this day (that started on a different day) */}
              {dayEpEnds
                .filter(ep => !isSameDay(new Date(ep.started_at), selectedDay))
                .map(ep => (
                  <div key={`ep-end-${ep.id}`} className="flex items-center justify-between py-2 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <span>{ep.illness.emoji}</span>
                      <div>
                        <div className="text-sm font-medium text-slate-700">{ep.illness.name}</div>
                        <div className="text-xs text-slate-400">Fine {format(new Date(ep.ended_at!), 'HH:mm')}</div>
                      </div>
                    </div>
                    <Clock size={15} className="text-slate-300 mr-2" />
                  </div>
                ))}

              {dayMedLogs.length === 0 && dayIllLogs.length === 0 && dayEpStarts.length === 0 && dayEpEnds.filter(ep => !isSameDay(new Date(ep.started_at), selectedDay)).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-2">Nessuna registrazione</p>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'list' && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-1 -mx-4 px-4 scrollbar-hide">
            <button
              onClick={() => setListFilter(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                !listFilter ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              Tutti
            </button>
            {medications.map(m => {
              const active = listFilter?.type === 'med' && listFilter.id === m.id
              return (
                <button
                  key={`med-${m.id}`}
                  onClick={() => setListFilter(active ? null : { type: 'med', id: m.id })}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                  style={{ backgroundColor: active ? m.color : 'white', borderColor: active ? m.color : '#e2e8f0', color: active ? 'white' : '#64748b' }}
                >
                  <span>{m.emoji}</span>{m.name}
                </button>
              )
            })}
            {illnesses.map(ill => {
              const active = listFilter?.type === 'episode' && listFilter.id === ill.id
              return (
                <button
                  key={`ill-${ill.id}`}
                  onClick={() => setListFilter(active ? null : { type: 'episode', id: ill.id })}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                  style={{ backgroundColor: active ? ill.color : 'white', borderColor: active ? ill.color : '#e2e8f0', color: active ? 'white' : '#64748b' }}
                >
                  <span>{ill.emoji}</span>{ill.name}
                </button>
              )
            })}
          </div>

          <div className="space-y-2">
            {recentAll.map((item, i) => {
              if (item.kind === 'med') {
                const l = item.data as MedicationLog
                return (
                  <div key={`med-${l.id}`} className="bg-white rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: l.medication.color + '20' }}>
                        {l.medication.emoji}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-700">{l.medication.name}</div>
                        <div className="text-xs text-slate-400 capitalize">{format(new Date(l.taken_at), 'd MMM, HH:mm', { locale: it })}</div>
                      </div>
                    </div>
                    <div className="flex">
                      <button onClick={() => setEditTarget({ logId: l.id, type: 'med', name: l.medication.name, emoji: l.medication.emoji, color: l.medication.color, at: new Date(l.taken_at) })} className="p-2 text-slate-300 hover:text-indigo-400"><Pencil size={15} /></button>
                      <button onClick={() => deleteML(l.id)} className="p-2 text-slate-300 hover:text-red-400"><Trash2 size={15} /></button>
                    </div>
                  </div>
                )
              }

              if (item.kind === 'ill') {
                const l = item.data as IllnessLog
                return (
                  <div key={`ill-${l.id}`} className="bg-white rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: l.illness.color + '20' }}>
                        {l.illness.emoji}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-700">{l.illness.name}</div>
                        <div className="text-xs text-slate-400 capitalize">{format(new Date(l.occurred_at), 'd MMM, HH:mm', { locale: it })}</div>
                      </div>
                    </div>
                    <div className="flex">
                      <button onClick={() => setEditTarget({ logId: l.id, type: 'ill', name: l.illness.name, emoji: l.illness.emoji, color: l.illness.color, at: new Date(l.occurred_at) })} className="p-2 text-slate-300 hover:text-indigo-400"><Pencil size={15} /></button>
                      <button onClick={() => deleteIL(l.id)} className="p-2 text-slate-300 hover:text-red-400"><Trash2 size={15} /></button>
                    </div>
                  </div>
                )
              }

              if (item.kind === 'episode') {
                const ep = item.data as IllnessEpisode
                const lastLog = ep.logs[ep.logs.length - 1]
                const intensity = lastLog?.intensity
                const color = intensity ? LEVEL_COLORS[intensity - 1] : ep.illness.color
                return (
                  <div key={`ep-${ep.id}`} className="bg-white rounded-xl p-3 shadow-sm border-l-4" style={{ borderLeftColor: ep.illness.color }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: ep.illness.color + '20' }}>
                          {ep.illness.emoji}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-700">{ep.illness.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-slate-400">
                              {format(new Date(ep.started_at), 'd MMM, HH:mm', { locale: it })}
                            </span>
                            <span className="text-slate-300">→</span>
                            {ep.ended_at
                              ? <span className="text-xs text-slate-400">{format(new Date(ep.ended_at), 'd MMM, HH:mm', { locale: it })}</span>
                              : <span className="text-xs font-semibold text-amber-500">In corso</span>
                            }
                          </div>
                        </div>
                      </div>
                      <button onClick={() => deleteEp(ep.id)} className="p-2 text-slate-300 hover:text-red-400"><Trash2 size={15} /></button>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <EpisodeDuration started_at={ep.started_at} ended_at={ep.ended_at} />
                      {intensity && <IntensityDots intensity={intensity} />}
                    </div>
                    {ep.logs.length > 1 && (
                      <div className="mt-2 pt-2 border-t border-slate-50 space-y-1">
                        {ep.logs.map(log => (
                          <div key={log.id} className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">{format(new Date(log.occurred_at), 'd MMM, HH:mm', { locale: it })}</span>
                            {log.intensity && <IntensityDots intensity={log.intensity} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              return null
            })}
            {recentAll.length === 0 && (
              <div className="text-center text-slate-400 py-12">Nessuna registrazione</div>
            )}
          </div>
        </>
      )}

      {showModal && selectedDay && (
        <LogPastModal
          medications={medications}
          illnesses={illnesses}
          defaultDate={selectedDay}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}

      {editTarget && (
        <EditLogModal
          logId={editTarget.logId}
          type={editTarget.type}
          name={editTarget.name}
          emoji={editTarget.emoji}
          color={editTarget.color}
          currentAt={editTarget.at}
          onClose={() => setEditTarget(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
