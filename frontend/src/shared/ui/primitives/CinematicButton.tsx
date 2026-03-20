import type { ButtonProps } from '../types'
import { Button } from './Button'

export function CinematicButton(props: ButtonProps) {
  const className = ['ds-cinematic-button', props.className].filter(Boolean).join(' ')
  return <Button {...props} className={className} />
}

