import { useState } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { X, Play, RefreshCw, StopCircle } from 'lucide-react'
import { api } from '../api'
import type { Illness, IllnessEpisode } from '../types'

const LEVELS = [
  { value: 1, label: 'Lieve', color: '#22c55e' },
  { value: 2, label: 'Moderata', color: '#84cc16' },
  { value: 3, label: 'Forte', color: '#eab308' },
  { value: 4, label: 'Molto forte', color: '#f97316' },
  { value: 5, label: 'Severa', color: '#ef4444' },
]

function IntensityDots({ intensity, color }: { intensity: number; color: string }) {
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: i <= intensity ? color : '#e2e8f0' }}
        />
      ))}
    </div>
  )
}

function IntensitySelector({ selected, onSelect }: { selected: number | null; onSelect: (v: number) => void }) {
  return (
    <div className="flex gap-2 justify-between">
      {LEVELS.map(l => (
        <button
          key={l.value}
          onClick={() => onSelect(l.value)}
          className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all"
          style={{
            borderColor: selected === l.value ? l.color : '#e2e8f0',
            backgroundColor: selected === l.value ? l.color + '18' : 'white',
          }}
        >
          <span className="text-lg font-bold" style={{ color: selected === l.value ? l.color : '#94a3b8' }}>
            {l.value}
          </span>
          <span className="text-[10px] font-medium text-slate-500 leading-tight text-center">{l.label}</span>
        </button>
      ))}
    </div>
  )
}

interface Props {
  illness: Illness
  activeEpisode: IllnessEpisode | null
  onClose: () => void
  onAction: () => void
}

export default function IllnessEpisodeModal({ illness, activeEpisode, onClose, onAction }: Props) {
  const [intensity, setIntensity] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const lastLog = activeEpisode ? activeEpisode.logs[activeEpisode.logs.length - 1] : null
  const lastIntensity = lastLog?.intensity ?? null
  const levelColor = lastIntensity ? LEVELS[lastIntensity - 1].color : illness.color

  const handleStart = async () => {
    if (!intensity || saving) return
    setSaving(true)
    try {
      await api.startIllnessEpisode(illness.id, intensity)
      onAction()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!intensity || !activeEpisode || saving) return
    setSaving(true)
    try {
      await api.addEpisodeIntensityLog(activeEpisode.id, intensity)
      onAction()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleEnd = async () => {
    if (!activeEpisode || saving) return
    setSaving(true)
    try {
      await api.endIllnessEpisode(activeEpisode.id)
      onAction()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-10" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: illness.color + '20' }}
            >
              {illness.emoji}
            </div>
            <div>
              <p className="font-semibold text-slate-800">{illness.name}</p>
              {activeEpisode ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: illness.color }}>
                    In corso
                  </span>
                  <span className="text-xs text-slate-400">
                    dal {format(new Date(activeEpisode.started_at), 'd MMM, HH:mm', { locale: it })}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Nessun episodio attivo</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
            <X size={20} />
          </button>
        </div>

        {activeEpisode ? (
          <>
            {/* Active episode: show intensity history */}
            {activeEpisode.logs.length > 0 && (
              <div className="mb-4 bg-slate-50 rounded-2xl p-3">
                <p className="text-xs font-medium text-slate-500 mb-2">Storico intensità</p>
                <div className="space-y-1.5">
                  {activeEpisode.logs.map(log => (
                    <div key={log.id} className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {format(new Date(log.occurred_at), 'd MMM, HH:mm', { locale: it })}
                      </span>
                      {log.intensity != null && (
                        <div className="flex items-center gap-2">
                          <IntensityDots intensity={log.intensity} color={LEVELS[log.intensity - 1].color} />
                          <span className="text-xs font-medium" style={{ color: LEVELS[log.intensity - 1].color }}>
                            {LEVELS[log.intensity - 1].label}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Update intensity */}
            <p className="text-xs font-medium text-slate-500 mb-2">Aggiorna intensità</p>
            <IntensitySelector selected={intensity} onSelect={setIntensity} />

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleUpdate}
                disabled={!intensity || saving}
                className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
                style={{ backgroundColor: illness.color + '18', color: illness.color }}
              >
                <RefreshCw size={16} />
                Aggiorna
              </button>
              <button
                onClick={handleEnd}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-red-50 text-red-500 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
              >
                <StopCircle size={16} />
                Fine malattia
              </button>
            </div>
          </>
        ) : (
          <>
            {/* No active episode: start new one */}
            <p className="text-xs font-medium text-slate-500 mb-2">Intensità iniziale</p>
            <IntensitySelector selected={intensity} onSelect={setIntensity} />

            <button
              onClick={handleStart}
              disabled={!intensity || saving}
              className="w-full mt-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              <Play size={16} />
              Inizia malattia
            </button>
          </>
        )}
      </div>
    </div>
  )
}
