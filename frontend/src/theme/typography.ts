import type { TypographyVariantsOptions } from '@mui/material/styles'

export const typography: TypographyVariantsOptions = {
  fontFamily: '"Space Grotesk", "Sora", "Helvetica Neue", Arial, sans-serif',
  h1: {
    fontFamily: '"Sora", "Space Grotesk", sans-serif',
    fontWeight: 800,
    letterSpacing: '-0.055em',
    fontSize: 'clamp(2.65rem, 5.8vw, 5.2rem)',
    lineHeight: 0.94
  },
  h2: {
    fontFamily: '"Sora", "Space Grotesk", sans-serif',
    fontWeight: 700,
    letterSpacing: '-0.04em',
    fontSize: 'clamp(1.95rem, 4vw, 3.15rem)',
    lineHeight: 0.98
  },
  h3: {
    fontFamily: '"Sora", "Space Grotesk", sans-serif',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    fontSize: 'clamp(1.3rem, 2vw, 1.95rem)',
    lineHeight: 1.05
  },
  h4: { fontFamily: '"Sora", sans-serif', fontWeight: 700, fontSize: '1.32rem', letterSpacing: '-0.025em', lineHeight: 1.08 },
  h5: { fontFamily: '"Sora", sans-serif', fontWeight: 650, letterSpacing: '-0.02em', lineHeight: 1.12 },
  h6: { fontFamily: '"Sora", sans-serif', fontWeight: 650, letterSpacing: '-0.02em', lineHeight: 1.14 },
  body1: { fontSize: '0.995rem', lineHeight: 1.68, letterSpacing: '-0.012em' },
  body2: { fontSize: '0.93rem', lineHeight: 1.62, letterSpacing: '-0.01em' },
  subtitle1: { fontWeight: 600 },
  subtitle2: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontSize: '0.72rem',
    lineHeight: 1.35
  },
  overline: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontWeight: 500,
    letterSpacing: '0.15em',
    textTransform: 'uppercase'
  },
  caption: {
    fontSize: '0.78rem',
    lineHeight: 1.45,
    letterSpacing: '-0.01em'
  },
  button: { fontWeight: 650, textTransform: 'none', letterSpacing: '-0.012em' }
}
