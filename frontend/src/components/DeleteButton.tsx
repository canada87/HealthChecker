import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'

const ARMED_MS = 4000

interface Props {
  onConfirm: () => void | Promise<void>
  label?: string
  size?: number
  className?: string
}

// Two-step delete: the first click arms the button ("Elimina?"), the second deletes.
// Disarms on its own after a few seconds or when focus leaves.
export default function DeleteButton({ onConfirm, label = 'Elimina', size = 15, className = '' }: Props) {
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), ARMED_MS)
    return () => window.clearTimeout(t)
  }, [armed])

  const handleClick = async () => {
    if (!armed) { setArmed(true); return }
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
      setArmed(false)
    }
  }

  if (armed) {
    return (
      <button
        onClick={handleClick}
        onBlur={() => setArmed(false)}
        disabled={busy}
        aria-label={`Conferma: ${label}`}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-50"
        autoFocus
      >
        <Trash2 size={13} aria-hidden="true" /> Elimina?
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={`p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 ${className}`}
    >
      <Trash2 size={size} />
    </button>
  )
}
