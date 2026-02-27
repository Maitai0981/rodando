import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import { tokens } from '../styles/tokens'

const palette = {
  mode: 'dark' as const,
  primary: {
    main: '#0EA84B',
    dark: '#0A7A37',
    light: '#32C56A',
    contrastText: '#F8FFF9',
  },
  secondary: {
    main: '#FFFFFF',
    dark: '#DCDCDC',
    light: '#FFFFFF',
    contrastText: '#050505',
  },
  info: {
    main: '#FFDF00',
    dark: '#E2C400',
    light: '#FFEA5C',
    contrastText: '#050505',
  },
  success: {
    main: '#19B353',
  },
  error: {
    main: '#E65A5A',
  },
  warning: {
    main: '#E4C21A',
  },
  background: {
    default: '#060606',
    paper: '#111111',
  },
  text: {
    primary: '#FFDF00',
    secondary: '#F1F1F1',
  },
  divider: 'rgba(255, 255, 255, 0.2)',
  action: {
    hover: 'rgba(255, 255, 255, 0.08)',
    selected: 'rgba(255, 255, 255, 0.16)',
    focus: 'rgba(14, 168, 75, 0.36)',
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
          colorScheme: 'dark',
          textRendering: 'optimizeLegibility',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
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
        contained: {
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          '&:hover': {
            backgroundColor: theme.palette.primary.dark,
          },
        },
        outlined: {
          borderColor: alpha(theme.palette.secondary.main, 0.5),
          color: theme.palette.text.primary,
          '&:hover': {
            borderColor: alpha(theme.palette.secondary.main, 0.9),
            backgroundColor: alpha(theme.palette.secondary.main, 0.08),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.lg,
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
          boxShadow: tokens.elevation.sm,
          backgroundColor: alpha(theme.palette.background.paper, 0.96),
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.md,
          backgroundImage: 'none',
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.18)}`,
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.pill,
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
          color: theme.palette.text.primary,
          backgroundColor: alpha(theme.palette.secondary.main, 0.08),
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
          color: theme.palette.text.primary,
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
          color: theme.palette.text.primary,
          backgroundColor: alpha(theme.palette.secondary.main, 0.08),
          transition: theme.transitions.create(['box-shadow', 'border-color'], {
            duration: tokens.motion.duration.fast,
            easing: tokens.motion.easing.standard,
          }),
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.18)}`,
          },
        },
        notchedOutline: {
          borderColor: alpha(theme.palette.secondary.main, 0.3),
        },
        input: {
          color: theme.palette.text.primary,
          '&::placeholder': {
            color: alpha(theme.palette.secondary.main, 0.75),
            opacity: 1,
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
