import { useRef, useEffect, useState, useMemo } from 'react'
import {
  addDays, addMonths, differenceInCalendarDays,
  format, startOfDay,
} from 'date-fns'
import { it } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import type { MedicationLog, IllnessEpisode } from '../types'

const MIN_LANE_W = 56
const LABEL_W = 48
const INTENSITY_ALPHA = ['4d', '75', '9e', 'c7', 'ff'] // intensity 1-5 → 30…100%

function segColor(illColor: string, intensity: number | null): string {
  if (intensity === null) return illColor + 'bf'
  return illColor + INTENSITY_ALPHA[Math.min(4, Math.max(0, intensity - 1))]
}

function parseLocalDate(val: string): Date {
  const [y, m, d] = val.split('-').map(Number)
  return startOfDay(new Date(y, m - 1, d))
}

function episodesOverlap(eps1: IllnessEpisode[], eps2: IllnessEpisode[]): boolean {
  for (const a of eps1) {
    const as = new Date(a.started_at).getTime()
    const ae = a.ended_at ? new Date(a.ended_at).getTime() : Infinity
    for (const b of eps2) {
      const bs = new Date(b.started_at).getTime()
      const be = b.ended_at ? new Date(b.ended_at).getTime() : Infinity
      if (as < be && ae > bs) return true
    }
  }
  return false
}

// Lane assignment by illness identity: all episodes of the same illness share one lane.
// Two illnesses need separate lanes only when their episodes overlap in time.
function assignIllnessLanes(eps: IllnessEpisode[], maxLanes: number): Map<number, number> {
  const byIllness = new Map<number, IllnessEpisode[]>()
  for (const ep of eps) {
    if (!byIllness.has(ep.illness_id)) byIllness.set(ep.illness_id, [])
    byIllness.get(ep.illness_id)!.push(ep)
  }

  const illnessIds = [...byIllness.keys()].sort((a, b) => {
    const aMin = Math.min(...byIllness.get(a)!.map(ep => new Date(ep.started_at).getTime()))
    const bMin = Math.min(...byIllness.get(b)!.map(ep => new Date(ep.started_at).getTime()))
    return aMin - bMin
  })

  const illnessToLane = new Map<number, number>()
  const laneContents: number[][] = []

  for (const illId of illnessIds) {
    let lane = -1
    for (let l = 0; l < laneContents.length && l < maxLanes; l++) {
      const conflicts = laneContents[l].some(existId =>
        episodesOverlap(byIllness.get(illId)!, byIllness.get(existId)!)
      )
      if (!conflicts) { lane = l; break }
    }
    if (lane < 0 && laneContents.length < maxLanes) {
      lane = laneContents.length
      laneContents.push([])
    }
    if (lane >= 0) {
      illnessToLane.set(illId, lane)
      laneContents[lane].push(illId)
    }
  }

  const map = new Map<number, number>()
  for (const ep of eps) {
    const lane = illnessToLane.get(ep.illness_id)
    if (lane !== undefined) map.set(ep.id, lane)
  }
  return map
}

interface Props {
  medLogs: MedicationLog[]
  illEpisodes: IllnessEpisode[]
}

export default function TimelineView({ medLogs, illEpisodes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [cWidth, setCWidth] = useState(320)
  const [mode, setMode] = useState<'week' | 'month'>('week')
  const [winStart, setWinStart] = useState(() => startOfDay(addDays(new Date(), -6)))
  const [customEnd, setCustomEnd] = useState<Date | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setCWidth(el.clientWidth)
    const ro = new ResizeObserver(([e]) => setCWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const standardDays = mode === 'week' ? 7 : 30
  const winEnd = customEnd ? addDays(customEnd, 1) : addDays(winStart, standardDays)
  const dayCount = customEnd
    ? Math.max(1, differenceInCalendarDays(customEnd, winStart) + 1)
    : standardDays
  const dayH = customEnd
    ? Math.max(20, Math.min(72, Math.floor(504 / dayCount)))
    : mode === 'week' ? 72 : 36
  const totalH = dayCount * dayH

  const contentW = Math.max(1, cWidth - LABEL_W)
  const maxLanes = Math.max(1, Math.floor(contentW / MIN_LANE_W))

  const laneMap = useMemo(
    () => assignIllnessLanes(illEpisodes, maxLanes),
    [illEpisodes, maxLanes]
  )

  const visEps = useMemo(() => {
    const ws = winStart.getTime(), we = winEnd.getTime()
    const visible = illEpisodes.filter(ep => {
      if (!laneMap.has(ep.id)) return false
      const s = new Date(ep.started_at).getTime()
      const e = ep.ended_at ? new Date(ep.ended_at).getTime() : Infinity
      return s < we && e > ws
    })

    // Compact lanes: remap globally-assigned lane numbers to 0-based indices
    // preserving illness identity (same illness → same compact lane across all its episodes)
    const usedLanes = [...new Set(visible.map(ep => laneMap.get(ep.id)!))].sort((a, b) => a - b)
    const compactMap = new Map(usedLanes.map((globalLane, i) => [globalLane, i]))

    return visible
      .sort((a, b) => compactMap.get(laneMap.get(a.id)!)! - compactMap.get(laneMap.get(b.id)!)!)
      .map(ep => ({ ep, lane: compactMap.get(laneMap.get(ep.id)!)! }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [illEpisodes, laneMap, winStart.getTime(), winEnd.getTime()])

  // Distinct lane slots visible this window (= number of distinct illnesses shown)
  const visLaneCount = useMemo(
    () => new Set(visEps.map(({ lane }) => lane)).size,
    [visEps]
  )
  const laneW = contentW / Math.max(1, visLaneCount)

  const visMeds = useMemo(() => {
    const ws = winStart.getTime(), we = winEnd.getTime()
    return medLogs.filter(l => {
      const t = new Date(l.taken_at).getTime()
      return t >= ws && t < we
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medLogs, winStart.getTime(), winEnd.getTime()])

  const yOf = (d: Date) => ((d.getTime() - winStart.getTime()) / 86400000) * dayH
  const today = new Date()
  const todayY = yOf(today)

  const prev = () => {
    if (customEnd) {
      const shift = dayCount
      setWinStart(d => addDays(d, -shift))
      setCustomEnd(prev => prev ? addDays(prev, -shift) : null)
    } else {
      setWinStart(d => mode === 'week' ? addDays(d, -7) : addMonths(d, -1))
    }
  }
  const next = () => {
    if (customEnd) {
      const shift = dayCount
      setWinStart(d => addDays(d, shift))
      setCustomEnd(prev => prev ? addDays(prev, shift) : null)
    } else {
      setWinStart(d => mode === 'week' ? addDays(d, 7) : addMonths(d, 1))
    }
  }

  const switchMode = (m: 'week' | 'month') => {
    const end = customEnd ?? addDays(winStart, standardDays)
    setWinStart(addDays(end, -(m === 'week' ? 7 : 30)))
    setMode(m)
    setCustomEnd(null)
  }

  const goToday = () => {
    setMode('week')
    setWinStart(startOfDay(addDays(new Date(), -6)))
    setCustomEnd(null)
  }

  const startStr = format(winStart, 'yyyy-MM-dd')
  const endStr = format(customEnd ?? addDays(winEnd, -1), 'yyyy-MM-dd')

  const handleStartChange = (val: string) => {
    if (!val) return
    const newStart = parseLocalDate(val)
    const currentEnd = customEnd ?? addDays(winStart, standardDays - 1)
    if (newStart >= currentEnd) return
    setWinStart(newStart)
    setCustomEnd(currentEnd)
  }

  const handleEndChange = (val: string) => {
    if (!val) return
    const newEnd = parseLocalDate(val)
    if (newEnd <= winStart) return
    setCustomEnd(newEnd)
  }

  const legIll = [...new Map(visEps.map(({ ep }) => [ep.illness.id, ep.illness])).values()]
  const legMed = [...new Map(visMeds.map(l => [l.medication.id, l.medication])).values()]

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">

      {/* ── Controls ─────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-slate-100 space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <button onClick={prev}
              className="p-1.5 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0">
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <span className="text-sm font-medium text-slate-700 flex-1 text-center truncate">
              {format(winStart, 'd MMM', { locale: it })} – {format(addDays(winEnd, -1), 'd MMM yyyy', { locale: it })}
            </span>
            <button onClick={next}
              className="p-1.5 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0">
              <ChevronRight size={18} className="text-slate-600" />
            </button>
          </div>

          <div className="flex bg-slate-100 rounded-lg p-0.5 shrink-0">
            {(['week', 'month'] as const).map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  mode === m && !customEnd ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}>
                {m === 'week' ? '7g' : '30g'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowPicker(p => !p)}
            title="Seleziona periodo manuale"
            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
              showPicker || customEnd ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-500'
            }`}>
            <CalendarDays size={16} />
          </button>

          <button onClick={goToday}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 transition-colors shrink-0">
            Oggi
          </button>
        </div>

        {showPicker && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0">Dal</span>
            <input
              type="date"
              value={startStr}
              max={endStr}
              onChange={e => handleStartChange(e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <span className="text-xs text-slate-500 shrink-0">al</span>
            <input
              type="date"
              value={endStr}
              min={startStr}
              onChange={e => handleEndChange(e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        )}
      </div>

      {/* ── Legend — fixed above the scrollable body so it's always visible ── */}
      {(legIll.length > 0 || legMed.length > 0) && (
        <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap gap-x-4 gap-y-1 shrink-0">
          {legIll.map(ill => (
            <div key={ill.id} className="flex items-center gap-1.5">
              <div className="w-2 rounded-sm" style={{ height: 16, backgroundColor: ill.color }} />
              <span className="text-xs text-slate-600">{ill.emoji} {ill.name}</span>
            </div>
          ))}
          {legMed.map(med => (
            <div key={med.id} className="flex items-center gap-1.5">
              <div className="rounded-full" style={{ width: 16, height: 5, backgroundColor: med.color }} />
              <span className="text-xs text-slate-600">{med.emoji} {med.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Timeline body ─────────────────────────────────────────────── */}
      <div className="overflow-y-auto" style={{ maxHeight: '68vh' }}>
        <div ref={containerRef} className="relative" style={{ height: totalH, overflow: 'hidden' }}>

          {Array.from({ length: dayCount }, (_, i) => {
            const day = addDays(winStart, i)
            const isToday = format(day, 'yyyyMMdd') === format(today, 'yyyyMMdd')
            return (
              <div key={i} className="absolute left-0 right-0 border-t"
                style={{ top: i * dayH, height: dayH, borderColor: isToday ? '#818cf8' : '#f1f5f9' }}>
                <div className="absolute top-1 left-0 flex flex-col items-center" style={{ width: LABEL_W }}>
                  <span className={`text-[10px] leading-none font-medium uppercase ${isToday ? 'text-indigo-500' : 'text-slate-400'}`}>
                    {format(day, 'EEE', { locale: it }).slice(0, 2)}
                  </span>
                  <span className={`text-sm font-bold leading-none mt-0.5 ${isToday ? 'text-indigo-600' : 'text-slate-700'}`}>
                    {format(day, 'd')}
                  </span>
                </div>
              </div>
            )
          })}

          {todayY >= 0 && todayY <= totalH && (
            <div className="absolute right-0 pointer-events-none z-20"
              style={{ top: Math.round(todayY), left: LABEL_W, borderTop: '2px dashed #818cf8' }} />
          )}

          <div className="absolute inset-y-0" style={{ left: LABEL_W, width: contentW, overflow: 'hidden' }}>

            {visEps.map(({ ep, lane }) => {
              const epStart = new Date(ep.started_at)
              const epEnd = ep.ended_at ? new Date(ep.ended_at) : new Date()
              const rawTop = yOf(epStart)
              const rawBot = yOf(epEnd)
              const height = Math.max(4, rawBot - rawTop)
              const left = lane * laneW + 2
              const w = Math.max(4, laneW - 4)

              const aboveWin = rawTop < 0
              const belowWin = rawBot > totalH
              const br = `${aboveWin ? 2 : 8}px ${aboveWin ? 2 : 8}px ${belowWin ? 2 : 8}px ${belowWin ? 2 : 8}px`

              const logs = [...ep.logs].sort(
                (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
              )
              const totalMs = Math.max(epEnd.getTime() - epStart.getTime(), 1)
              let segs: { color: string; pct: number }[] = []

              if (logs.length === 0) {
                segs = [{ color: ep.illness.color + 'bf', pct: 100 }]
              } else {
                const prems = Math.max(0, new Date(logs[0].occurred_at).getTime() - epStart.getTime())
                if (prems > 0) {
                  segs.push({ color: ep.illness.color + '66', pct: (prems / totalMs) * 100 })
                }
                for (let i = 0; i < logs.length; i++) {
                  const segEnd = i < logs.length - 1 ? new Date(logs[i + 1].occurred_at) : epEnd
                  const ms = Math.max(0, segEnd.getTime() - new Date(logs[i].occurred_at).getTime())
                  segs.push({ color: segColor(ep.illness.color, logs[i].intensity), pct: (ms / totalMs) * 100 })
                }
              }
              const sum = segs.reduce((s, g) => s + g.pct, 0)
              if (sum > 0) segs = segs.map(g => ({ ...g, pct: g.pct / sum * 100 }))

              return (
                <div key={ep.id}
                  className="absolute overflow-hidden flex flex-col"
                  style={{ top: rawTop, height, left, width: w, borderRadius: br }}
                  title={`${ep.illness.emoji} ${ep.illness.name}`}>
                  {segs.map((seg, i) => (
                    <div key={i} style={{ backgroundColor: seg.color, height: `${seg.pct}%`, minHeight: 0 }} />
                  ))}
                  {height >= 22 && w >= 18 && (
                    <span className="absolute inset-x-0 top-1 text-center pointer-events-none select-none leading-none"
                      style={{ fontSize: w >= 36 ? 13 : 10 }}>
                      {ep.illness.emoji}
                    </span>
                  )}
                </div>
              )
            })}

            {visMeds.map(l => {
              const y = yOf(new Date(l.taken_at))
              return (
                <div key={l.id}
                  className="absolute left-0 right-0 pointer-events-none z-10"
                  style={{ top: Math.round(y) - 4, height: 8 }}
                  title={`${l.medication.emoji} ${l.medication.name} – ${format(new Date(l.taken_at), 'HH:mm')}`}>
                  <div className="w-full rounded-full" style={{ height: 8, backgroundColor: l.medication.color }} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {visEps.length === 0 && visMeds.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400 shrink-0">
          Nessuna registrazione in questo periodo
        </p>
      )}
    </div>
  )
}
