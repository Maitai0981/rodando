import type { ReactNode } from 'react'
import type { SxProps, Theme } from '@mui/material/styles'
import { AnimatedNavLink } from './AnimatedNavLink'

export interface NavTransitionProps {
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

export function NavTransition(props: NavTransitionProps) {
  return <AnimatedNavLink {...props} />
}

