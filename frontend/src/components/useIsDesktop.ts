import { useEffect, useState } from 'react'

// Matches Tailwind's `lg` breakpoint, where the sidebar layout kicks in.
const QUERY = '(min-width: 1024px)'

export default function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isDesktop
}
