import { createTheme } from '@mui/material/styles'
import { ptBR } from '@mui/material/locale'
import { dsTokens } from './tokens'

export const dsTheme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: {
        main: dsTokens.color.accent,
        dark: dsTokens.color.accentStrong,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: dsTokens.color.gold,
        dark: dsTokens.color.goldStrong,
        contrastText: '#142235',
      },
      success: { main: dsTokens.color.success },
      warning: { main: dsTokens.color.warning },
      error: { main: dsTokens.color.danger },
      info: { main: dsTokens.color.info },
      background: {
        default: dsTokens.color.background,
        paper: dsTokens.color.surface,
      },
      text: {
        primary: dsTokens.color.text,
        secondary: dsTokens.color.textSoft,
      },
      divider: dsTokens.color.border,
    },
    typography: {
      fontFamily: dsTokens.typography.family.body,
      h1: {
        fontFamily: dsTokens.typography.family.display,
        fontSize: dsTokens.typography.size.h1,
        lineHeight: dsTokens.typography.lineHeight.tight,
        fontWeight: dsTokens.typography.weight.heavy,
        letterSpacing: dsTokens.typography.tracking.h1,
      },
      h2: {
        fontFamily: dsTokens.typography.family.display,
        fontSize: dsTokens.typography.size.h2,
        lineHeight: dsTokens.typography.lineHeight.heading,
        fontWeight: dsTokens.typography.weight.bold,
        letterSpacing: dsTokens.typography.tracking.h2,
      },
      h3: {
        fontFamily: dsTokens.typography.family.display,
        fontSize: dsTokens.typography.size.h3,
        lineHeight: dsTokens.typography.lineHeight.heading,
        fontWeight: dsTokens.typography.weight.bold,
        letterSpacing: dsTokens.typography.tracking.h3,
      },
      h4: {
        fontFamily: dsTokens.typography.family.display,
        fontSize: dsTokens.typography.size.title,
        fontWeight: dsTokens.typography.weight.semibold,
        letterSpacing: dsTokens.typography.tracking.title,
        lineHeight: dsTokens.typography.lineHeight.title,
      },
      h5: {
        fontFamily: dsTokens.typography.family.display,
        fontSize: '1.125rem',
        fontWeight: dsTokens.typography.weight.semibold,
        letterSpacing: dsTokens.typography.tracking.body,
        lineHeight: dsTokens.typography.lineHeight.title,
      },
      h6: {
        fontFamily: dsTokens.typography.family.display,
        fontSize: '1rem',
        fontWeight: dsTokens.typography.weight.semibold,
        letterSpacing: dsTokens.typography.tracking.body,
        lineHeight: dsTokens.typography.lineHeight.compact,
      },
      subtitle1: {
        fontSize: '0.95rem',
        lineHeight: dsTokens.typography.lineHeight.compact,
        letterSpacing: dsTokens.typography.tracking.body,
        fontWeight: dsTokens.typography.weight.medium,
      },
      subtitle2: {
        fontSize: '0.875rem',
        lineHeight: dsTokens.typography.lineHeight.compact,
        letterSpacing: dsTokens.typography.tracking.body,
        fontWeight: dsTokens.typography.weight.medium,
      },
      body1: {
        fontSize: dsTokens.typography.size.body,
        lineHeight: dsTokens.typography.lineHeight.body,
        letterSpacing: dsTokens.typography.tracking.body,
      },
      body2: {
        fontSize: '0.9375rem',
        lineHeight: dsTokens.typography.lineHeight.body,
        letterSpacing: dsTokens.typography.tracking.body,
      },
      caption: {
        fontSize: dsTokens.typography.size.caption,
        lineHeight: dsTokens.typography.lineHeight.compact,
        letterSpacing: dsTokens.typography.tracking.caption,
      },
      button: {
        textTransform: 'none',
        fontWeight: dsTokens.typography.weight.semibold,
        letterSpacing: dsTokens.typography.tracking.body,
      },
      overline: {
        letterSpacing: dsTokens.typography.tracking.overline,
        fontWeight: dsTokens.typography.weight.bold,
      },
    },
    shape: {
      borderRadius: dsTokens.radius.md,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            colorScheme: 'light',
          },
          '*, *::before, *::after': {
            boxSizing: 'border-box',
          },
          body: {
            margin: 0,
            minHeight: '100vh',
            backgroundColor: dsTokens.color.background,
            color: dsTokens.color.text,
            fontFamily: dsTokens.typography.family.body,
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
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
            borderRadius: dsTokens.radius.md,
            paddingInline: dsTokens.spacing.md,
            fontWeight: dsTokens.typography.weight.semibold,
            transition: `transform ${dsTokens.motion.fast}, box-shadow ${dsTokens.motion.fast}, border-color ${dsTokens.motion.fast}, background-color ${dsTokens.motion.fast}`,
            '&:hover': {
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          },
          containedPrimary: {
            backgroundImage: `linear-gradient(180deg, ${dsTokens.color.accent} 0%, ${dsTokens.color.accentStrong} 100%)`,
            boxShadow: '0 10px 24px rgba(28, 156, 75, 0.25)',
          },
          outlinedSecondary: {
            borderColor: dsTokens.color.gold,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            border: `1px solid ${dsTokens.color.border}`,
            boxShadow: dsTokens.shadow.sm,
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: dsTokens.radius.lg,
            border: `1px solid ${dsTokens.color.border}`,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: dsTokens.radius.md,
            backgroundColor: dsTokens.color.surface,
            '&.Mui-focused': {
              boxShadow: '0 0 0 3px rgba(28,156,75,0.16)',
            },
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            borderRadius: dsTokens.radius.md,
          },
          input: {
            '&::placeholder': {
              color: dsTokens.color.textMuted,
              opacity: 1,
            },
          },
        },
      },
      MuiSvgIcon: {
        styleOverrides: {
          root: {
            strokeWidth: dsTokens.icon.strokeWidth,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: dsTokens.radius.pill,
            fontWeight: dsTokens.typography.weight.medium,
          },
        },
      },
    },
  },
  ptBR,
)
