import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { addDays, addWeeks, differenceInCalendarDays, endOfDay, format, startOfDay, startOfWeek } from 'date-fns'
import { it } from 'date-fns/locale'
import { ArrowLeft, Printer } from 'lucide-react'
import { api } from '../api'
import { useUser } from '../contexts/UserContext'
import type { Crisis, HabitChange } from '../types'
import { LEVELS } from '../levels'
import { durationMinutes, formatDuration } from '../crisis'

const BAR_COLOR = '#6366f1'
const MARKER_COLOR = '#d97706'

const TIME_SLOTS = [
  { label: 'Mattina (6–12)', test: (h: number) => h >= 6 && h < 12 },
  { label: 'Pomeriggio (12–18)', test: (h: number) => h >= 12 && h < 18 },
  { label: 'Sera (18–22)', test: (h: number) => h >= 18 && h < 22 },
  { label: 'Notte (22–6)', test: (h: number) => h >= 22 || h < 6 },
]
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function parseDay(val: string | null, fallback: Date): Date {
  if (!val) return fallback
  const [y, m, d] = val.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function avg(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl py-3 px-2 text-center print:border print:border-slate-200">
      <div className="text-xl font-bold text-slate-800 tabular-nums">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6 break-inside-avoid">
      <h2 className="text-base font-bold text-slate-800 mb-2 pb-1 border-b border-slate-200">{title}</h2>
      {children}
    </section>
  )
}

// Rows of label / count with a proportional bar, shared by the breakdown tables.
function CountTable({ rows, total }: { rows: { label: ReactNode; count: number; extra?: string }[]; total: number }) {
  const max = Math.max(1, ...rows.map(r => r.count))
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-slate-100 last:border-0">
            <td className="py-1.5 pr-2 text-slate-700 whitespace-nowrap">{r.label}</td>
            <td className="py-1.5 w-full">
              <div className="h-2 rounded-full" style={{ width: `${(r.count / max) * 100}%`, minWidth: r.count ? 4 : 0, backgroundColor: BAR_COLOR, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />
            </td>
            <td className="py-1.5 pl-2 text-right tabular-nums text-slate-800 whitespace-nowrap">
              {r.count} <span className="text-slate-500 text-xs">({total ? Math.round((r.count / total) * 100) : 0}%)</span>
            </td>
            {r.extra !== undefined && <td className="py-1.5 pl-3 text-right text-xs text-slate-500 whitespace-nowrap">{r.extra}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function WeeklyChart({ crises, from, to, changes }: { crises: Crisis[]; from: Date; to: Date; changes: HabitChange[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const first = startOfWeek(from, { weekStartsOn: 1 })
  const weekCount = Math.floor(differenceInCalendarDays(to, first) / 7) + 1
  const counts = Array.from({ length: weekCount }, () => 0)
  for (const c of crises) {
    const idx = Math.floor(differenceInCalendarDays(new Date(c.started_at), first) / 7)
    if (idx >= 0 && idx < weekCount) counts[idx]++
  }

  const W = Math.max(width, 240), H = 160, padL = 28, padR = 8, padT = 20, padB = 24
  const plotW = W - padL - padR, plotH = H - padT - padB
  const slot = plotW / weekCount
  const barW = Math.max(2, Math.min(28, slot - 3))
  const yMax = Math.max(2, Math.ceil(Math.max(...counts) / 2) * 2)
  const y = (v: number) => padT + plotH - (v / yMax) * plotH
  const labelEvery = Math.max(1, Math.ceil(weekCount / Math.max(1, Math.floor(plotW / 48))))
  const markers = changes
    .map((c, i) => ({ c, index: i + 1, offset: differenceInCalendarDays(new Date(c.started_at), first) / 7 }))
    .filter(m => m.offset >= 0 && m.offset <= weekCount)

  return (
    <div ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label="Numero di crisi per settimana">
        {[0, yMax / 2, yMax].map(t => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#64748b">{t}</text>
          </g>
        ))}
        {counts.map((v, i) => (
          <g key={i}>
            {v > 0 && <rect x={padL + i * slot + (slot - barW) / 2} y={y(v)} width={barW} height={y(0) - y(v)} rx={3} fill={BAR_COLOR} />}
            {i % labelEvery === 0 && (
              <text x={padL + i * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#64748b">
                {format(addWeeks(first, i), 'd MMM', { locale: it })}
              </text>
            )}
          </g>
        ))}
        {markers.map(m => {
          const x = padL + m.offset * slot
          return (
            <g key={m.c.id}>
              <line x1={x} x2={x} y1={padT - 4} y2={padT + plotH} stroke={MARKER_COLOR} strokeWidth={2} strokeDasharray="4 3" />
              <circle cx={x} cy={padT - 10} r={8} fill={MARKER_COLOR} />
              <text x={x} y={padT - 6} textAnchor="middle" fontSize={10} fontWeight={700} fill="white">{m.index}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function CrisisReport() {
  const { currentUser } = useUser()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [crises, setCrises] = useState<Crisis[] | null>(null)
  const [changes, setChanges] = useState<HabitChange[]>([])

  const from = startOfDay(parseDay(params.get('from'), addDays(new Date(), -29)))
  const to = endOfDay(parseDay(params.get('to'), new Date()))

  useEffect(() => {
    if (!currentUser) return
    Promise.all([api.getCrises(currentUser.id), api.getHabitChanges(currentUser.id)]).then(([cs, chs]) => {
      setCrises(cs)
      setChanges(chs)
    })
  }, [currentUser])

  const inRange = useMemo(
    () => (crises ?? [])
      .filter(c => c.ended_at)
      .filter(c => { const t = new Date(c.started_at); return t >= from && t <= to })
      .sort((a, b) => a.started_at.localeCompare(b.started_at)),
    [crises, from.getTime(), to.getTime()],
  )
  const changesInRange = changes
    .filter(c => { const t = new Date(c.started_at); return t >= from && t <= to })
    .sort((a, b) => a.started_at.localeCompare(b.started_at))

  const days = differenceInCalendarDays(to, from) + 1
  const total = inRange.length
  const durations = inRange.map(durationMinutes).filter((v): v is number => v != null)
  const intensities = inRange.map(c => c.intensity).filter((v): v is number => v != null)
  const avgIntensity = avg(intensities)
  const totalDuration = durations.reduce((a, b) => a + b, 0)

  const byCategory = useMemo(() => {
    const map = new Map<string, { label: ReactNode; items: Crisis[] }>()
    for (const c of inRange) {
      const key = c.category ? String(c.category.id) : 'none'
      if (!map.has(key)) {
        map.set(key, { label: c.category ? <>{c.category.emoji} {c.category.name}</> : 'Senza categoria', items: [] })
      }
      map.get(key)!.items.push(c)
    }
    return [...map.values()].sort((a, b) => b.items.length - a.items.length)
  }, [inRange])

  if (!currentUser) return null

  return (
    <div className="px-4 pt-6 pb-8 print:p-0 lg:max-w-4xl">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button onClick={() => navigate('/crises')} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 px-2 py-1.5 -ml-2 rounded-lg hover:bg-slate-100">
          <ArrowLeft size={16} /> Crisi
        </button>
        <button
          onClick={() => window.print()}
          disabled={!crises}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-40"
        >
          <Printer size={16} /> Stampa / PDF
        </button>
      </div>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Report crisi · {currentUser.name}</h1>
        <p className="text-sm text-slate-600">
          Dal {format(from, 'd MMMM yyyy', { locale: it })} al {format(to, 'd MMMM yyyy', { locale: it })} ({days} giorni)
        </p>
        <p className="text-xs text-slate-500">Generato il {format(new Date(), "d MMMM yyyy 'alle' HH:mm", { locale: it })}</p>
      </header>

      {!crises ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : (
        <>
          <Section title="Riepilogo">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <Tile label="Crisi totali" value={String(total)} />
              <Tile label="Crisi a settimana" value={(total / (days / 7)).toFixed(1)} />
              <Tile label="Intensità media" value={avgIntensity !== null ? `${avgIntensity.toFixed(1)} / 5` : '—'} />
              <Tile label="Durata media" value={formatDuration(avg(durations))} />
              <Tile label="Durata totale" value={total ? formatDuration(totalDuration) : '—'} />
            </div>
          </Section>

          {total > 0 && (
            <>
              <Section title="Andamento settimanale">
                <WeeklyChart crises={inRange} from={from} to={to} changes={changesInRange} />
                {changesInRange.length > 0 && (
                  <ol className="mt-2 space-y-0.5 text-xs text-slate-600">
                    {changesInRange.map((c, i) => (
                      <li key={c.id} className="flex gap-2">
                        <span className="shrink-0 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: MARKER_COLOR, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>{i + 1}</span>
                        <span>{format(new Date(c.started_at), 'd MMM yyyy', { locale: it })}: <strong className="font-semibold">{c.title}</strong>{c.description && ` — ${c.description}`}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Section>

              <div className="grid gap-x-8 md:grid-cols-2 print:grid-cols-2">
                <Section title="Per categoria">
                  <CountTable
                    total={total}
                    rows={byCategory.map(g => ({
                      label: g.label,
                      count: g.items.length,
                      extra: `int. ${avg(g.items.map(c => c.intensity).filter((v): v is number => v != null))?.toFixed(1) ?? '—'}`,
                    }))}
                  />
                </Section>

                <Section title="Per intensità">
                  <CountTable
                    total={total}
                    rows={LEVELS.map(l => ({ label: `${l.value} · ${l.label}`, count: inRange.filter(c => c.intensity === l.value).length }))}
                  />
                </Section>

                <Section title="Per fascia oraria">
                  <CountTable
                    total={total}
                    rows={TIME_SLOTS.map(s => ({ label: s.label, count: inRange.filter(c => s.test(new Date(c.started_at).getHours())).length }))}
                  />
                </Section>

                <Section title="Per giorno della settimana">
                  <CountTable
                    total={total}
                    rows={WEEKDAYS.map((d, i) => ({ label: d, count: inRange.filter(c => (new Date(c.started_at).getDay() + 6) % 7 === i).length }))}
                  />
                </Section>
              </div>

              <Section title={`Elenco crisi (${total})`}>
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                        <th className="py-1.5 pr-3 font-medium">Data</th>
                        <th className="py-1.5 pr-3 font-medium">Durata</th>
                        <th className="py-1.5 pr-3 font-medium">Categoria</th>
                        <th className="py-1.5 pr-3 font-medium">Int.</th>
                        <th className="py-1.5 font-medium">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inRange.map(c => (
                        <tr key={c.id} className="border-b border-slate-100 align-top break-inside-avoid">
                          <td className="py-1.5 pr-3 whitespace-nowrap text-slate-700">{format(new Date(c.started_at), 'EEE d MMM, HH:mm', { locale: it })}</td>
                          <td className="py-1.5 pr-3 whitespace-nowrap text-slate-700">{formatDuration(durationMinutes(c))}</td>
                          <td className="py-1.5 pr-3 text-slate-700">{c.category ? `${c.category.emoji} ${c.category.name}` : '—'}</td>
                          <td className="py-1.5 pr-3 text-slate-700 tabular-nums">{c.intensity ?? '—'}</td>
                          <td className="py-1.5 text-slate-600 min-w-[12rem]">
                            {c.description && <div>{c.description}</div>}
                            {c.trigger && <div><span className="text-slate-500">Scatenante:</span> {c.trigger}</div>}
                            {c.what_helped && <div><span className="text-slate-500">Ha aiutato:</span> {c.what_helped}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </>
          )}

          {total === 0 && <p className="text-slate-500">Nessuna crisi registrata in questo periodo.</p>}
        </>
      )}
    </div>
  )
}
