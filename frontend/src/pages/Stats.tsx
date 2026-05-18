import { useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import { useUser } from '../contexts/UserContext'
import type { StatItem } from '../types'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

const STORAGE_KEY = 'freqWindowYears'
const DEFAULT_WINDOW_YEARS = 2

function getWindowDays(): number {
  const stored = localStorage.getItem(STORAGE_KEY)
  const years = stored ? parseFloat(stored) : DEFAULT_WINDOW_YEARS
  return Math.round(years * 365)
}

function formatFrequency(days: number | null): string {
  if (days === null) return '—'
  if (days < 1) return `ogni ${(days * 24).toFixed(1)} ore`
  if (days < 7) return `ogni ${days.toFixed(1)} gg`
  if (days < 30) return `ogni ${(days / 7).toFixed(1)} sett`
  if (days < 365) return `ogni ${(days / 30.44).toFixed(1)} mesi`
  return `ogni ${(days / 365).toFixed(1)} anni`
}

function StatCard({ item }: { item: StatItem }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: item.color + '20' }}
        >
          {item.emoji}
        </div>
        <div>
          <div className="font-bold text-slate-800">{item.name}</div>
          <div className="text-xs text-slate-400">
            {item.last_at
              ? `Ultima volta ${formatDistanceToNow(new Date(item.last_at), { addSuffix: true, locale: it })}`
              : 'Mai registrato'}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        {[
          { label: '7 giorni', val: item.count_7d, isNumber: true },
          { label: '30 giorni', val: item.count_30d, isNumber: true },
          { label: 'Totale', val: item.count_total, isNumber: true },
          { label: 'Frequenza media', val: item.avg_frequency_days, isNumber: false },
        ].map(({ label, val, isNumber }) => (
          <div key={label} className="bg-slate-50 rounded-xl py-2">
            <div className="text-xl font-bold" style={{ color: item.color }}>
              {isNumber ? (val as number) : formatFrequency(val as number | null)}
            </div>
            <div className="text-xs text-slate-400">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Stats() {
  const { currentUser } = useUser()
  const [medStats, setMedStats] = useState<StatItem[]>([])
  const [illStats, setIllStats] = useState<StatItem[]>([])
  const [tab, setTab] = useState<'med' | 'ill'>('med')

  const load = useCallback(async () => {
    if (!currentUser) return
    const windowDays = getWindowDays()
    const [ms, is] = await Promise.all([
      api.getMedicationStats(currentUser.id, windowDays),
      api.getIllnessStats(currentUser.id, windowDays),
    ])
    setMedStats(ms)
    setIllStats(is)
  }, [currentUser])

  useEffect(() => { load() }, [load])

  const items = tab === 'med' ? medStats : illStats

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">Statistiche</h1>

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

      <div className="space-y-3">
        {items.map(item => <StatCard key={item.id} item={item} />)}
        {items.length === 0 && (
          <div className="text-center text-slate-400 py-12">
            Nessun dato disponibile
          </div>
        )}
      </div>
    </div>
  )
}
