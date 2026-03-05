import Paper from '@mui/material/Paper'
import type { PaperProps } from '@mui/material/Paper'
import type { CardProps } from '../types'

type UiCardProps = Omit<PaperProps, 'variant'> & CardProps

export function Card({ variant = 'surface', interactive = false, sx, ...props }: UiCardProps) {
  const backgroundByVariant: Record<NonNullable<CardProps['variant']>, string> = {
    feature: 'linear-gradient(180deg, rgba(255,250,238,0.96), rgba(255,255,255,0.94))',
    testimonial: 'linear-gradient(180deg, rgba(252,251,247,0.98), rgba(255,255,255,0.98))',
    surface: '#FFFFFF',
  }

  return (
    <Paper
      elevation={0}
      {...props}
      sx={{
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        background: backgroundByVariant[variant],
        transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
        ...(interactive
          ? {
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 28px rgba(20,34,53,0.14)',
                borderColor: 'rgba(28,156,75,0.35)',
              },
              '&:active': {
                transform: 'scale(0.992)',
              },
            }
          : null),
        ...(sx as object),
      }}
    />
  )
}
