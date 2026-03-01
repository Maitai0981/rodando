import Box from '@mui/material/Box'
import type { BoxProps } from '@mui/material/Box'
import type { PropsWithChildren } from 'react'
import { Footer, Header } from '../components/sections'
import { MobileBottomNav } from '../components/layout'
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
            width: '100%',
            maxWidth: 'var(--app-content-max-width)',
            mx: 'auto',
            px: { xs: 1.5, sm: 2, md: 3 },
            pt: { xs: 14.5, sm: 15, md: 12 },
            pb: { xs: 11.5, md: 7 },
          },
          ...(Array.isArray(mainProps?.sx) ? mainProps.sx : [mainProps?.sx]),
        ]}
      >
        {contained ? <UiContainer {...containerProps}>{children}</UiContainer> : children}
      </Box>
      <MobileBottomNav />
      <Footer />
    </Box>
  )
}
