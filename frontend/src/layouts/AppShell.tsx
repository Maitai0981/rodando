import Box from '@mui/material/Box'
import type { BoxProps } from '@mui/material/Box'
import type { PropsWithChildren } from 'react'
import { Footer, Header } from '../components/sections'
import { UiContainer, type UiContainerProps } from '../components/ui'

export interface AppShellProps extends PropsWithChildren {
  /**
   * Wraps page content with `UiContainer` for shared horizontal spacing.
   */
  contained?: boolean
  containerProps?: UiContainerProps
  mainProps?: BoxProps
}

export function AppShell({
  children,
  contained = true,
  containerProps,
  mainProps,
}: AppShellProps) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Box
        component="main"
        {...mainProps}
        sx={[
          {
            flexGrow: 1,
            pt: { xs: 10, md: 13 },
            pb: { xs: 5, md: 8 },
          },
          ...(Array.isArray(mainProps?.sx) ? mainProps.sx : [mainProps?.sx]),
        ]}
      >
        {contained ? <UiContainer {...containerProps}>{children}</UiContainer> : children}
      </Box>
      <Footer />
    </Box>
  )
}
