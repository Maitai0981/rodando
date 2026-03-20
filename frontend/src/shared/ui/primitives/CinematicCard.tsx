import type { PaperProps } from '@mui/material/Paper'
import type { CardProps } from '../types'
import { Card } from './Card'

type CinematicCardProps = Omit<PaperProps, 'variant'> & CardProps

export function CinematicCard(props: CinematicCardProps) {
  const className = ['ds-cinematic-card', props.className].filter(Boolean).join(' ')
  return <Card {...props} className={className} interactive={props.interactive ?? true} />
}

