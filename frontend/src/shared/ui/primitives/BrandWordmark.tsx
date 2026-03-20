import Box from '@mui/material/Box'
import type { BoxProps } from '@mui/material/Box'

export type BrandWordmarkVariant = 'display' | 'inline' | 'compact'
export type BrandWordmarkTone = 'auto' | 'light' | 'dark'

export interface BrandWordmarkProps extends Omit<BoxProps, 'children'> {
  variant?: BrandWordmarkVariant
  tone?: BrandWordmarkTone
  text?: string
}

export function BrandWordmark({
  variant = 'inline',
  tone = 'auto',
  text = 'RODANDO',
  className,
  ...rest
}: BrandWordmarkProps) {
  const toneClass = tone === 'auto' ? '' : ` brand-wordmark--tone-${tone}`
  return (
    <Box
      component="span"
      className={`brand-wordmark brand-wordmark--${variant}${toneClass}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      <Box component="span" className="brand-wordmark__text">
        {text}
      </Box>
      <Box component="span" className="brand-wordmark__road" aria-hidden>
        <Box component="span" className="brand-wordmark__ramp" />
        <Box component="span" className="brand-wordmark__lane" />
      </Box>
    </Box>
  )
}
