import { useState } from 'react'
import { format } from 'date-fns'
import { X, Check } from 'lucide-react'
import useEscapeKey from './useEscapeKey'
import DeleteButton from './DeleteButton'
import { api } from '../api'
import { useUser } from '../contexts/UserContext'
import type { Crisis, CrisisCategory } from '../types'
import { LEVELS } from '../levels'
import { durationMinutes } from '../crisis'

const QUICK_DURATIONS = [5, 10, 15, 30, 60]
const DEFAULT_DURATION = 10

interface Props {
  // Existing crisis to complete or edit; null to register a new past crisis.
  crisis: Crisis | null
  categories: CrisisCategory[]
  onClose: () => void
  onSaved: () => void
}

function TextArea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 mb-1.5 block">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
    </div>
  )
}

export default function CrisisModal({ crisis, categories, onClose, onSaved }: Props) {
  useEscapeKey(onClose)
  const { currentUser } = useUser()
  const start = crisis ? new Date(crisis.started_at) : new Date(Date.now() - DEFAULT_DURATION * 60000)
  const initialDuration = crisis ? durationMinutes(crisis) : DEFAULT_DURATION
  const [initial] = useState(() => ({
    date: format(start, 'yyyy-MM-dd'),
    time: format(start, 'HH:mm'),
    duration: initialDuration !== null ? String(Math.max(1, Math.round(initialDuration))) : '',
  }))
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const [duration, setDuration] = useState(initial.duration)
  const [categoryId, setCategoryId] = useState<number | null>(crisis?.category_id ?? null)
  const [intensity, setIntensity] = useState<number | null>(crisis?.intensity ?? null)
  const [description, setDescription] = useState(crisis?.description ?? '')
  const [trigger, setTrigger] = useState(crisis?.trigger ?? '')
  const [whatHelped, setWhatHelped] = useState(crisis?.what_helped ?? '')
  const [saving, setSaving] = useState(false)

  const minutes = Number(duration)
  const valid = !!intensity && duration !== '' && minutes > 0

  const handleSave = async () => {
    if (!currentUser || !valid || saving) return
    setSaving(true)
    try {
      // Keep the timer's exact times unless the user edited them
      const startUnchanged = !!crisis && date === initial.date && time === initial.time
      const startedAt = startUnchanged ? new Date(crisis.started_at) : new Date(`${date}T${time}:00`)
      const endedAt = startUnchanged && duration === initial.duration && crisis.ended_at
        ? new Date(crisis.ended_at)
        : new Date(startedAt.getTime() + minutes * 60000)
      const data = {
        category_id: categoryId,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        intensity,
        description: description.trim() || null,
        trigger: trigger.trim() || null,
        what_helped: whatHelped.trim() || null,
      }
      if (crisis) await api.updateCrisis(crisis.id, data)
      else await api.createCrisis(currentUser.id, data)
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!crisis) return
    await api.deleteCrisis(crisis.id)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center lg:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dettagli crisi"
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 pb-10 lg:pb-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">{crisis ? 'Dettagli crisi' : 'Registra crisi passata'}</h2>
          <div className="flex items-center gap-1">
            {crisis && <DeleteButton onConfirm={handleDelete} label="Elimina crisi" size={18} />}
            <button onClick={onClose} aria-label="Chiudi" title="Chiudi (Esc)" className="p-2 text-slate-500 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Data</label>
              <input
                type="date"
                value={date}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Ora inizio</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Durata (minuti)</label>
            <div className="flex gap-2 flex-wrap items-center">
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {QUICK_DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(String(d))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    minutes === d ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">Intensità</p>
            <div className="flex gap-2 justify-between">
              {LEVELS.map(l => (
                <button
                  key={l.value}
                  onClick={() => setIntensity(l.value)}
                  aria-pressed={intensity === l.value}
                  className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all hover:shadow-md"
                  style={{
                    borderColor: intensity === l.value ? l.color : '#e2e8f0',
                    backgroundColor: intensity === l.value ? l.color + '18' : 'white',
                  }}
                >
                  <span className="text-lg font-bold" style={{ color: intensity === l.value ? l.color : '#64748b' }}>
                    {l.value}
                  </span>
                  <span className="text-xs font-medium text-slate-500 leading-tight text-center">{l.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">Categoria</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => {
                const selected = categoryId === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(selected ? null : cat.id)}
                    aria-pressed={selected}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-medium text-slate-700 transition-all"
                    style={{
                      borderColor: selected ? cat.color : '#e2e8f0',
                      backgroundColor: selected ? cat.color + '18' : 'white',
                    }}
                  >
                    <span aria-hidden="true">{cat.emoji}</span> {cat.name}
                  </button>
                )
              })}
              {categories.length === 0 && (
                <p className="text-xs text-slate-500">Aggiungi categorie nelle impostazioni</p>
              )}
            </div>
          </div>

          <TextArea label="Descrizione" value={description} onChange={setDescription} placeholder="Cosa è successo..." />
          <TextArea label="Fattore scatenante (facoltativo)" value={trigger} onChange={setTrigger} placeholder="Cosa è successo prima..." />
          <TextArea label="Cosa ha aiutato a calmarlo (facoltativo)" value={whatHelped} onChange={setWhatHelped} placeholder="Abbraccio, uscire, pausa..." />
        </div>

        <button
          onClick={handleSave}
          disabled={!valid || saving}
          className="w-full mt-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          <Check size={16} />
          Salva
        </button>
        {!valid && (
          <p className="text-xs text-slate-500 text-center mt-2">Indica intensità e durata per salvare</p>
        )}
      </div>
    </div>
  )
}
