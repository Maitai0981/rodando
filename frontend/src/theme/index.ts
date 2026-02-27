import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import { tokens } from '../styles/tokens'

const palette = {
  mode: 'light' as const,
  primary: {
    main: '#0A8F3A',
    dark: '#076D2C',
    light: '#2DB861',
    contrastText: '#F8FFF9',
  },
  secondary: {
    main: '#F2C617',
    dark: '#C8A30E',
    light: '#FFE37A',
    contrastText: '#17140A',
  },
  info: {
    main: '#141414',
    dark: '#090909',
    light: '#343434',
    contrastText: '#FAFAFA',
  },
  success: {
    main: '#17733F',
  },
  error: {
    main: '#C63A3A',
  },
  warning: {
    main: '#D9A010',
  },
  background: {
    default: '#F7F8F4',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#111111',
    secondary: '#5B5B5B',
  },
  divider: 'rgba(17, 17, 17, 0.1)',
  action: {
    hover: 'rgba(17, 17, 17, 0.04)',
    selected: 'rgba(17, 17, 17, 0.08)',
    focus: 'rgba(10, 143, 58, 0.22)',
  },
}

function appComponents(theme: Theme) {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          '--app-content-max-width': `${tokens.layout.maxWidth}px`,
        },
        '*, *::before, *::after': {
          boxSizing: 'border-box',
        },
        body: {
          minHeight: '100vh',
          colorScheme: 'light',
          textRendering: 'optimizeLegibility',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        a: {
          color: 'inherit',
          textDecoration: 'none',
        },
      },
    },
    MuiContainer: {
      defaultProps: {
        maxWidth: 'xl' as const,
      },
      styleOverrides: {
        root: {
          width: '100%',
          maxWidth: 'var(--app-content-max-width)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          minHeight: 44,
          borderRadius: tokens.radius.pill,
          textTransform: 'none',
          fontWeight: tokens.typography.weight.semibold,
          transition: [
            theme.transitions.create('transform', {
              duration: tokens.motion.duration.fast,
              easing: tokens.motion.easing.standard,
            }),
            theme.transitions.create('box-shadow', {
              duration: tokens.motion.duration.fast,
              easing: tokens.motion.easing.standard,
            }),
            theme.transitions.create('background-color', {
              duration: tokens.motion.duration.fast,
              easing: tokens.motion.easing.standard,
            }),
          ].join(','),
          '&:hover': {
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
          '&.Mui-focusVisible': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.26)}`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.lg,
          border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
          boxShadow: tokens.elevation.sm,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.md,
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.pill,
          border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: theme.transitions.create(['background-color', 'transform'], {
            duration: tokens.motion.duration.fast,
            easing: tokens.motion.easing.standard,
          }),
          '&.Mui-focusVisible': {
            outline: `2px solid ${alpha(theme.palette.primary.main, 0.65)}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.sm,
          transition: theme.transitions.create(['box-shadow', 'border-color'], {
            duration: tokens.motion.duration.fast,
            easing: tokens.motion.easing.standard,
          }),
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.18)}`,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: tokens.radius.lg,
        },
      },
    },
  }
}

const baseTheme = createTheme({
  palette,
  spacing: tokens.spacing,
  shape: {
    borderRadius: tokens.radius.md,
  },
  zIndex: {
    appBar: tokens.zIndex.appBar,
    drawer: tokens.zIndex.drawer,
    modal: tokens.zIndex.modal,
    snackbar: tokens.zIndex.toast,
  },
  typography: {
    fontFamily: tokens.typography.family.body,
    h1: {
      fontFamily: tokens.typography.family.display,
      fontWeight: tokens.typography.weight.heavy,
      fontSize: 'clamp(2.4rem, 5vw, 4.8rem)',
      letterSpacing: '-0.05em',
      lineHeight: 0.96,
    },
    h2: {
      fontFamily: tokens.typography.family.display,
      fontWeight: tokens.typography.weight.bold,
      fontSize: 'clamp(1.9rem, 3.6vw, 3.2rem)',
      letterSpacing: '-0.04em',
      lineHeight: 0.98,
    },
    h3: {
      fontFamily: tokens.typography.family.display,
      fontWeight: tokens.typography.weight.bold,
      fontSize: 'clamp(1.4rem, 2.5vw, 2.1rem)',
      letterSpacing: '-0.03em',
      lineHeight: 1.04,
    },
    h4: {
      fontFamily: tokens.typography.family.display,
      fontWeight: tokens.typography.weight.bold,
      lineHeight: 1.08,
      letterSpacing: '-0.02em',
    },
    subtitle1: {
      fontWeight: tokens.typography.weight.semibold,
    },
    subtitle2: {
      fontFamily: tokens.typography.family.mono,
      fontWeight: tokens.typography.weight.medium,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    },
    body1: {
      lineHeight: 1.6,
      letterSpacing: '-0.01em',
    },
    body2: {
      lineHeight: 1.58,
      letterSpacing: '-0.008em',
    },
    button: {
      fontWeight: tokens.typography.weight.semibold,
      letterSpacing: '-0.01em',
      textTransform: 'none',
    },
    overline: {
      fontFamily: tokens.typography.family.mono,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
    },
  },
})

baseTheme.components = appComponents(baseTheme)

export const theme = responsiveFontSizes(baseTheme)
