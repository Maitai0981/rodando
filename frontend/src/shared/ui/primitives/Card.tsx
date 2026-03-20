import Paper from '@mui/material/Paper'
import type { PaperProps } from '@mui/material/Paper'
import type { CardProps } from '../types'

type UiCardProps = Omit<PaperProps, 'variant'> & CardProps

export function Card({ variant = 'surface', interactive = false, sx, ...props }: UiCardProps) {
  const backgroundByVariant: Record<NonNullable<CardProps['variant']>, string> = {
    feature: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,252,248,0.92))',
    testimonial: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,252,248,0.95))',
    surface: '#FFFFFF',
  }

  const composedClassName = ['ds-cinematic-card', interactive ? 'ds-hover-lift' : '', props.className].filter(Boolean).join(' ')

  return (
    <Paper
      elevation={0}
      {...props}
      className={composedClassName}
      sx={{
        p: 2,
        borderRadius: 3,
        border: 'none',
        background: backgroundByVariant[variant],
        transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1), filter 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        ...(interactive
          ? {
              '&:hover': {
                transform: 'translateY(-3px) scale(1.004)',
                boxShadow: '0 14px 28px rgba(14,27,46,0.14)',
                filter: 'saturate(1.02)',
              },
              '&:active': {
                transform: 'scale(0.985)',
              },
            }
          : null),
        ...(sx as object),
      }}
    />
  )
}
