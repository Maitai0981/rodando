import { Suspense } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import RouteFallback from './components/common/RouteFallback'
import { AppRoutes } from './routes'
import { resolveTransitionDirection, toDirectionLabel, type TransitionNavigationType } from './routes/transitionMap'
import { prefetchCriticalRoutes, prefetchRouteChunk } from './routes/prefetch'

export default function App() {
  const location = useLocation()
  const navigationType = useNavigationType() as TransitionNavigationType
  const previousPathRef = useRef(location.pathname)

  const direction = useMemo(() => {
    const resolved = resolveTransitionDirection(previousPathRef.current, location.pathname, navigationType)
    return toDirectionLabel(resolved)
  }, [location.pathname, navigationType])

  useEffect(() => {
    previousPathRef.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    prefetchRouteChunk(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const idleWindow = window as Window & typeof globalThis & {
      requestIdleCallback?: (cb: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (typeof idleWindow.requestIdleCallback === 'function') {
      const idleId = idleWindow.requestIdleCallback(() => {
        prefetchCriticalRoutes()
      }, { timeout: 1200 })
      return () => idleWindow.cancelIdleCallback?.(idleId)
    }
    const timeoutId = window.setTimeout(() => {
      prefetchCriticalRoutes()
    }, 240)
    return () => window.clearTimeout(timeoutId)
  }, [])

  return (
    <Suspense fallback={<RouteFallback />}>
      <div
        data-route-direction={direction}
        style={{ width: '100%', minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}
      >
        <AppRoutes />
      </div>
    </Suspense>
  )
}
