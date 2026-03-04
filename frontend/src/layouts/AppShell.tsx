import Box from '@mui/material/Box'
import type { BoxProps } from '@mui/material/Box'
import type { PropsWithChildren } from 'react'
import { Shell, Container } from '../ui'

export interface AppShellProps extends PropsWithChildren {
  /**
   * Wraps page content with `UiContainer` for shared horizontal spacing.
   */
  contained?: boolean
  containerProps?: {
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    disableGutters?: boolean
  }
  mainProps?: BoxProps
}

export function AppShell({
  children,
  contained = true,
  containerProps,
  mainProps,
}: AppShellProps) {
  return (
    <Shell
      contained={false}
      contentPaddingTop={{ xs: 14.5, sm: 15, md: 12 }}
      contentPaddingBottom={{ xs: 11.5, md: 7 }}
    >
      <Box component="main" {...mainProps}>
        {contained ? <Container {...containerProps}>{children}</Container> : children}
      </Box>
    </Shell>
  )
}
