import { Suspense } from 'react'
import { Box } from '@mui/material'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocation } from 'react-router-dom'
import RouteFallback from './components/common/RouteFallback'
import { AppRoutes } from './routes'

export default function App() {
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  return (
    <Suspense fallback={<RouteFallback />}>
      <Box sx={{ width: '100%', minHeight: '100vh', overflowX: 'clip', position: 'relative' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={reduceMotion ? false : { opacity: 0, x: 34 }}
            animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -34 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: '100%', minHeight: '100vh', position: 'relative' }}
          >
            <AppRoutes />
          </motion.div>
        </AnimatePresence>
      </Box>
    </Suspense>
  )
}
