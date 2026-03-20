import Box from '@mui/material/Box'
import type { BoxProps } from '@mui/material/Box'
import { m, useReducedMotion, type Variants } from 'framer-motion'
import { cx } from '../utils/cx'

type MotionVariant = 'reveal-up' | 'reveal-fade' | 'reveal-left' | 'reveal-right' | 'reveal-pop'

export interface MotionRevealProps extends BoxProps {
  variant?: MotionVariant
  delayMs?: number
  threshold?: number
  once?: boolean
}

const variantMap: Record<MotionVariant, Variants> = {
  'reveal-up': {
    hidden: { opacity: 0, y: 20, clipPath: 'inset(0 0 12% 0 round 20px)', filter: 'blur(5px)' },
    visible: { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0 round 20px)', filter: 'blur(0px)' },
  },
  'reveal-fade': {
    hidden: { opacity: 0, scale: 0.994, filter: 'blur(4px)' },
    visible: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  },
  'reveal-left': {
    hidden: { opacity: 0, x: -24, filter: 'blur(5px)' },
    visible: { opacity: 1, x: 0, filter: 'blur(0px)' },
  },
  'reveal-right': {
    hidden: { opacity: 0, x: 24, filter: 'blur(5px)' },
    visible: { opacity: 1, x: 0, filter: 'blur(0px)' },
  },
  'reveal-pop': {
    hidden: { opacity: 0, scale: 0.95, filter: 'blur(4px)' },
    visible: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  },
}

export function MotionReveal({
  variant = 'reveal-up',
  delayMs = 0,
  threshold = 0.18,
  once = true,
  className,
  children,
  ...rest
}: MotionRevealProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return (
      <Box className={cx(className)} {...rest}>
        {children}
      </Box>
    )
  }

  return (
    <Box
      component={m.div}
      className={cx(className)}
      variants={variantMap[variant]}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: threshold }}
      transition={{
        duration: 0.46,
        ease: [0.22, 1, 0.36, 1],
        delay: delayMs / 1000,
      }}
      {...rest}
    >
      {children}
    </Box>
  )
}
