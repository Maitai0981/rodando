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
        contrastText: '#182334',
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
        lineHeight: 1.03,
        fontWeight: dsTokens.typography.weight.bold,
        letterSpacing: '-0.038em',
      },
      h2: {
        fontFamily: dsTokens.typography.family.display,
        fontSize: dsTokens.typography.size.h2,
        lineHeight: 1.06,
        fontWeight: dsTokens.typography.weight.bold,
        letterSpacing: '-0.03em',
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
        fontSize: '1.2rem',
        fontWeight: dsTokens.typography.weight.semibold,
        letterSpacing: dsTokens.typography.tracking.body,
        lineHeight: dsTokens.typography.lineHeight.title,
      },
      h6: {
        fontFamily: dsTokens.typography.family.display,
        fontSize: '1.06rem',
        fontWeight: dsTokens.typography.weight.semibold,
        letterSpacing: dsTokens.typography.tracking.body,
        lineHeight: dsTokens.typography.lineHeight.compact,
      },
      subtitle1: {
        fontSize: '1.04rem',
        lineHeight: dsTokens.typography.lineHeight.compact,
        letterSpacing: dsTokens.typography.tracking.body,
        fontWeight: dsTokens.typography.weight.medium,
      },
      subtitle2: {
        fontSize: '0.96rem',
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
        fontSize: '1.02rem',
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
      MuiTypography: {
        styleOverrides: {
          root: {
            textWrap: 'pretty',
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
            borderRadius: dsTokens.radius.pill,
            paddingInline: dsTokens.spacing.md,
            fontWeight: dsTokens.typography.weight.semibold,
            transition: `transform ${dsTokens.motion.fast}, box-shadow ${dsTokens.motion.fast}, border-color ${dsTokens.motion.fast}, background-color ${dsTokens.motion.fast}, color ${dsTokens.motion.fast}`,
            '&:hover': {
              transform: 'translateY(-1px) scale(1.004)',
              boxShadow: '0 12px 24px rgba(23, 48, 82, 0.24)',
            },
            '&:active': {
              transform: 'translateY(0) scale(0.97)',
            },
          },
          containedPrimary: {
            backgroundImage: `linear-gradient(180deg, ${dsTokens.color.accent} 0%, ${dsTokens.color.accentStrong} 100%)`,
            boxShadow: '0 10px 22px rgba(23, 48, 82, 0.24)',
          },
          outlinedSecondary: {
            borderColor: 'rgba(216,154,42,0.44)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            border: 'none',
            boxShadow: '0 10px 24px rgba(14, 27, 46, 0.08)',
            backgroundImage: 'none',
            backgroundColor: '#FFFFFF',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: dsTokens.radius.xl,
            border: 'none',
            transition: `transform ${dsTokens.motion.fast}, box-shadow ${dsTokens.motion.fast}, border-color ${dsTokens.motion.fast}`,
            boxShadow: '0 10px 24px rgba(14, 27, 46, 0.08)',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: dsTokens.radius.md,
            backgroundColor: dsTokens.color.surface,
            '&.Mui-focused': {
              boxShadow: '0 0 0 3px rgba(31, 63, 103, 0.2)',
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
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: `transform ${dsTokens.motion.press}, background-color ${dsTokens.motion.fast}, color ${dsTokens.motion.fast}`,
            '&:active': {
              transform: 'scale(0.96)',
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            transition: `transform ${dsTokens.motion.press}, background-color ${dsTokens.motion.fast}, border-color ${dsTokens.motion.fast}`,
            '&:active': {
              transform: 'scale(0.985)',
            },
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
