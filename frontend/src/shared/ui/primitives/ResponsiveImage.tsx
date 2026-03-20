import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'
import type { ImgHTMLAttributes } from 'react'

type ResponsiveImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'width' | 'height'> & {
  width?: number | string
  height?: number | string
  fit?: 'cover' | 'contain'
  sx?: SxProps<Theme>
}

export function ResponsiveImage({
  width = '100%',
  height = '100%',
  fit = 'cover',
  loading = 'lazy',
  decoding = 'async',
  sx,
  ...rest
}: ResponsiveImageProps) {
  return (
    <Box
      component="img"
      loading={loading}
      decoding={decoding}
      sx={{
        width,
        height,
        objectFit: fit,
        display: 'block',
        ...sx,
      }}
      {...rest}
    />
  )
}
