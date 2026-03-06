import Box from '@mui/material/Box'
import type { BoxProps } from '@mui/material/Box'
import { useInViewMotion } from '../../hooks/useInViewMotion'
import { cx } from '../utils/cx'

type MotionVariant = 'reveal-up' | 'reveal-fade' | 'reveal-left' | 'reveal-right' | 'reveal-pop'

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
  const variantClassMap: Record<MotionVariant, string> = {
    'reveal-up': 'ds-motion-up',
    'reveal-fade': 'ds-motion-fade',
    'reveal-left': 'ds-motion-left',
    'reveal-right': 'ds-motion-right',
    'reveal-pop': 'ds-motion-pop',
  }

  return (
    <Box
      ref={ref}
      className={cx('ds-motion-target', variantClassMap[variant], isActive && 'ds-motion-in', className)}
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
