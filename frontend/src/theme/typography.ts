import type { TypographyVariantsOptions } from '@mui/material/styles'

export const typography: TypographyVariantsOptions = {
  fontFamily: '"Manrope", "Space Grotesk", "Sora", "Helvetica Neue", Arial, sans-serif',
  h1: {
    fontFamily: '"Sora", "Space Grotesk", sans-serif',
    fontWeight: 800,
    letterSpacing: '-0.038em',
    fontSize: 'clamp(2.2rem, 4.6vw, 3.9rem)',
    lineHeight: 1.04
  },
  h2: {
    fontFamily: '"Sora", "Space Grotesk", sans-serif',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    fontSize: 'clamp(1.85rem, 3.6vw, 3rem)',
    lineHeight: 1.05
  },
  h3: {
    fontFamily: '"Sora", "Space Grotesk", sans-serif',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    fontSize: 'clamp(1.25rem, 1.9vw, 2.05rem)',
    lineHeight: 1.12
  },
  h4: { fontFamily: '"Sora", sans-serif', fontWeight: 700, fontSize: '1.28rem', letterSpacing: '-0.02em', lineHeight: 1.14 },
  h5: { fontFamily: '"Sora", sans-serif', fontWeight: 650, letterSpacing: '-0.015em', lineHeight: 1.16 },
  h6: { fontFamily: '"Sora", sans-serif', fontWeight: 650, letterSpacing: '-0.01em', lineHeight: 1.18 },
  body1: { fontSize: '1rem', lineHeight: 1.64, letterSpacing: '-0.005em' },
  body2: { fontSize: '0.93rem', lineHeight: 1.58, letterSpacing: '-0.004em' },
  subtitle1: { fontWeight: 600, lineHeight: 1.32 },
  subtitle2: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontWeight: 550,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    fontSize: '0.7rem',
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
