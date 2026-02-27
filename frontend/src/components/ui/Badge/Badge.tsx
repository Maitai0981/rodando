import MuiBadge from '@mui/material/Badge'
import type { BadgeProps as MuiBadgeProps } from '@mui/material/Badge'

export type UiBadgeProps = MuiBadgeProps

export function UiBadge({ sx, ...props }: UiBadgeProps) {
  return (
    <MuiBadge
      {...props}
      sx={[
        {
          '& .MuiBadge-badge': {
            fontWeight: 700,
            minWidth: 18,
            height: 18,
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  )
}
