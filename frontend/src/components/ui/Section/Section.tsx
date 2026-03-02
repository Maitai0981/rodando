import Box from '@mui/material/Box'
import type { BoxProps } from '@mui/material/Box'
import { UiContainer, type UiContainerProps } from '../Container'

export interface UiSectionProps extends BoxProps {
  /**
   * Wraps children with `UiContainer` for consistent page gutters.
   */
  contained?: boolean
  containerProps?: UiContainerProps
}

export function UiSection({
  contained = true,
  containerProps,
  children,
  sx,
  ...props
}: UiSectionProps) {
  return (
    <Box
      {...props}
      sx={[
        {
          py: { xs: 5, md: 7 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {contained ? <UiContainer {...containerProps}>{children}</UiContainer> : children}
    </Box>
  )
}
