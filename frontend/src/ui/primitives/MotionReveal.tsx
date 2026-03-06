import Box from '@mui/material/Box'
import type { BoxProps } from '@mui/material/Box'
import { useInViewMotion } from '../../hooks/useInViewMotion'
import { cx } from '../utils/cx'

type MotionVariant = 'reveal-up' | 'reveal-fade'

export interface MotionRevealProps extends BoxProps {
  variant?: MotionVariant
  delayMs?: number
  threshold?: number
  once?: boolean
}

export function MotionReveal({
  variant = 'reveal-up',
  delayMs = 0,
  threshold = 0.18,
  once = true,
  className,
  style,
  children,
  ...rest
}: MotionRevealProps) {
  const { ref, isActive } = useInViewMotion({ threshold, once })

  return (
    <Box
      ref={ref}
      className={cx('ds-motion-target', variant === 'reveal-fade' ? 'ds-motion-fade' : 'ds-motion-up', isActive && 'ds-motion-in', className)}
      style={{
        ...style,
        ['--ds-motion-delay' as string]: `${delayMs}ms`,
      }}
      {...rest}
    >
      {children}
    </Box>
  )
}

