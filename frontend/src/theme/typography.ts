import type { TypographyVariantsOptions } from '@mui/material/styles'

export const typography: TypographyVariantsOptions = {
  fontFamily: '"Space Grotesk", "Sora", "Helvetica Neue", Arial, sans-serif',
  h1: {
    fontFamily: '"Sora", "Space Grotesk", sans-serif',
    fontWeight: 800,
    letterSpacing: '-0.05em',
    fontSize: 'clamp(2.8rem, 6vw, 5.4rem)',
    lineHeight: 0.96
  },
  h2: {
    fontFamily: '"Sora", "Space Grotesk", sans-serif',
    fontWeight: 700,
    letterSpacing: '-0.04em',
    fontSize: 'clamp(2rem, 4vw, 3.4rem)',
    lineHeight: 1
  },
  h3: {
    fontFamily: '"Sora", "Space Grotesk", sans-serif',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    fontSize: 'clamp(1.35rem, 2vw, 2rem)',
    lineHeight: 1.08
  },
  h4: { fontFamily: '"Sora", sans-serif', fontWeight: 600, fontSize: '1.35rem', letterSpacing: '-0.02em' },
  h5: { fontFamily: '"Sora", sans-serif', fontWeight: 600, letterSpacing: '-0.02em' },
  h6: { fontFamily: '"Sora", sans-serif', fontWeight: 600, letterSpacing: '-0.02em' },
  body1: { fontSize: '1rem', lineHeight: 1.7, letterSpacing: '-0.01em' },
  body2: { fontSize: '0.95rem', lineHeight: 1.65, letterSpacing: '-0.01em' },
  subtitle1: { fontWeight: 600 },
  subtitle2: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontWeight: 500,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    fontSize: '0.72rem'
  },
  overline: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontWeight: 500,
    letterSpacing: '0.16em',
    textTransform: 'uppercase'
  },
  button: { fontWeight: 600, textTransform: 'none', letterSpacing: '-0.01em' }
}
