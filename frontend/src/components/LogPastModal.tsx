import { useState } from 'react'
import { format } from 'date-fns'
import { api } from '../api'
import type { Medication, Illness } from '../types'
import { X } from 'lucide-react'

const LEVELS = [
  { value: 1, label: 'Lieve', color: '#22c55e' },
  { value: 2, label: 'Moderata', color: '#84cc16' },
  { value: 3, label: 'Forte', color: '#eab308' },
  { value: 4, label: 'Molto forte', color: '#f97316' },
  { value: 5, label: 'Severa', color: '#ef4444' },
]

interface Props {
  medications: Medication[]
  illnesses: Illness[]
  defaultDate?: Date
  onClose: () => void
  onSaved: () => void
}

export default function LogPastModal({ medications, illnesses, defaultDate, onClose, onSaved }: Props) {
  const ref = defaultDate ?? new Date()
  const [date, setDate] = useState(format(ref, 'yyyy-MM-dd'))
  const [time, setTime] = useState(format(ref, 'HH:mm'))
  const [tab, setTab] = useState<'med' | 'ill'>('med')
  const [illIntensity, setIllIntensity] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const handleLog = async (item: Medication | Illness) => {
    if (saving) return
    if (tab === 'ill' && !illIntensity) return
    setSaving(true)
    try {
      const takenAt = new Date(`${date}T${time}:00`).toISOString()
      if (tab === 'med') {
        await api.logMedication(item.id, undefined, takenAt)
      } else {
        await api.startIllnessEpisode(item.id, illIntensity!, undefined, takenAt)
      }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const items = tab === 'med' ? medications : illnesses

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Registra nel passato</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-3 mb-4">
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
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Ora</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        <div className="flex bg-slate-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => setTab('med')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'med' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            💊 Farmaci
          </button>
          <button
            onClick={() => setTab('ill')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'ill' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            🤒 Malattie
          </button>
        </div>

        {tab === 'ill' && (
          <div className="mb-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Intensità iniziale</p>
            <div className="flex gap-2 justify-between">
              {LEVELS.map(l => (
                <button
                  key={l.value}
                  onClick={() => setIllIntensity(l.value)}
                  className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all"
                  style={{
                    borderColor: illIntensity === l.value ? l.color : '#e2e8f0',
                    backgroundColor: illIntensity === l.value ? l.color + '18' : 'white',
                  }}
                >
                  <span className="text-base font-bold" style={{ color: illIntensity === l.value ? l.color : '#94a3b8' }}>
                    {l.value}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 leading-tight text-center">{l.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => handleLog(item)}
              disabled={saving || (tab === 'ill' && !illIntensity)}
              className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3 active:scale-95 transition-all shadow-sm disabled:opacity-40 text-left"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: item.color + '20' }}
              >
                {item.emoji}
              </div>
              <span className="text-sm font-medium text-slate-700 leading-tight">{item.name}</span>
            </button>
          ))}
          {items.length === 0 && (
            <p className="col-span-2 text-center text-slate-400 text-sm py-4">
              Nessun elemento. Aggiungine nelle impostazioni.
            </p>
          )}
        </div>
        {tab === 'ill' && !illIntensity && items.length > 0 && (
          <p className="text-xs text-slate-400 text-center mt-2">Seleziona un'intensità per continuare</p>
        )}
      </div>
    </div>
  )
}
