import MuiContainer from '@mui/material/Container'
import type { ContainerProps as MuiContainerProps } from '@mui/material/Container'

export interface UiContainerProps extends MuiContainerProps {
  /**
   * Uses full-width layout while keeping horizontal gutters.
   */
  fluid?: boolean
}

export function UiContainer({ fluid = false, sx, maxWidth = 'xl', ...props }: UiContainerProps) {
  return (
    <MuiContainer
      {...props}
      maxWidth={fluid ? false : maxWidth}
      sx={[
        {
          px: { xs: 2, sm: 3, md: 4 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  )
}
