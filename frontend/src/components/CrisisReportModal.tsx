import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, addMonths, format } from 'date-fns'
import { X, FileText } from 'lucide-react'
import useEscapeKey from './useEscapeKey'

const PRESETS = [
  { label: '30 giorni', from: () => addDays(new Date(), -29) },
  { label: '3 mesi', from: () => addMonths(new Date(), -3) },
  { label: '6 mesi', from: () => addMonths(new Date(), -6) },
  { label: '1 anno', from: () => addMonths(new Date(), -12) },
]

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

export default function CrisisReportModal({ onClose }: { onClose: () => void }) {
  useEscapeKey(onClose)
  const navigate = useNavigate()
  const today = ymd(new Date())
  const [from, setFrom] = useState(ymd(PRESETS[0].from()))
  const [to, setTo] = useState(today)
  const valid = !!from && !!to && from <= to

  const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center lg:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Report crisi"
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-lg p-5 pb-10 lg:pb-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Report crisi</h2>
          <button onClick={onClose} aria-label="Chiudi" title="Chiudi (Esc)" className="p-2 text-slate-500 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          {PRESETS.map(p => {
            const active = from === ymd(p.from()) && to === today
            return (
              <button
                key={p.label}
                onClick={() => { setFrom(ymd(p.from())); setTo(today) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        <div className="flex gap-3 mb-5">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Dal</label>
            <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className={inputCls} />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Al</label>
            <input type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)} className={inputCls} />
          </div>
        </div>

        <button
          onClick={() => navigate(`/crises/report?from=${from}&to=${to}`)}
          disabled={!valid}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          <FileText size={16} />
          Genera report
        </button>
      </div>
    </div>
  )
}
