import MuiCard from '@mui/material/Card'
import type { CardProps as MuiCardProps } from '@mui/material/Card'

export interface UiCardProps extends MuiCardProps {
  /**
   * Enables hover feedback for clickable cards.
   */
  interactive?: boolean
}

export function UiCard({ interactive = false, sx, ...props }: UiCardProps) {
  return (
    <MuiCard
      {...props}
      sx={[
        {
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        },
        interactive
          ? {
              transition: 'transform 180ms cubic-bezier(0.2, 0, 0, 1), box-shadow 180ms cubic-bezier(0.2, 0, 0, 1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              },
            }
          : null,
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  )
}
