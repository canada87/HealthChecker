import type { User, Medication, Illness, MedicationLog, IllnessLog, IllnessEpisode, StatItem } from './types'

const BASE = '/api'

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  getUsers: () => req<User[]>('/users'),
  createUser: (name: string, is_admin = false) =>
    req<User>('/users', { method: 'POST', body: JSON.stringify({ name, is_admin }) }),
  updateUser: (id: number, data: Partial<User>) =>
    req<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: number) => req<void>(`/users/${id}`, { method: 'DELETE' }),

  getMedications: (userId: number) => req<Medication[]>(`/users/${userId}/medications`),
  createMedication: (userId: number, data: { name: string; color: string; emoji: string }) =>
    req<Medication>(`/users/${userId}/medications`, { method: 'POST', body: JSON.stringify(data) }),
  updateMedication: (id: number, data: Partial<Medication>) =>
    req<Medication>(`/medications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMedication: (id: number) => req<void>(`/medications/${id}`, { method: 'DELETE' }),

  getIllnesses: (userId: number) => req<Illness[]>(`/users/${userId}/illnesses`),
  createIllness: (userId: number, data: { name: string; color: string; emoji: string }) =>
    req<Illness>(`/users/${userId}/illnesses`, { method: 'POST', body: JSON.stringify(data) }),
  updateIllness: (id: number, data: Partial<Illness>) =>
    req<Illness>(`/illnesses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIllness: (id: number) => req<void>(`/illnesses/${id}`, { method: 'DELETE' }),

  logMedication: (medId: number, notes?: string, takenAt?: string) =>
    req<MedicationLog>(`/medications/${medId}/log`, { method: 'POST', body: JSON.stringify({ notes: notes ?? null, taken_at: takenAt ?? null }) }),
  logIllness: (illId: number, notes?: string, takenAt?: string) =>
    req<IllnessLog>(`/illnesses/${illId}/log`, { method: 'POST', body: JSON.stringify({ notes: notes ?? null, taken_at: takenAt ?? null }) }),

  getMedicationLogs: (userId: number, year?: number, month?: number) => {
    const params = year && month ? `?year=${year}&month=${month}` : ''
    return req<MedicationLog[]>(`/users/${userId}/medication-logs${params}`)
  },
  getIllnessLogs: (userId: number, year?: number, month?: number) => {
    const params = year && month ? `?year=${year}&month=${month}` : ''
    return req<IllnessLog[]>(`/users/${userId}/illness-logs${params}`)
  },
  updateMedicationLog: (id: number, takenAt: string) =>
    req<MedicationLog>(`/medication-logs/${id}`, { method: 'PATCH', body: JSON.stringify({ taken_at: takenAt }) }),
  updateIllnessLog: (id: number, takenAt: string) =>
    req<IllnessLog>(`/illness-logs/${id}`, { method: 'PATCH', body: JSON.stringify({ taken_at: takenAt }) }),
  deleteMedicationLog: (id: number) => req<void>(`/medication-logs/${id}`, { method: 'DELETE' }),
  deleteIllnessLog: (id: number) => req<void>(`/illness-logs/${id}`, { method: 'DELETE' }),

  // Episode API
  startIllnessEpisode: (illId: number, intensity: number, notes?: string, startedAt?: string) =>
    req<IllnessEpisode>(`/illnesses/${illId}/episode`, { method: 'POST', body: JSON.stringify({ intensity, notes: notes ?? null, started_at: startedAt ?? null }) }),
  addEpisodeIntensityLog: (epId: number, intensity: number, notes?: string, occurredAt?: string) =>
    req<IllnessEpisode>(`/illness-episodes/${epId}/log`, { method: 'POST', body: JSON.stringify({ intensity, notes: notes ?? null, occurred_at: occurredAt ?? null }) }),
  endIllnessEpisode: (epId: number, endedAt?: string) =>
    req<IllnessEpisode>(`/illness-episodes/${epId}/end`, { method: 'PATCH', body: JSON.stringify({ ended_at: endedAt ?? null }) }),
  updateIllnessEpisode: (epId: number, data: { started_at?: string; ended_at?: string | null }) =>
    req<IllnessEpisode>(`/illness-episodes/${epId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateEpisodeLog: (logId: number, data: { intensity?: number; occurred_at?: string }) =>
    req<IllnessEpisode>(`/illness-episode-logs/${logId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEpisodeLog: (logId: number) => req<void>(`/illness-episode-logs/${logId}`, { method: 'DELETE' }),
  deleteIllnessEpisode: (epId: number) => req<void>(`/illness-episodes/${epId}`, { method: 'DELETE' }),
  getIllnessEpisodes: (userId: number) => req<IllnessEpisode[]>(`/users/${userId}/illness-episodes`),
  getActiveIllnessEpisodes: (userId: number) => req<IllnessEpisode[]>(`/users/${userId}/illness-episodes/active`),

  getMedicationStats: (userId: number, windowDays?: number) =>
    req<StatItem[]>(`/users/${userId}/stats/medications${windowDays ? `?window_days=${windowDays}` : ''}`),
  getIllnessStats: (userId: number, windowDays?: number) =>
    req<StatItem[]>(`/users/${userId}/stats/illnesses${windowDays ? `?window_days=${windowDays}` : ''}`),
}
