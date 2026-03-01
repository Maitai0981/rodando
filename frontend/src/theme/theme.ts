import { createTheme } from '@mui/material/styles'
import { palette } from './palette'
import { typography } from './typography'
import { tokens } from '../styles/tokens'

export const theme = createTheme({
  palette,
  typography,
  shape: {
    borderRadius: tokens.radius.md,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          colorScheme: 'light',
          backgroundColor: tokens.color.bg,
          color: tokens.color.textPrimary,
        },
        '*, *::before, *::after': {
          borderColor: tokens.color.border,
        },
      },
    },
    MuiContainer: {
      defaultProps: {
        maxWidth: 'xl',
      },
      styleOverrides: {
        root: {
          position: 'relative',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.md,
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 10,
          paddingBottom: 10,
          borderWidth: 1,
          lineHeight: 1.1,
          transition: 'transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease, border-color 0.18s ease',
          minHeight: 44,
          textTransform: 'none',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
          '&.Mui-disabled': {
            opacity: 0.46,
            cursor: 'not-allowed',
          },
          '&.Mui-focusVisible': {
            outline: '2px solid rgba(22,163,74,0.8)',
            outlineOffset: 2,
          },
        },
        contained: {
          color: '#FFFFFF',
          backgroundImage: 'none',
          backgroundColor: tokens.color.primary,
          boxShadow: tokens.elevation.sm,
          border: '1px solid rgba(28,156,75,0.35)',
          '&:hover': {
            boxShadow: tokens.elevation.md,
            backgroundColor: tokens.color.primaryHover,
          },
        },
        outlined: {
          borderWidth: 1,
          backgroundColor: 'transparent',
          borderColor: 'rgba(28,156,75,0.6)',
          color: tokens.color.primary,
          boxShadow: 'none',
          '&:hover': {
            borderColor: 'rgba(28,156,75,0.85)',
            color: tokens.color.primary,
            backgroundColor: 'rgba(28,156,75,0.08)',
          },
        },
        text: {
          color: tokens.color.primary,
          '&:hover': {
            color: tokens.color.primaryHover,
            backgroundColor: 'rgba(15,23,42,0.04)',
          },
        },
      },
      variants: [
        {
          props: { color: 'error', variant: 'contained' },
          style: {
            color: '#FFFFFF',
            backgroundColor: tokens.color.error,
            borderColor: 'rgba(220,38,38,0.5)',
            '&:hover': {
              backgroundColor: '#B91C1C',
            },
          },
        },
        {
          props: { color: 'secondary', variant: 'outlined' },
          style: {
            borderColor: tokens.color.amberBorder,
            color: tokens.color.amberDark,
            backgroundColor: 'transparent',
            '&:hover': {
              borderColor: tokens.color.amberMain,
              backgroundColor: 'rgba(194,138,14,0.1)',
            },
          },
        },
        {
          props: { color: 'secondary', variant: 'text' },
          style: {
            color: tokens.color.amberDark,
            '&:hover': {
              color: tokens.color.amberMain,
              backgroundColor: 'rgba(194,138,14,0.1)',
            },
          },
        },
      ],
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          border: `1px solid ${tokens.color.border}`,
          backgroundColor: tokens.color.surfaceElevated,
          color: tokens.color.textPrimary,
          boxShadow: 'none',
        },
      },
      variants: [
        {
          props: { color: 'secondary' },
          style: {
            color: tokens.color.amberDark,
            borderColor: tokens.color.amberBorder,
            backgroundColor: tokens.color.amberSoft,
          },
        },
      ],
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${tokens.color.border}`,
          backgroundColor: tokens.color.surface,
          color: tokens.color.textPrimary,
          backdropFilter: 'none',
          boxShadow: tokens.elevation.sm,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${tokens.color.border}`,
          backgroundImage: 'none',
          backgroundColor: tokens.color.surface,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(255,255,255,0.92)',
          boxShadow: '0 4px 18px rgba(15,23,42,0.08)',
          borderBottom: `1px solid ${tokens.color.amberBorder}`,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            backgroundColor: 'rgba(22,163,74,0.08)',
          },
          '&.Mui-focusVisible': {
            outline: '2px solid rgba(22,163,74,0.8)',
            outlineOffset: 2,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          color: tokens.color.textPrimary,
          backgroundColor: tokens.color.surface,
          boxShadow: 'none',
          transition: 'box-shadow 0.18s ease, border-color 0.18s ease, background-color 0.18s ease',
          '&:hover': {
            backgroundColor: tokens.color.surfaceElevated,
          },
          '&.Mui-focused': {
            boxShadow: '0 0 0 3px rgba(28,156,75,0.18)',
          },
        },
        notchedOutline: {
          borderColor: 'rgba(20,34,53,0.2)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: tokens.color.border,
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: tokens.color.primary,
          textDecorationColor: 'transparent',
          textUnderlineOffset: '3px',
          transition: 'color 0.18s ease, text-decoration-color 0.18s ease',
          '&:hover': {
            color: tokens.color.amberDark,
            textDecorationColor: 'currentColor',
          },
          '&:focus-visible': {
            outline: '2px solid rgba(22,163,74,0.8)',
            outlineOffset: 2,
            borderRadius: 4,
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#0F172A',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: '0.75rem',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: tokens.color.textPrimary,
          backgroundColor: '#F2F3EE',
          borderBottom: `1px solid ${tokens.color.border}`,
        },
        root: {
          borderBottom: `1px solid ${tokens.color.border}`,
        },
      },
    },
  },
})
