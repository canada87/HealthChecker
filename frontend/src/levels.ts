// Illness intensity scale (1–5), shared by every view that shows or picks a level.
export const LEVELS = [
  { value: 1, label: 'Lieve', color: '#22c55e' },
  { value: 2, label: 'Moderata', color: '#84cc16' },
  { value: 3, label: 'Forte', color: '#eab308' },
  { value: 4, label: 'Molto forte', color: '#f97316' },
  { value: 5, label: 'Severa', color: '#ef4444' },
]

export const LEVEL_COLORS = LEVELS.map(l => l.color)
export const LEVEL_LABELS = LEVELS.map(l => l.label)
