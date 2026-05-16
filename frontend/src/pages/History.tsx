import { useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import { useUser } from '../contexts/UserContext'
import type { MedicationLog, IllnessLog } from '../types'
import CalendarView from '../components/CalendarView'
import { format, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'

export default function History() {
  const { currentUser } = useUser()
  const [medLogs, setMedLogs] = useState<MedicationLog[]>([])
  const [illLogs, setIllLogs] = useState<IllnessLog[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [tab, setTab] = useState<'cal' | 'list'>('cal')

  const load = useCallback(async () => {
    if (!currentUser) return
    const [ml, il] = await Promise.all([
      api.getMedicationLogs(currentUser.id),
      api.getIllnessLogs(currentUser.id),
    ])
    setMedLogs(ml)
    setIllLogs(il)
  }, [currentUser])

  useEffect(() => { load() }, [load])

  const dayMedLogs = selectedDay ? medLogs.filter(l => isSameDay(new Date(l.taken_at), selectedDay)) : []
  const dayIllLogs = selectedDay ? illLogs.filter(l => isSameDay(new Date(l.occurred_at), selectedDay)) : []

  const deleteML = async (id: number) => {
    await api.deleteMedicationLog(id)
    load()
  }
  const deleteIL = async (id: number) => {
    await api.deleteIllnessLog(id)
    load()
  }

  const recentAll = [
    ...medLogs.slice(0, 20).map(l => ({ ...l, type: 'med' as const, at: new Date(l.taken_at) })),
    ...illLogs.slice(0, 20).map(l => ({ ...l, type: 'ill' as const, at: new Date(l.occurred_at) })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 30)

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
          <CalendarView medLogs={medLogs} illLogs={illLogs} onDayClick={d => setSelectedDay(prev => prev && isSameDay(prev, d) ? null : d)} />
          {selectedDay && (dayMedLogs.length > 0 || dayIllLogs.length > 0) && (
            <div className="mt-4 bg-white rounded-2xl shadow-sm p-4">
              <h3 className="font-semibold text-slate-700 mb-3 capitalize">
                {format(selectedDay, 'd MMMM', { locale: it })}
              </h3>
              {dayMedLogs.map(l => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    <span>{l.medication.emoji}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-700">{l.medication.name}</div>
                      <div className="text-xs text-slate-400">{format(new Date(l.taken_at), 'HH:mm')}</div>
                    </div>
                  </div>
                  <button onClick={() => deleteML(l.id)} className="p-2 text-slate-300 hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              ))}
              {dayIllLogs.map(l => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    <span>{l.illness.emoji}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-700">{l.illness.name}</div>
                      <div className="text-xs text-slate-400">{format(new Date(l.occurred_at), 'HH:mm')}</div>
                    </div>
                  </div>
                  <button onClick={() => deleteIL(l.id)} className="p-2 text-slate-300 hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'list' && (
        <div className="space-y-2">
          {recentAll.map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: (item.type === 'med' ? item.medication.color : item.illness.color) + '20' }}
                >
                  {item.type === 'med' ? item.medication.emoji : item.illness.emoji}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700">
                    {item.type === 'med' ? item.medication.name : item.illness.name}
                  </div>
                  <div className="text-xs text-slate-400 capitalize">
                    {format(item.at, 'd MMM, HH:mm', { locale: it })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => item.type === 'med' ? deleteML(item.id) : deleteIL(item.id)}
                className="p-2 text-slate-300 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {recentAll.length === 0 && (
            <div className="text-center text-slate-400 py-12">Nessuna registrazione</div>
          )}
        </div>
      )}
    </div>
  )
}
