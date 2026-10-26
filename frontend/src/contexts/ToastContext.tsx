import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'

interface Toast {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
}

type ShowToast = (toast: Omit<Toast, 'id'>) => void

const TOAST_MS = 5000

const ToastContext = createContext<ShowToast>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number>()
  const nextId = useRef(0)

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current)
    setToast(null)
  }, [])

  // One toast at a time: a new one replaces the previous (and its undo).
  const show = useCallback<ShowToast>(t => {
    window.clearTimeout(timer.current)
    setToast({ ...t, id: nextId.current++ })
    timer.current = window.setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Above the bottom nav on mobile, bottom-right on desktop */}
      <div
        aria-live="polite"
        className="fixed z-[60] inset-x-4 bottom-20 flex justify-center pointer-events-none lg:inset-x-auto lg:right-6 lg:bottom-6"
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 bg-slate-800 text-white text-sm rounded-xl shadow-lg pl-4 pr-2 py-2 max-w-sm"
          >
            <Check size={16} className="text-green-400 shrink-0" aria-hidden="true" />
            <span className="flex-1">{toast.message}</span>
            {toast.onAction && (
              <button
                onClick={() => { toast.onAction!(); dismiss() }}
                className="px-2 py-1 rounded-lg font-semibold text-indigo-300 hover:bg-white/10"
              >
                {toast.actionLabel ?? 'Annulla'}
              </button>
            )}
            <button onClick={dismiss} aria-label="Chiudi notifica" className="p-1 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white">
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
