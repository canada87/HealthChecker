import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns'
import { it } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DayData {
  date: Date
  medColors: string[]
  illColors: string[]
}

interface Props {
  medLogs: { taken_at: string; medication: { color: string; name: string } }[]
  illLogs: { occurred_at: string; illness: { color: string; name: string } }[]
  onDayClick: (date: Date) => void
}

export default function CalendarView({ medLogs, illLogs, onDayClick }: Props) {
  const [current, setCurrent] = useState(new Date())

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = (getDay(monthStart) + 6) % 7

  const dayData: DayData[] = days.map(date => ({
    date,
    medColors: medLogs
      .filter(l => isSameDay(new Date(l.taken_at), date))
      .map(l => l.medication.color)
      .filter((v, i, a) => a.indexOf(v) === i),
    illColors: illLogs
      .filter(l => isSameDay(new Date(l.occurred_at), date))
      .map(l => l.illness.color)
      .filter((v, i, a) => a.indexOf(v) === i),
  }))

  const prev = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const next = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="p-2 rounded-full hover:bg-slate-100 active:bg-slate-200">
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-semibold text-slate-800 capitalize">
          {format(current, 'MMMM yyyy', { locale: it })}
        </h2>
        <button onClick={next} className="p-2 rounded-full hover:bg-slate-100 active:bg-slate-200">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
        {dayData.map(({ date, medColors, illColors }) => {
          const hasEvents = medColors.length > 0 || illColors.length > 0
          return (
            <button
              key={date.toISOString()}
              onClick={() => onDayClick(date)}
              className={`aspect-square flex flex-col items-center justify-center rounded-xl relative transition-all active:scale-95 ${
                isToday(date)
                  ? 'bg-indigo-600 text-white font-bold'
                  : hasEvents
                  ? 'bg-slate-50 hover:bg-slate-100'
                  : 'hover:bg-slate-50'
              }`}
            >
              <span className={`text-sm ${isToday(date) ? 'text-white' : 'text-slate-700'}`}>
                {format(date, 'd')}
              </span>
              {hasEvents && !isToday(date) && (
                <div className="flex gap-0.5 mt-0.5">
                  {[...medColors.slice(0, 2), ...illColors.slice(0, 2)].map((c, i) => (
                    <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
              )}
              {hasEvents && isToday(date) && (
                <div className="flex gap-0.5 mt-0.5">
                  {[...medColors.slice(0, 2), ...illColors.slice(0, 2)].map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-white/70" />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
