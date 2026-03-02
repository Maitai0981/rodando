<<<<<<< HEAD
import { Suspense } from 'react'
import { Box } from '@mui/material'
import RouteFallback from './components/common/RouteFallback'
import { AppRoutes } from './routes'

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Box sx={{ width: '100%', minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>
        <AppRoutes />
=======
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Box } from '@mui/material'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocation, useNavigationType } from 'react-router-dom'
import RouteFallback from './components/common/RouteFallback'
import { AssistChecklistCard, AssistOverlayIntro } from './components/assist'
import { AppRoutes } from './routes'
import { resolveTransitionDirection, toDirectionLabel } from './routes/transitionMap'

export default function App() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const reduceMotion = useReducedMotion()
  const previousPathRef = useRef(location.pathname)

  const direction = useMemo(
    () =>
      resolveTransitionDirection(
        previousPathRef.current,
        location.pathname,
        navigationType,
      ),
    [location.pathname, navigationType],
  )

  useEffect(() => {
    previousPathRef.current = location.pathname
  }, [location.pathname])

  const routeDirectionLabel = toDirectionLabel(direction)

  return (
    <Suspense fallback={<RouteFallback />}>
      <Box sx={{ width: '100%', minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={location.pathname}
            custom={direction}
            initial={reduceMotion ? false : 'enter'}
            animate="center"
            exit="exit"
            variants={{
              enter: (currentDirection: number) => {
                if (reduceMotion) return { opacity: 0, x: 0 }
                if (currentDirection === 1) return { opacity: 0, x: 34 }
                if (currentDirection === -1) return { opacity: 0, x: -34 }
                return { opacity: 0, x: 0 }
              },
              center: { opacity: 1, x: 0 },
              exit: (currentDirection: number) => {
                if (reduceMotion) return { opacity: 0, x: 0 }
                if (currentDirection === 1) return { opacity: 0, x: -34 }
                if (currentDirection === -1) return { opacity: 0, x: 34 }
                return { opacity: 0, x: 0 }
              },
            }}
            transition={{
              duration: reduceMotion ? 0.18 : 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
            data-route-direction={routeDirectionLabel}
            style={{ width: '100%', minHeight: '100vh', position: 'relative' }}
          >
            <AppRoutes />
          </motion.div>
        </AnimatePresence>
        <AssistOverlayIntro />
        <AssistChecklistCard />
>>>>>>> 00d9f8b1cd49468b71d5f26d93d4a98448814a55
      </Box>
    </Suspense>
  )
}
