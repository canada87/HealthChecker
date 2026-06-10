import { useRef, useEffect, useState, useMemo } from 'react'
import { addDays, addMonths, format, startOfDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { MedicationLog, IllnessEpisode } from '../types'

const MIN_LANE_W = 56   // minimum column width before we stop adding parallel lanes
const LABEL_W = 48      // width of the day label column (px)
const LEVEL_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444']

// Greedy interval coloring: assign each episode a lane index.
// Episodes that would exceed `maxLanes` get no entry (hidden).
function assignLanes(eps: IllnessEpisode[], maxLanes: number): Map<number, number> {
  const sorted = [...eps].sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  )
  const laneEnds: number[] = [] // ms timestamp when each lane becomes free
  const map = new Map<number, number>()

  for (const ep of sorted) {
    const s = new Date(ep.started_at).getTime()
    const e = ep.ended_at ? new Date(ep.ended_at).getTime() : Infinity

    let lane = -1
    for (let i = 0; i < laneEnds.length && i < maxLanes; i++) {
      if (laneEnds[i] <= s) { lane = i; laneEnds[i] = e; break }
    }
    if (lane < 0 && laneEnds.length < maxLanes) { lane = laneEnds.length; laneEnds.push(e) }
    if (lane >= 0) map.set(ep.id, lane)
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

  // Observe container width for dynamic lane calculation
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setCWidth(el.clientWidth)
    const ro = new ResizeObserver(([e]) => setCWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const dayCount = mode === 'week' ? 7 : 30
  const dayH = mode === 'week' ? 72 : 36
  const winEnd = addDays(winStart, dayCount)
  const totalH = dayCount * dayH

  const contentW = Math.max(1, cWidth - LABEL_W)
  // How many parallel illness columns fit at minimum width
  const maxLanes = Math.max(1, Math.floor(contentW / MIN_LANE_W))

  const laneMap = useMemo(
    () => assignLanes(illEpisodes, maxLanes),
    [illEpisodes, maxLanes]
  )

  // Episodes overlapping the current window, compacted to consecutive lane indices
  const visEps = useMemo(() => {
    const ws = winStart.getTime()
    const we = winEnd.getTime()
    return illEpisodes
      .filter(ep => {
        if (!laneMap.has(ep.id)) return false
        const s = new Date(ep.started_at).getTime()
        const e = ep.ended_at ? new Date(ep.ended_at).getTime() : Infinity
        return s < we && e > ws
      })
      .sort((a, b) => laneMap.get(a.id)! - laneMap.get(b.id)!)
      .map((ep, i) => ({ ep, lane: i }))   // compact: no empty lane gaps in this window
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [illEpisodes, laneMap, winStart.getTime(), winEnd.getTime()])

  // Column width adapts to how many illnesses are actually concurrent in this window
  const laneW = contentW / Math.max(1, visEps.length)

  const visMeds = useMemo(() => {
    const ws = winStart.getTime()
    const we = winEnd.getTime()
    return medLogs.filter(l => {
      const t = new Date(l.taken_at).getTime()
      return t >= ws && t < we
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medLogs, winStart.getTime(), winEnd.getTime()])

  // Y position (px) for a given Date within the window
  const yOf = (d: Date) => ((d.getTime() - winStart.getTime()) / 86400000) * dayH

  const today = new Date()
  const todayY = yOf(today)

  // When switching modes, keep the window end fixed so context doesn't jump
  const switchMode = (m: 'week' | 'month') => {
    const currentEnd = addDays(winStart, dayCount)
    setWinStart(addDays(currentEnd, -(m === 'week' ? 7 : 30)))
    setMode(m)
  }

  const prev = () => setWinStart(d => mode === 'week' ? addDays(d, -7) : addMonths(d, -1))
  const next = () => setWinStart(d => mode === 'week' ? addDays(d, 7) : addMonths(d, 1))

  const legIll = [...new Map(visEps.map(({ ep }) => [ep.illness.id, ep.illness])).values()]
  const legMed = [...new Map(visMeds.map(l => [l.medication.id, l.medication])).values()]

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-1">
          <button onClick={prev} className="p-1.5 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors">
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <span className="text-sm font-medium text-slate-700 w-[148px] text-center">
            {format(winStart, 'd MMM', { locale: it })} – {format(addDays(winEnd, -1), 'd MMM yyyy', { locale: it })}
          </span>
          <button onClick={next} className="p-1.5 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors">
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          {(['week', 'month'] as const).map(m => (
            <button key={m} onClick={() => switchMode(m)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}>
              {m === 'week' ? '7g' : '30g'}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable timeline body */}
      <div className="overflow-y-auto" style={{ maxHeight: '68vh' }}>
        {/* Outer div measured by ResizeObserver */}
        <div ref={containerRef} className="relative" style={{ height: totalH, overflow: 'hidden' }}>

          {/* Day rows with labels */}
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

          {/* Current time indicator */}
          {todayY >= 0 && todayY <= totalH && (
            <div className="absolute right-0 pointer-events-none z-20"
              style={{ top: Math.round(todayY), left: LABEL_W, borderTop: '2px dashed #818cf8' }} />
          )}

          {/* Content area — overflow hidden clips episodes that bleed outside the window */}
          <div className="absolute inset-y-0" style={{ left: LABEL_W, width: contentW, overflow: 'hidden' }}>

            {/* Illness episode columns */}
            {visEps.map(({ ep, lane }) => {
              const epStart = new Date(ep.started_at)
              const epEnd = ep.ended_at ? new Date(ep.ended_at) : new Date()

              const rawTop = yOf(epStart)
              const rawBot = yOf(epEnd)
              const height = Math.max(4, rawBot - rawTop)
              const left = lane * laneW + 2
              const w = Math.max(4, laneW - 4)

              // Flat top/bottom corners indicate the episode extends beyond the visible window
              const aboveWin = rawTop < 0
              const belowWin = rawBot > totalH
              const br = `${aboveWin ? 2 : 8}px ${aboveWin ? 2 : 8}px ${belowWin ? 2 : 8}px ${belowWin ? 2 : 8}px`

              // Build colour segments from intensity logs
              const logs = [...ep.logs].sort(
                (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
              )
              const totalMs = Math.max(epEnd.getTime() - epStart.getTime(), 1)
              let segs: { color: string; pct: number }[] = []

              if (logs.length === 0) {
                segs = [{ color: ep.illness.color, pct: 100 }]
              } else {
                const prems = Math.max(0, new Date(logs[0].occurred_at).getTime() - epStart.getTime())
                if (prems > 0) segs.push({ color: ep.illness.color + '88', pct: (prems / totalMs) * 100 })
                for (let i = 0; i < logs.length; i++) {
                  const segEnd = i < logs.length - 1 ? new Date(logs[i + 1].occurred_at) : epEnd
                  const ms = Math.max(0, segEnd.getTime() - new Date(logs[i].occurred_at).getTime())
                  const col = logs[i].intensity ? LEVEL_COLORS[logs[i].intensity! - 1] : ep.illness.color
                  segs.push({ color: col, pct: (ms / totalMs) * 100 })
                }
              }
              // Normalise to exactly 100% (avoids floating-point gaps)
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

            {/* Medication horizontal lines */}
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

      {/* Legend */}
      {(legIll.length > 0 || legMed.length > 0) && (
        <div className="px-4 py-2.5 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1.5">
          {legIll.map(ill => (
            <div key={ill.id} className="flex items-center gap-1.5">
              <div className="w-2 rounded-sm" style={{ height: 20, backgroundColor: ill.color }} />
              <span className="text-xs text-slate-600">{ill.emoji} {ill.name}</span>
            </div>
          ))}
          {legMed.map(med => (
            <div key={med.id} className="flex items-center gap-1.5">
              <div className="rounded-full" style={{ width: 20, height: 6, backgroundColor: med.color }} />
              <span className="text-xs text-slate-600">{med.emoji} {med.name}</span>
            </div>
          ))}
        </div>
      )}

      {visEps.length === 0 && visMeds.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">
          Nessuna registrazione in questo periodo
        </p>
      )}
    </div>
  )
}
