export const tokens = {
  color: {
    bg: '#F7F5EE',
    surface: '#FFFFFF',
    surfaceElevated: '#FEFCF6',
    border: '#D8D3C2',
    textPrimary: '#142235',
    textSecondary: '#34475D',
    textMuted: '#5D7087',
    primary: '#1C9C4B',
    primaryHover: '#157A39',
    amberMain: '#C28A0E',
    amberDark: '#9D6D09',
    amberSoft: '#FFF1CC',
    amberBorder: '#E7C878',
    navSurface: 'rgba(255,255,255,0.96)',
    navBorder: '#D8D3C2',
    navText: '#34475D',
    navActiveBg: '#1C9C4B',
    navActiveText: '#FFFFFF',
    price: '#C28A0E',
    priceOld: '#7E8795',
    error: '#DC2626',
    warning: '#F59E0B',
    success: '#1C9C4B',
  },
  spacing: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64] as const,
  radius: {
    xs: 8,
    sm: 10,
    md: 12,
    lg: 16,
    pill: 999,
  },
  elevation: {
    none: 'none',
    sm: '0 4px 14px rgba(20,34,53,0.08)',
    md: '0 8px 24px rgba(20,34,53,0.12)',
    lg: '0 14px 34px rgba(20,34,53,0.15)',
  },
  typography: {
    family: {
      display: '"Sora", "Space Grotesk", "Helvetica Neue", Arial, sans-serif',
      body: '"Manrope", "Space Grotesk", "Sora", "Helvetica Neue", Arial, sans-serif',
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
