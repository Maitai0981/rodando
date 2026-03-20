import MuiBadge from '@mui/material/Badge'
import Chip from '@mui/material/Chip'
import type { UiTone } from '../types'
import type { ReactNode } from 'react'

const toneToColor: Record<UiTone, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
  default: 'default',
  accent: 'primary',
  gold: 'secondary',
  success: 'success',
  warning: 'warning',
  danger: 'error',
  neutral: 'default',
}

export function Badge({
  label,
  tone = 'default',
}: {
  label: string
  tone?: UiTone
}) {
  return <Chip size="small" label={label} color={toneToColor[tone]} variant={tone === 'default' || tone === 'neutral' ? 'outlined' : 'filled'} />
}

export function CounterBadge({
  content,
  children,
}: {
  content: number
  children: ReactNode
}) {
  return (
    <MuiBadge badgeContent={content} color="secondary" max={99}>
      {children}
    </MuiBadge>
  )
}
