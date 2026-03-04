import MuiContainer from '@mui/material/Container'
import type { PropsWithChildren } from 'react'

export function Container({ children, maxWidth = 'xl', disableGutters = false }: PropsWithChildren<{ maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; disableGutters?: boolean }>) {
  return (
    <MuiContainer maxWidth={maxWidth} disableGutters={disableGutters} sx={{ px: disableGutters ? 0 : { xs: 1.5, sm: 2, md: 3 } }}>
      {children}
    </MuiContainer>
  )
}
