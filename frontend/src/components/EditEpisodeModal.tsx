import { useState } from 'react'
import { format } from 'date-fns'
import { X, Check, Trash2 } from 'lucide-react'
import { api } from '../api'
import type { IllnessEpisode } from '../types'

const LEVELS = [
  { value: 1, label: 'Lieve', color: '#22c55e' },
  { value: 2, label: 'Moderata', color: '#84cc16' },
  { value: 3, label: 'Forte', color: '#eab308' },
  { value: 4, label: 'Molto forte', color: '#f97316' },
  { value: 5, label: 'Severa', color: '#ef4444' },
]

interface LogState {
  id: number
  date: string
  time: string
  intensity: number | null
}

function splitDateTime(isoStr: string): { date: string; time: string } {
  const d = new Date(isoStr)
  return { date: format(d, 'yyyy-MM-dd'), time: format(d, 'HH:mm') }
}

interface Props {
  episode: IllnessEpisode
  onClose: () => void
  onSaved: () => void
}

export default function EditEpisodeModal({ episode, onClose, onSaved }: Props) {
  const initStart = splitDateTime(episode.started_at)
  const [startDate, setStartDate] = useState(initStart.date)
  const [startTime, setStartTime] = useState(initStart.time)

  const initEnd = episode.ended_at ? splitDateTime(episode.ended_at) : null
  const [endDate, setEndDate] = useState(initEnd?.date ?? '')
  const [endTime, setEndTime] = useState(initEnd?.time ?? '')

  const [logs, setLogs] = useState<LogState[]>(
    episode.logs.map(l => ({ id: l.id, ...splitDateTime(l.occurred_at), intensity: l.intensity }))
  )

  const [saving, setSaving] = useState(false)

  const updateLogField = (id: number, field: keyof Omit<LogState, 'id'>, value: string | number | null) => {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  const removeLog = (id: number) => {
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const started_at = new Date(`${startDate}T${startTime}:00`).toISOString()
      const ended_at = episode.ended_at && endDate && endTime
        ? new Date(`${endDate}T${endTime}:00`).toISOString()
        : undefined
      await api.updateIllnessEpisode(episode.id, { started_at, ...(ended_at !== undefined ? { ended_at } : {}) })

      const originalIds = new Set(episode.logs.map(l => l.id))
      const remainingIds = new Set(logs.map(l => l.id))
      const deletedIds = [...originalIds].filter(id => !remainingIds.has(id))

      await Promise.all(deletedIds.map(id => api.deleteEpisodeLog(id)))
      await Promise.all(logs.map(l =>
        api.updateEpisodeLog(l.id, {
          occurred_at: new Date(`${l.date}T${l.time}:00`).toISOString(),
          ...(l.intensity !== null ? { intensity: l.intensity } : {}),
        })
      ))

      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-10 overflow-y-auto"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: episode.illness.color + '20' }}
            >
              {episode.illness.emoji}
            </div>
            <div>
              <p className="text-xs text-slate-400">Modifica episodio</p>
              <p className="font-semibold text-slate-800">{episode.illness.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-xs font-medium text-slate-500 mb-1.5">Inizio episodio</p>
          <div className="flex gap-2">
            <input
              type="date" value={startDate} max={today}
              onChange={e => setStartDate(e.target.value)}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <input
              type="time" value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        {episode.ended_at && (
          <div className="mb-4">
            <p className="text-xs font-medium text-slate-500 mb-1.5">Fine episodio</p>
            <div className="flex gap-2">
              <input
                type="date" value={endDate} max={today}
                onChange={e => setEndDate(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <input
                type="time" value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-medium text-slate-500 mb-2">Registrazioni intensità</p>
            <div className="space-y-3">
              {logs.map((log, idx) => (
                <div key={log.id} className="bg-slate-50 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">
                      {idx === 0 ? 'Registrazione iniziale' : `Aggiornamento ${idx}`}
                    </span>
                    {logs.length > 1 && (
                      <button onClick={() => removeLog(log.id)} className="p-1 text-slate-300 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="date" value={log.date} max={today}
                      onChange={e => updateLogField(log.id, 'date', e.target.value)}
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <input
                      type="time" value={log.time}
                      onChange={e => updateLogField(log.id, 'time', e.target.value)}
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div className="flex gap-1">
                    {LEVELS.map(l => (
                      <button
                        key={l.value}
                        onClick={() => updateLogField(log.id, 'intensity', l.value)}
                        className="flex-1 py-1.5 rounded-lg border-2 text-xs font-bold transition-all"
                        style={{
                          borderColor: log.intensity === l.value ? l.color : '#e2e8f0',
                          backgroundColor: log.intensity === l.value ? l.color + '18' : 'white',
                          color: log.intensity === l.value ? l.color : '#94a3b8',
                        }}
                      >
                        {l.value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          <Check size={18} />
          Salva modifiche
        </button>
      </div>
    </div>
  )
}
