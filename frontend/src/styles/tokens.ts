export const tokens = {
  spacing: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64] as const,
  radius: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    pill: 999,
  },
  elevation: {
    none: 'none',
    sm: '0 2px 10px rgba(8, 15, 30, 0.08)',
    md: '0 8px 24px rgba(8, 15, 30, 0.12)',
    lg: '0 16px 38px rgba(8, 15, 30, 0.16)',
  },
  typography: {
    family: {
      display: '"Sora", "Space Grotesk", "Helvetica Neue", Arial, sans-serif',
      body: '"Space Grotesk", "Sora", "Helvetica Neue", Arial, sans-serif',
      mono: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
    },
    weight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      heavy: 800,
    },
  },
  zIndex: {
    base: 1,
    appBar: 1200,
    drawer: 1300,
    modal: 1400,
    toast: 1500,
  },
  motion: {
    duration: {
      instant: 120,
      fast: 180,
      moderate: 260,
      slow: 340,
    },
    easing: {
      standard: 'cubic-bezier(0.2, 0, 0, 1)',
      emphasized: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  },
  layout: {
    maxWidth: 1320,
  },
} as const

export type AppTokens = typeof tokens
