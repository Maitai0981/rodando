import type { PropsWithChildren } from 'react'
import { AnimatePresence, m, type Variants, useReducedMotion } from 'framer-motion'

type RouteDirection = 'left' | 'right' | 'fade'

type RouteMotionOrchestratorProps = PropsWithChildren<{
  routeKey: string
  direction: RouteDirection
}>

const routeVariants: Variants = {
  initial: ({ direction, reduceMotion }: { direction: RouteDirection; reduceMotion: boolean }) => {
    if (reduceMotion || direction === 'fade') {
      return { opacity: 0 }
    }
    return {
      opacity: 0,
      x: direction === 'left' ? 30 : -30,
      y: 10,
      scale: 0.992,
      filter: 'blur(6px)',
    }
  },
  animate: ({ reduceMotion }: { direction: RouteDirection; reduceMotion: boolean }) => ({
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: reduceMotion ? 0.01 : 0.6,
      ease: [0.22, 1, 0.36, 1],
      opacity: { duration: reduceMotion ? 0.01 : 0.5 },
    },
  }),
  exit: ({ direction, reduceMotion }: { direction: RouteDirection; reduceMotion: boolean }) => {
    if (reduceMotion || direction === 'fade') {
      return {
        opacity: 0,
        transition: { duration: reduceMotion ? 0.01 : 0.34 },
      }
    }
    return {
      opacity: 0,
      x: direction === 'left' ? -20 : 20,
      y: -8,
      scale: 0.996,
      filter: 'blur(4px)',
      transition: {
        duration: reduceMotion ? 0.01 : 0.34,
        ease: [0.4, 0, 0.2, 1],
      },
    }
  },
}

export function RouteMotionOrchestrator({ routeKey, direction, children }: RouteMotionOrchestratorProps) {
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={routeKey}
        custom={{ direction, reduceMotion: Boolean(reduceMotion) }}
        data-route-direction={direction}
        variants={routeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="w-full min-h-screen overflow-x-hidden relative"
      >
        {children}
      </m.div>
    </AnimatePresence>
  )
}
