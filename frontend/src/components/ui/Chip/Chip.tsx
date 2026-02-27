import MuiChip from '@mui/material/Chip'
import type { ChipProps as MuiChipProps } from '@mui/material/Chip'

export interface UiChipProps extends MuiChipProps {
  /**
   * Defines visual density without changing semantic meaning.
   */
  emphasis?: 'default' | 'soft'
}

export function UiChip({ emphasis = 'default', sx, ...props }: UiChipProps) {
  return (
    <MuiChip
      {...props}
      sx={[
        emphasis === 'soft'
          ? {
              bgcolor: 'rgba(255,255,255,0.72)',
            }
          : null,
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  )
}
