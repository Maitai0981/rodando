import { Suspense } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion'
import RouteFallback from './shared/common/RouteFallback'
import { AppRoutes } from './routes'
import { resolveTransitionDirection, toDirectionLabel, type TransitionNavigationType } from './routes/transitionMap'
import { prefetchCriticalRoutes, prefetchRouteChunk } from './routes/prefetch'
import { RouteMotionOrchestrator } from './routes/RouteMotionOrchestrator'

export default function App() {
  const location = useLocation()
  const navigationType = useNavigationType() as TransitionNavigationType
  const previousPathRef = useRef(location.pathname)
  const disableRouteMotion = String(import.meta.env.VITE_DISABLE_ROUTE_MOTION || '0') === '1'

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
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        <Suspense fallback={<RouteFallback />}>
          {disableRouteMotion ? (
            <AppRoutes />
          ) : (
            <RouteMotionOrchestrator routeKey={location.pathname} direction={direction}>
              <AppRoutes />
            </RouteMotionOrchestrator>
          )}
        </Suspense>
      </MotionConfig>
    </LazyMotion>
  )
}
