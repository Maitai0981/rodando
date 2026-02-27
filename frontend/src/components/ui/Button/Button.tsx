import type { ElementType } from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import MuiButton from '@mui/material/Button'
import type { ButtonProps as MuiButtonProps } from '@mui/material/Button'

export type UiButtonProps<C extends ElementType = 'button'> = MuiButtonProps<C> & {
  /**
   * Shows an inline loading state and disables user interaction.
   */
  loading?: boolean
  /**
   * Optional text rendered while loading.
   */
  loadingLabel?: string
}

export function UiButton<C extends ElementType = 'button'>({
  loading = false,
  loadingLabel,
  disabled,
  children,
  startIcon,
  ...props
}: UiButtonProps<C>) {
  return (
    <MuiButton
      {...props}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress color="inherit" size={16} /> : startIcon}
    >
      {loading ? loadingLabel || children : children}
    </MuiButton>
  )
}
