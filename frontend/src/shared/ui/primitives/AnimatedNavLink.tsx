import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'
import { m, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { useMemo, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'

type AnimatedNavLinkProps = {
  to: string
  label: string
  icon?: ReactNode
  testId?: string
  active?: boolean
  orientation?: 'horizontal' | 'vertical'
  layoutId: string
  onIntent?: (pathname: string) => void
  onSelect?: () => void
  sx?: SxProps<Theme>
  contentSx?: SxProps<Theme>
  indicatorSx?: SxProps<Theme>
}

type Ripple = {
  id: number
  x: number
  y: number
}

export function AnimatedNavLink({
  to,
  label,
  icon,
  testId,
  active = false,
  orientation = 'horizontal',
  layoutId,
  onIntent,
  onSelect,
  sx,
  contentSx,
  indicatorSx,
}: AnimatedNavLinkProps) {
  const reduceMotion = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const springX = useSpring(mx, { stiffness: 280, damping: 20, mass: 0.3 })
  const springY = useSpring(my, { stiffness: 280, damping: 20, mass: 0.3 })
  const [ripples, setRipples] = useState<Ripple[]>([])
  const [rippleSeed, setRippleSeed] = useState(0)

  const transformStyle = useMemo(
    () => (reduceMotion ? undefined : { x: springX, y: springY }),
    [reduceMotion, springX, springY],
  )

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (reduceMotion) return
    const rect = event.currentTarget.getBoundingClientRect()
    const relX = event.clientX - rect.left - rect.width / 2
    const relY = event.clientY - rect.top - rect.height / 2
    mx.set(Math.max(-5, Math.min(5, relX * 0.06)))
    my.set(Math.max(-3, Math.min(3, relY * 0.07)))
  }

  function handlePointerLeave() {
    if (reduceMotion) return
    mx.set(0)
    my.set(0)
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const id = rippleSeed + 1
    setRippleSeed(id)
    setRipples((prev) => [...prev, { id, x, y }])
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((entry) => entry.id !== id))
    }, 620)
  }

  return (
    <Box
      component={m.div}
      className="ds-pressable ds-cinematic-nav"
      style={transformStyle}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      sx={{ display: 'block' }}
    >
      <Box
        component={RouterLink}
        to={to}
        data-testid={testId}
        aria-current={active ? 'page' : undefined}
        onMouseEnter={() => onIntent?.(to)}
        onFocus={() => onIntent?.(to)}
        onTouchStart={() => onIntent?.(to)}
        onClick={onSelect}
        sx={{
          position: 'relative',
          isolation: 'isolate',
          overflow: 'hidden',
          borderRadius: 2,
          minHeight: orientation === 'vertical' ? 54 : 42,
          px: orientation === 'vertical' ? 0.4 : 1.6,
          py: orientation === 'vertical' ? 0.6 : 0.4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          ...sx,
        }}
      >
        {active ? (
          <Box
            component={m.span}
            layoutId={layoutId}
            transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 420, damping: 34, mass: 0.62 }}
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              background:
                orientation === 'vertical'
                  ? 'linear-gradient(165deg, rgba(31,63,103,0.96) 0%, rgba(19,42,72,0.98) 100%)'
                  : 'linear-gradient(140deg, rgba(255,241,207,0.92) 0%, rgba(255,249,232,0.88) 100%)',
              border: 'none',
              zIndex: 0,
              boxShadow:
                orientation === 'vertical'
                  ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 12px 22px rgba(19,42,72,0.34)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.4), 0 10px 18px rgba(216,154,42,0.22)',
              ...indicatorSx,
            }}
          />
        ) : null}

        {ripples.map((ripple) => (
          <Box
            key={ripple.id}
            component={m.span}
            initial={{ scale: 0.04, opacity: 0.42 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={reduceMotion ? { duration: 0.01 } : { duration: 0.56, ease: [0.2, 0, 0, 1] }}
            sx={{
              position: 'absolute',
              width: 88,
              height: 88,
              left: ripple.x - 44,
              top: ripple.y - 44,
              borderRadius: '50%',
              background: orientation === 'vertical' ? 'rgba(255,255,255,0.4)' : 'rgba(216,154,42,0.24)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        ))}

        <Stack
          direction={orientation === 'vertical' ? 'column' : 'row'}
          alignItems="center"
          justifyContent="center"
          spacing={orientation === 'vertical' ? 0.32 : 0.75}
          sx={{
            position: 'relative',
            zIndex: 2,
            minWidth: 0,
            color: active ? (orientation === 'vertical' ? '#FFFFFF' : 'primary.dark') : 'text.secondary',
            ...contentSx,
          }}
        >
          {icon ? <Box sx={{ lineHeight: 0 }}>{icon}</Box> : null}
          <Typography
            component="span"
            sx={{
              fontSize: orientation === 'vertical' ? { xs: 11, sm: 11.5 } : 15,
              lineHeight: 1.08,
              fontWeight: active ? 700 : 600,
              letterSpacing: active ? '-0.003em' : 0,
              color: 'inherit',
              textShadow: active && orientation === 'vertical' ? '0 1px 2px rgba(0,0,0,0.22)' : 'none',
            }}
          >
            {label}
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}
