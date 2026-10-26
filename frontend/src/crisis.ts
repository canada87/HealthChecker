import type { Crisis } from './types'

// Minutes between start and end; null while the crisis is still in progress.
export function durationMinutes(c: Pick<Crisis, 'started_at' | 'ended_at'>): number | null {
  if (!c.ended_at) return null
  return Math.max(0, (new Date(c.ended_at).getTime() - new Date(c.started_at).getTime()) / 60000)
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—'
  if (minutes < 1) return '< 1 min'
  const m = Math.round(minutes)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h} h ${rest} min` : `${h} h`
}

// Live timer text for a running crisis, e.g. "4:07" or "1:02:30".
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}
