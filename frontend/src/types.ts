export interface User {
  id: number
  name: string
  is_admin: boolean
}

export interface Medication {
  id: number
  user_id: number
  name: string
  color: string
  emoji: string
}

export interface Illness {
  id: number
  user_id: number
  name: string
  color: string
  emoji: string
}

export interface MedicationLog {
  id: number
  medication_id: number
  taken_at: string
  notes: string | null
  medication: Medication
}

export interface IllnessLog {
  id: number
  illness_id: number
  episode_id: number | null
  occurred_at: string
  intensity: number | null
  notes: string | null
  illness: Illness
}

export interface IllnessEpisodeLog {
  id: number
  occurred_at: string
  intensity: number | null
  notes: string | null
}

export interface IllnessEpisode {
  id: number
  illness_id: number
  user_id: number
  started_at: string
  ended_at: string | null
  illness: Illness
  logs: IllnessEpisodeLog[]
}

export interface StatItem {
  id: number
  name: string
  color: string
  emoji: string
  last_at: string | null
  count_7d: number
  count_30d: number
  count_total: number
}
