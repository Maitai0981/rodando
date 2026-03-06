import { useEffect, useRef, useState } from 'react'

type UseInViewMotionOptions = {
  threshold?: number
  once?: boolean
}

export function useInViewMotion(options: UseInViewMotionOptions = {}) {
  const { threshold = 0.18, once = true } = options
  const ref = useRef<HTMLElement | null>(null)
  const [isInView, setIsInView] = useState(false)
  const [hasEntered, setHasEntered] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)
    updatePreference()

    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsInView(true)
      setHasEntered(true)
      return
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true)
      setHasEntered(true)
      return
    }

    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return

        if (entry.isIntersecting) {
          setIsInView(true)
          setHasEntered(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setIsInView(false)
        }
      },
      {
        threshold,
      },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [once, prefersReducedMotion, threshold])

  return {
    ref,
    isActive: once ? hasEntered : isInView,
    prefersReducedMotion,
  }
}
