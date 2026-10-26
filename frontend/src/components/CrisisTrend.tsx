import { useEffect, useMemo, useRef, useState } from 'react'
import { addWeeks, differenceInCalendarDays, format, startOfWeek } from 'date-fns'
import { it } from 'date-fns/locale'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { Crisis, CrisisCategory, HabitChange } from '../types'
import { durationMinutes, formatDuration } from '../crisis'

type Metric = 'count' | 'intensity' | 'duration'

const METRICS: { key: Metric; label: string }[] = [
  { key: 'count', label: 'Numero' },
  { key: 'intensity', label: 'Intensità media' },
  { key: 'duration', label: 'Durata totale' },
]
const RANGES = [
  { weeks: 12, label: '3 mesi' },
  { weeks: 26, label: '6 mesi' },
  { weeks: 52, label: '1 anno' },
]
// Weeks on each side of a habit change used for the before/after comparison.
const COMPARE_WEEKS = 4

const BAR_COLOR = '#6366f1'
const MARKER_COLOR = '#d97706'

interface Summary {
  count: number
  perWeek: number
  avgIntensity: number | null
  avgDuration: number | null
  totalDuration: number
}

function summarize(crises: Crisis[], weeks: number): Summary {
  const intensities = crises.map(c => c.intensity).filter((v): v is number => v != null)
  const durations = crises.map(durationMinutes).filter((v): v is number => v != null)
  const totalDuration = durations.reduce((a, b) => a + b, 0)
  return {
    count: crises.length,
    perWeek: weeks > 0 ? crises.length / weeks : 0,
    avgIntensity: intensities.length ? intensities.reduce((a, b) => a + b, 0) / intensities.length : null,
    avgDuration: durations.length ? totalDuration / durations.length : null,
    totalDuration,
  }
}

function metricValue(s: Summary, metric: Metric): number | null {
  if (metric === 'count') return s.count
  if (metric === 'intensity') return s.avgIntensity
  return s.count ? s.totalDuration : null
}

function formatMetric(v: number | null, metric: Metric): string {
  if (v === null) return '—'
  if (metric === 'count') return String(v)
  if (metric === 'intensity') return v.toFixed(1)
  return formatDuration(v)
}

function Segmented<T extends string | number>({ options, value, onChange }: {
  options: { key: T; label: string }[]; value: T; onChange: (v: T) => void
}) {
  return (
    <div className="flex bg-slate-100 rounded-xl p-1">
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            value === o.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Lower is better for every metric: fewer, milder, shorter crises.
function Delta({ before, after, digits = 1, unit = '' }: { before: number | null; after: number | null; digits?: number; unit?: string }) {
  if (before === null || after === null) return <span className="text-slate-500">—</span>
  const diff = after - before
  if (Math.abs(diff) < 0.05) {
    return <span className="inline-flex items-center gap-0.5 text-slate-500"><Minus size={12} aria-hidden="true" /> invariato</span>
  }
  const better = diff < 0
  const Icon = better ? ArrowDown : ArrowUp
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${better ? 'text-green-700' : 'text-red-600'}`}>
      <Icon size={12} aria-hidden="true" />
      {Math.abs(diff).toFixed(digits)}{unit}
      <span className="sr-only">{better ? ' (miglioramento)' : ' (peggioramento)'}</span>
    </span>
  )
}

function ChangeComparison({ change, index, crises }: { change: HabitChange; index: number; crises: Crisis[] }) {
  const at = new Date(change.started_at)
  const now = new Date()
  const beforeStart = addWeeks(at, -COMPARE_WEEKS)
  const afterEnd = new Date(Math.min(addWeeks(at, COMPARE_WEEKS).getTime(), now.getTime()))
  const afterWeeks = Math.max(differenceInCalendarDays(afterEnd, at), 0) / 7

  const before = summarize(crises.filter(c => { const t = new Date(c.started_at); return t >= beforeStart && t < at }), COMPARE_WEEKS)
  const after = summarize(crises.filter(c => { const t = new Date(c.started_at); return t >= at && t < afterEnd }), afterWeeks)
  const tooEarly = afterWeeks < 1

  const rows = [
    { label: 'Crisi a settimana', b: before.perWeek.toFixed(1), a: tooEarly ? '—' : after.perWeek.toFixed(1), delta: <Delta before={before.perWeek} after={tooEarly ? null : after.perWeek} /> },
    { label: 'Intensità media', b: formatMetric(before.avgIntensity, 'intensity'), a: formatMetric(after.avgIntensity, 'intensity'), delta: <Delta before={before.avgIntensity} after={after.avgIntensity} /> },
    { label: 'Durata media', b: formatDuration(before.avgDuration), a: formatDuration(after.avgDuration), delta: <Delta before={before.avgDuration} after={after.avgDuration} digits={0} unit=" min" /> },
  ]

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-start gap-2 mb-3">
        <span className="shrink-0 w-6 h-6 rounded-full text-xs font-bold text-white flex items-center justify-center" style={{ backgroundColor: MARKER_COLOR }}>
          {index}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 leading-tight">{change.title}</p>
          <p className="text-xs text-slate-500">dal {format(at, 'd MMM yyyy', { locale: it })}</p>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500">
            <th className="text-left font-medium pb-1"></th>
            <th className="text-right font-medium pb-1">{COMPARE_WEEKS} sett. prima</th>
            <th className="text-right font-medium pb-1">Dopo</th>
            <th className="text-right font-medium pb-1">Variazione</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.label} className="border-t border-slate-100">
              <td className="py-1.5 text-slate-600">{r.label}</td>
              <td className="py-1.5 text-right tabular-nums text-slate-800">{r.b}</td>
              <td className="py-1.5 text-right tabular-nums text-slate-800">{r.a}</td>
              <td className="py-1.5 text-right text-xs">{r.delta}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-500 mt-2">
        {tooEarly
          ? 'Serve almeno una settimana dopo il cambiamento per confrontare.'
          : `Dopo: ${after.count} crisi in ${afterWeeks.toFixed(1)} settimane${afterWeeks < COMPARE_WEEKS ? ' (periodo ancora in corso)' : ''}.`}
      </p>
    </div>
  )
}

interface Props {
  crises: Crisis[]
  categories: CrisisCategory[]
  changes: HabitChange[]
}

export default function CrisisTrend({ crises, categories, changes }: Props) {
  const [metric, setMetric] = useState<Metric>('count')
  const [rangeWeeks, setRangeWeeks] = useState(12)
  const [categoryId, setCategoryId] = useState<number | 'all'>('all')
  const [hover, setHover] = useState<number | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)

  useEffect(() => {
    const el = chartRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const filtered = useMemo(
    () => crises.filter(c => c.ended_at && (categoryId === 'all' || c.category_id === categoryId)),
    [crises, categoryId],
  )

  const firstWeek = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), -(rangeWeeks - 1))
  const weeks = useMemo(() => {
    const buckets = Array.from({ length: rangeWeeks }, (_, i) => ({ start: addWeeks(firstWeek, i), crises: [] as Crisis[] }))
    for (const c of filtered) {
      const idx = Math.floor(differenceInCalendarDays(new Date(c.started_at), firstWeek) / 7)
      if (idx >= 0 && idx < rangeWeeks) buckets[idx].crises.push(c)
    }
    return buckets.map(b => ({ ...b, summary: summarize(b.crises, 1) }))
  }, [filtered, rangeWeeks, firstWeek.getTime()])

  const sortedChanges = [...changes].sort((a, b) => a.started_at.localeCompare(b.started_at))

  // Chart geometry in CSS pixels, so text stays 11px at any width
  const W = Math.max(width, 240), H = 220, padL = 32, padR = 8, padT = 22, padB = 26
  const plotW = W - padL - padR, plotH = H - padT - padB
  const slot = plotW / rangeWeeks
  const barW = Math.max(2, Math.min(28, slot - 4))
  const values = weeks.map(w => metricValue(w.summary, metric))
  const rawMax = Math.max(0, ...values.map(v => v ?? 0))
  const yMax = metric === 'intensity' ? 5 : niceMax(rawMax)
  const ticks = [0, yMax / 2, yMax]
  const y = (v: number) => padT + plotH - (v / yMax) * plotH
  const labelEvery = rangeWeeks <= 12 ? 2 : rangeWeeks <= 26 ? 4 : 8

  const markers = sortedChanges
    .map((c, i) => ({ change: c, index: i + 1, offset: differenceInCalendarDays(new Date(c.started_at), firstWeek) / 7 }))
    .filter(m => m.offset >= 0 && m.offset <= rangeWeeks)

  const hovered = hover !== null ? weeks[hover] : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Segmented options={METRICS} value={metric} onChange={setMetric} />
        <Segmented options={RANGES.map(r => ({ key: r.weeks, label: r.label }))} value={rangeWeeks} onChange={setRangeWeeks} />
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          aria-label="Filtra per categoria"
          className="border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="all">Tutte le categorie</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 mb-1">
          {METRICS.find(m => m.key === metric)!.label} per settimana
        </p>
        <div className="relative" ref={chartRef}>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" role="img" aria-label={`Grafico settimanale: ${METRICS.find(m => m.key === metric)!.label}`}>
            {ticks.map(t => (
              <g key={t}>
                <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
                <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#64748b">
                  {metric === 'duration' ? Math.round(t) : Number.isInteger(t) ? t : t.toFixed(1)}
                </text>
              </g>
            ))}
            {weeks.map((w, i) => {
              const v = values[i]
              const x = padL + i * slot + (slot - barW) / 2
              return (
                <g key={i}>
                  {v !== null && v > 0 && (
                    <path d={barPath(x, y(v), barW, y(0) - y(v))} fill={BAR_COLOR} opacity={hover === null || hover === i ? 1 : 0.5} />
                  )}
                  {i % labelEvery === 0 && (
                    <text x={padL + i * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#64748b">
                      {format(w.start, 'd MMM', { locale: it })}
                    </text>
                  )}
                  {/* Hit target covers the whole week column, not just the bar */}
                  <rect
                    x={padL + i * slot} y={padT} width={slot} height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setHover(hover === i ? null : i)}
                  />
                </g>
              )
            })}
            {markers.map(m => {
              const x = padL + m.offset * slot
              return (
                <g key={m.change.id} pointerEvents="none">
                  <line x1={x} x2={x} y1={padT - 4} y2={padT + plotH} stroke={MARKER_COLOR} strokeWidth={2} strokeDasharray="4 3" />
                  <circle cx={x} cy={padT - 11} r={9} fill={MARKER_COLOR} />
                  <text x={x} y={padT - 7} textAnchor="middle" fontSize={11} fontWeight={700} fill="white">{m.index}</text>
                </g>
              )
            })}
          </svg>
          {hovered && hover !== null && (
            <div
              className="absolute top-0 pointer-events-none bg-slate-800 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap"
              style={{
                left: `${((padL + hover * slot + slot / 2) / W) * 100}%`,
                transform: `translateX(${hover > rangeWeeks / 2 ? '-100%' : '0'})`,
              }}
            >
              <p className="font-semibold mb-0.5">Settimana del {format(hovered.start, 'd MMM', { locale: it })}</p>
              <p>{hovered.summary.count} crisi</p>
              <p>Intensità media {formatMetric(hovered.summary.avgIntensity, 'intensity')}</p>
              <p>Durata totale {formatDuration(hovered.summary.count ? hovered.summary.totalDuration : null)}</p>
            </div>
          )}
        </div>
        {markers.length > 0 && (
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: MARKER_COLOR }} aria-hidden="true" />
            Le linee tratteggiate indicano i cambiamenti di abitudini
          </p>
        )}
      </div>

      {sortedChanges.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Prima e dopo i cambiamenti</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {sortedChanges.map((c, i) => <ChangeComparison key={c.id} change={c} index={i + 1} crises={filtered} />)}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500 text-center py-4">
          Aggiungi un cambiamento di abitudini nella scheda "Cambiamenti" per confrontare il prima e il dopo.
        </p>
      )}
    </div>
  )
}

function niceMax(v: number): number {
  if (v <= 2) return 2
  if (v <= 4) return 4
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (v <= m * pow) return m * pow
  }
  return v
}

// Bar with a 4px rounded top, flat on the baseline.
function barPath(x: number, top: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h)
  return `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${top + h} Z`
}
