import CircularProgress from '@mui/material/CircularProgress'
import MuiButton from '@mui/material/Button'
import type { ButtonProps as MuiButtonProps } from '@mui/material/Button'
import type { ButtonProps } from '../types'

function mapVariant(variant: NonNullable<ButtonProps['variant']>): Pick<MuiButtonProps, 'variant' | 'color'> {
  switch (variant) {
    case 'outline':
      return { variant: 'outlined', color: 'primary' }
    case 'ghost':
      return { variant: 'text', color: 'primary' }
    case 'gold':
      return { variant: 'contained', color: 'secondary' }
    case 'icon':
      return { variant: 'text', color: 'primary' }
    case 'accent':
    case 'primary':
    default:
      return { variant: 'contained', color: 'primary' }
  }
}

function mapSize(size: NonNullable<ButtonProps['size']>): MuiButtonProps['size'] {
  if (size === 'sm') return 'small'
  if (size === 'lg') return 'large'
  return 'medium'
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  className,
  sx,
  ...props
}: ButtonProps) {
  const mapped = mapVariant(variant)
  const iconStyle = variant === 'icon'
    ? {
        minWidth: 40,
        width: 40,
        height: 40,
        borderRadius: '50%',
        p: 0,
      }
    : null
  const composedSx = iconStyle ? (sx ? [iconStyle, sx] : iconStyle) : sx

  return (
    <MuiButton
      {...mapped}
      {...(props as MuiButtonProps)}
      className={className ? `ds-pressable ${className}` : 'ds-pressable'}
      size={mapSize(size)}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress color="inherit" size={16} /> : leftIcon}
      endIcon={!loading ? rightIcon : undefined}
      sx={composedSx as MuiButtonProps['sx']}
    >
      {loading ? 'Carregando...' : children}
    </MuiButton>
  )
}
