import Box from '@mui/material/Box'
import type { BoxProps } from '@mui/material/Box'
import { useRef } from 'react'
import { m, useReducedMotion, type Variants } from 'framer-motion'

type SceneTone = 'default' | 'deep' | 'light'

export interface MotionSceneProps extends BoxProps {
  delayMs?: number
  tone?: SceneTone
}

const sceneVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.994, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
  },
}

const toneOverlayByTone: Record<
  SceneTone,
  {
    primary: string
    secondary: string
    volume: string
    primaryOpacity: number
    secondaryOpacity: number
    volumeOpacity: number
  }
> = {
  default: {
    primary:
      'radial-gradient(96% 108% at 10% 10%, rgba(216,154,42,0.24) 0%, rgba(216,154,42,0) 72%), repeating-linear-gradient(112deg, rgba(216,154,42,0.2) 0 28px, rgba(216,154,42,0) 28px 62px)',
    secondary:
      'conic-gradient(from 196deg at 88% 100%, rgba(19,42,72,0.26), rgba(19,42,72,0) 56%), radial-gradient(114% 102% at 84% 20%, rgba(31,63,103,0.22) 0%, rgba(31,63,103,0) 68%)',
    volume:
      'radial-gradient(136% 124% at 50% 52%, rgba(255,247,228,0.82) 0%, rgba(255,247,228,0) 70%), radial-gradient(106% 104% at 18% 84%, rgba(216,154,42,0.16) 0%, rgba(216,154,42,0) 72%)',
    primaryOpacity: 0.84,
    secondaryOpacity: 0.74,
    volumeOpacity: 0.82,
  },
  deep: {
    primary:
      'radial-gradient(98% 108% at 8% 12%, rgba(216,154,42,0.34) 0%, rgba(216,154,42,0) 70%), repeating-linear-gradient(112deg, rgba(216,154,42,0.24) 0 28px, rgba(216,154,42,0) 28px 62px)',
    secondary:
      'conic-gradient(from 194deg at 90% 102%, rgba(19,42,72,0.38), rgba(19,42,72,0) 54%), radial-gradient(106% 100% at 84% 22%, rgba(31,63,103,0.32) 0%, rgba(31,63,103,0) 66%)',
    volume:
      'radial-gradient(140% 126% at 52% 54%, rgba(255,247,228,0.74) 0%, rgba(255,247,228,0) 70%), radial-gradient(108% 106% at 20% 86%, rgba(216,154,42,0.18) 0%, rgba(216,154,42,0) 74%)',
    primaryOpacity: 0.92,
    secondaryOpacity: 0.82,
    volumeOpacity: 0.78,
  },
  light: {
    primary:
      'radial-gradient(90% 96% at 12% 14%, rgba(216,154,42,0.2) 0%, rgba(216,154,42,0) 70%), repeating-linear-gradient(112deg, rgba(216,154,42,0.16) 0 24px, rgba(216,154,42,0) 24px 56px)',
    secondary:
      'conic-gradient(from 196deg at 88% 98%, rgba(19,42,72,0.22), rgba(19,42,72,0) 58%), radial-gradient(112% 100% at 82% 22%, rgba(31,63,103,0.2) 0%, rgba(31,63,103,0) 70%)',
    volume:
      'radial-gradient(132% 120% at 50% 52%, rgba(255,247,228,0.86) 0%, rgba(255,247,228,0) 72%), radial-gradient(102% 100% at 20% 84%, rgba(216,154,42,0.14) 0%, rgba(216,154,42,0) 72%)',
    primaryOpacity: 0.74,
    secondaryOpacity: 0.64,
    volumeOpacity: 0.86,
  },
}

export function MotionScene({
  children,
  delayMs = 0,
  tone = 'default',
  sx,
  ...rest
}: MotionSceneProps) {
  const reduceMotion = useReducedMotion()
  const sceneRef = useRef<HTMLDivElement | null>(null)
  const overlay = toneOverlayByTone[tone]

  if (reduceMotion) {
    return (
      <Box
        ref={sceneRef}
        {...rest}
        sx={{
          position: 'relative',
          overflow: 'clip',
          '& .motion-scene__decor': {
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 0,
          },
          '& .motion-scene__decor--primary': {
            inset: '-12% -8% auto',
            height: '52%',
            background: overlay.primary,
            opacity: overlay.primaryOpacity * 0.7,
          },
          '& .motion-scene__decor--secondary': {
            inset: 'auto -10% -12%',
            height: '58%',
            background: overlay.secondary,
            opacity: overlay.secondaryOpacity * 0.74,
          },
          '& .motion-scene__decor--volume': {
            inset: '-6% -6% -6%',
            background: overlay.volume,
            opacity: overlay.volumeOpacity * 0.8,
            filter: 'blur(0.6px)',
          },
          '& .motion-scene__content': {
            position: 'relative',
            zIndex: 1,
          },
          ...sx,
        }}
      >
        <Box className="motion-scene__decor motion-scene__decor--primary" aria-hidden />
        <Box className="motion-scene__decor motion-scene__decor--secondary" aria-hidden />
        <Box className="motion-scene__decor motion-scene__decor--volume" aria-hidden />
        <Box className="motion-scene__content">{children}</Box>
      </Box>
    )
  }

  return (
    <Box
      component={m.div}
      ref={sceneRef}
      variants={sceneVariants}
      initial="hidden"
      animate="visible"
      transition={{
        duration: 0.62,
        ease: [0.22, 1, 0.36, 1],
        delay: delayMs / 1000,
      }}
      {...rest}
      sx={{
        position: 'relative',
        overflow: 'clip',
        '& .motion-scene__decor': {
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: 0,
        },
        '& .motion-scene__decor--primary': {
          inset: '-12% -8% auto',
          height: '52%',
          background: overlay.primary,
          opacity: overlay.primaryOpacity,
        },
        '& .motion-scene__decor--secondary': {
          inset: 'auto -10% -12%',
          height: '58%',
          background: overlay.secondary,
          opacity: overlay.secondaryOpacity,
        },
        '& .motion-scene__decor--volume': {
          inset: '-6% -6% -6%',
          background: overlay.volume,
          opacity: overlay.volumeOpacity,
          filter: 'blur(0.6px)',
        },
        '& .motion-scene__content': {
          position: 'relative',
          zIndex: 1,
        },
        ...sx,
      }}
    >
      <Box component={m.div} className="motion-scene__decor motion-scene__decor--primary" aria-hidden />
      <Box component={m.div} className="motion-scene__decor motion-scene__decor--secondary" aria-hidden />
      <Box component={m.div} className="motion-scene__decor motion-scene__decor--volume" aria-hidden />
      <Box className="motion-scene__content">{children}</Box>
    </Box>
  )
}
