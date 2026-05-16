import { useState } from 'react'
import { format } from 'date-fns'
import { api } from '../api'
import { X, Check } from 'lucide-react'

interface Props {
  logId: number
  type: 'med' | 'ill'
  name: string
  emoji: string
  color: string
  currentAt: Date
  onClose: () => void
  onSaved: () => void
}

export default function EditLogModal({ logId, type, name, emoji, color, currentAt, onClose, onSaved }: Props) {
  const [date, setDate] = useState(format(currentAt, 'yyyy-MM-dd'))
  const [time, setTime] = useState(format(currentAt, 'HH:mm'))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const takenAt = new Date(`${date}T${time}:00`).toISOString()
      if (type === 'med') {
        await api.updateMedicationLog(logId, takenAt)
      } else {
        await api.updateIllnessLog(logId, takenAt)
      }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: color + '20' }}
            >
              {emoji}
            </div>
            <div>
              <p className="text-xs text-slate-400">Modifica data</p>
              <p className="font-semibold text-slate-800">{name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-3 mb-6">
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

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          <Check size={18} />
          Salva modifica
        </button>
      </div>
    </div>
  )
}
