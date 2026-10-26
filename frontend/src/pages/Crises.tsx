import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Zap, CalendarDays, StopCircle, Plus, Pencil, Check, X, List, TrendingDown, Repeat } from 'lucide-react'
import { api } from '../api'
import { useUser } from '../contexts/UserContext'
import { useToast } from '../contexts/ToastContext'
import type { Crisis, CrisisCategory, HabitChange } from '../types'
import { LEVELS } from '../levels'
import { durationMinutes, formatDuration, formatElapsed } from '../crisis'
import CrisisModal from '../components/CrisisModal'
import CrisisTrend from '../components/CrisisTrend'
import DeleteButton from '../components/DeleteButton'

type Tab = 'log' | 'trend' | 'changes'

const TABS: { key: Tab; label: string; icon: typeof List }[] = [
  { key: 'log', label: 'Registro', icon: List },
  { key: 'trend', label: 'Andamento', icon: TrendingDown },
  { key: 'changes', label: 'Cambiamenti', icon: Repeat },
]

function IntensityDots({ intensity }: { intensity: number }) {
  const color = LEVELS[intensity - 1].color
  return (
    <div className="flex gap-0.5" title={LEVELS[intensity - 1].label}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: i <= intensity ? color : '#e2e8f0' }} />
      ))}
    </div>
  )
}

function ActiveCrisis({ crisis, onEnd, onCancel }: { crisis: Crisis; onEnd: () => void; onCancel: () => void }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 text-center">
      <p className="text-sm font-semibold text-red-700">Crisi in corso</p>
      <p className="text-xs text-red-700/80 mb-2">iniziata alle {format(new Date(crisis.started_at), 'HH:mm')}</p>
      <p className="text-5xl font-bold text-red-700 tabular-nums mb-4" aria-live="off">
        {formatElapsed(now - new Date(crisis.started_at).getTime())}
      </p>
      <button
        onClick={onEnd}
        className="w-full py-4 rounded-xl bg-red-600 text-white text-lg font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
      >
        <StopCircle size={22} /> Fine crisi
      </button>
      <button onClick={onCancel} className="mt-2 text-xs text-red-700 hover:underline px-2 py-1">
        Annulla (avviata per errore)
      </button>
    </div>
  )
}

function CrisisRow({ crisis, onClick }: { crisis: Crisis; onClick: () => void }) {
  const cat = crisis.category
  const incomplete = crisis.intensity == null
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl p-3 shadow-sm flex items-start gap-3 text-left hover:shadow-md transition-shadow"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ backgroundColor: (cat?.color ?? '#94a3b8') + '20' }}
      >
        {cat?.emoji ?? '⚡'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-slate-700 truncate">{cat?.name ?? 'Senza categoria'}</span>
          {crisis.intensity != null && <IntensityDots intensity={crisis.intensity} />}
        </div>
        <p className="text-xs text-slate-500">
          {format(new Date(crisis.started_at), 'EEE d MMM, HH:mm', { locale: it })} · {formatDuration(durationMinutes(crisis))}
        </p>
        {crisis.description && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{crisis.description}</p>}
        {incomplete && (
          <span className="inline-block mt-1 text-xs font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full">
            Da completare
          </span>
        )}
      </div>
    </button>
  )
}

function ChangeForm({ initial, onSave, onCancel }: {
  initial?: HabitChange
  onSave: (data: { started_at: string; title: string; description: string | null }) => Promise<void>
  onCancel: () => void
}) {
  const [date, setDate] = useState(initial ? format(new Date(initial.started_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')

  const save = () => {
    if (!title.trim()) return
    onSave({
      started_at: new Date(`${date}T00:00:00`).toISOString(),
      title: title.trim(),
      description: description.trim() || null,
    })
  }

  return (
    <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Es. niente tablet dopo cena"
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        autoFocus
      />
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Dal giorno</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Dettagli (facoltativo)"
        rows={2}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm flex items-center justify-center gap-1">
          <X size={16} /> Annulla
        </button>
        <button onClick={save} disabled={!title.trim()}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50">
          <Check size={16} /> Salva
        </button>
      </div>
    </div>
  )
}

export default function Crises() {
  const { currentUser } = useUser()
  const showToast = useToast()
  const [crises, setCrises] = useState<Crisis[]>([])
  const [categories, setCategories] = useState<CrisisCategory[]>([])
  const [changes, setChanges] = useState<HabitChange[]>([])
  const [tab, setTab] = useState<Tab>('log')
  // undefined = closed, null = new past crisis, Crisis = complete/edit
  const [editing, setEditing] = useState<Crisis | null | undefined>(undefined)
  const [addingChange, setAddingChange] = useState(false)
  const [editChange, setEditChange] = useState<HabitChange | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!currentUser) return
    const [cs, cats, chs] = await Promise.all([
      api.getCrises(currentUser.id),
      api.getCrisisCategories(currentUser.id),
      api.getHabitChanges(currentUser.id),
    ])
    setCrises(cs)
    setCategories(cats)
    setChanges(chs)
  }, [currentUser])

  useEffect(() => { load() }, [load])

  const active = crises.find(c => !c.ended_at) ?? null
  const finished = crises.filter(c => c.ended_at)

  const handleStart = async () => {
    if (!currentUser || busy) return
    setBusy(true)
    try {
      await api.startCrisis(currentUser.id)
      await load()
    } finally {
      setBusy(false)
    }
  }

  // Stop the timer right away, then ask for the details.
  const handleEnd = async () => {
    if (!active || busy) return
    setBusy(true)
    try {
      const ended = await api.endCrisis(active.id)
      await load()
      setEditing(ended)
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = async () => {
    if (!active) return
    await api.deleteCrisis(active.id)
    await load()
    showToast({ message: 'Crisi annullata' })
  }

  const saveChange = async (data: { started_at: string; title: string; description: string | null }) => {
    if (!currentUser) return
    if (editChange) await api.updateHabitChange(editChange.id, data)
    else await api.createHabitChange(currentUser.id, data)
    setAddingChange(false)
    setEditChange(null)
    load()
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">Crisi</h1>

      <div className="mb-5 lg:max-w-md">
        {active ? (
          <ActiveCrisis crisis={active} onEnd={handleEnd} onCancel={handleCancel} />
        ) : (
          <div className="space-y-2">
            <button
              onClick={handleStart}
              disabled={busy}
              className="w-full py-5 rounded-2xl bg-red-600 text-white text-lg font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all disabled:opacity-70"
            >
              <Zap size={22} /> Inizia crisi
            </button>
            <button
              onClick={() => setEditing(null)}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-white border border-slate-200 flex items-center justify-center gap-1.5 hover:bg-slate-50"
            >
              <CalendarDays size={16} /> Registra crisi passata
            </button>
          </div>
        )}
      </div>

      <div className="flex bg-slate-100 rounded-xl p-1 mb-4 lg:max-w-md">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            <Icon size={16} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <div className="grid gap-2 lg:grid-cols-2">
          {finished.map(c => <CrisisRow key={c.id} crisis={c} onClick={() => setEditing(c)} />)}
          {finished.length === 0 && (
            <p className="col-span-full text-center text-slate-500 py-12">Nessuna crisi registrata</p>
          )}
        </div>
      )}

      {tab === 'trend' && <CrisisTrend crises={crises} categories={categories} changes={changes} />}

      {tab === 'changes' && (
        <section className="lg:max-w-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">Modifiche di abitudini o routine da confrontare con l'andamento delle crisi.</p>
            {!addingChange && !editChange && (
              <button onClick={() => setAddingChange(true)} className="shrink-0 flex items-center gap-1 text-sm text-indigo-600 font-medium">
                <Plus size={18} /> Aggiungi
              </button>
            )}
          </div>
          {(addingChange || editChange) && (
            <div className="mb-3">
              <ChangeForm
                key={editChange?.id ?? 'new'}
                initial={editChange ?? undefined}
                onSave={saveChange}
                onCancel={() => { setAddingChange(false); setEditChange(null) }}
              />
            </div>
          )}
          <div className="space-y-2">
            {changes.map(ch => (
              <div key={ch.id} className="bg-white rounded-xl p-3 flex items-start gap-3 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700">{ch.title}</p>
                  <p className="text-xs text-slate-500">dal {format(new Date(ch.started_at), 'd MMM yyyy', { locale: it })}</p>
                  {ch.description && <p className="text-sm text-slate-600 mt-1">{ch.description}</p>}
                </div>
                <button onClick={() => { setEditChange(ch); setAddingChange(false) }}
                  className="p-2 rounded-lg text-slate-500 hover:text-indigo-500 hover:bg-indigo-50" aria-label="Modifica" title="Modifica"><Pencil size={16} /></button>
                <DeleteButton onConfirm={async () => { await api.deleteHabitChange(ch.id); load() }} size={16} />
              </div>
            ))}
            {changes.length === 0 && !addingChange && (
              <p className="text-center text-slate-500 py-8">Nessun cambiamento registrato</p>
            )}
          </div>
        </section>
      )}

      {editing !== undefined && (
        <CrisisModal
          crisis={editing}
          categories={categories}
          onClose={() => setEditing(undefined)}
          onSaved={load}
        />
      )}
    </div>
  )
}
