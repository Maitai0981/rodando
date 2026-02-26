import { createTheme } from '@mui/material/styles'
import { palette } from './palette'
import { typography } from './typography'

export const theme = createTheme({
  palette,
  typography,
  shape: {
    borderRadius: 18
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          colorScheme: 'light'
        },
        '*, *::before, *::after': {
          borderColor: 'rgba(17, 17, 17, 0.1)'
        }
      }
    },
    MuiContainer: {
      defaultProps: {
        maxWidth: 'xl'
      },
      styleOverrides: {
        root: {
          position: 'relative'
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 10,
          paddingBottom: 10,
          borderWidth: 1.25,
          lineHeight: 1.1,
          transition: 'transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease, border-color 0.18s ease',
          '&:hover': {
            transform: 'translateY(-1px)'
          },
          '&:active': {
            transform: 'translateY(0)'
          }
        },
        contained: {
          color: '#f8fffb',
          backgroundImage: 'linear-gradient(135deg, #0a8f3a 0%, #11a649 58%, #0b0b0b 140%)',
          boxShadow: '0 12px 28px rgba(17, 17, 17, 0.14)',
          border: '1px solid rgba(255,255,255,0.16)',
          '&:hover': {
            boxShadow: '0 16px 34px rgba(17, 17, 17, 0.18)',
            backgroundImage: 'linear-gradient(135deg, #088335 0%, #0f9e45 58%, #090909 140%)'
          }
        },
        outlined: {
          borderWidth: 1.25,
          backgroundColor: 'rgba(255, 255, 255, 0.72)',
          borderColor: 'rgba(17, 17, 17, 0.12)',
          boxShadow: '0 4px 16px rgba(17, 17, 17, 0.04)',
          '&:hover': {
            borderColor: 'rgba(17, 17, 17, 0.22)',
            backgroundColor: 'rgba(255, 255, 255, 0.88)'
          }
        },
        text: {
          '&:hover': {
            backgroundColor: 'rgba(17, 17, 17, 0.04)'
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          border: '1px solid rgba(17, 17, 17, 0.08)',
          backgroundColor: 'rgba(255,255,255,0.78)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
          backdropFilter: 'blur(8px)'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(17, 17, 17, 0.08)',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(14px) saturate(1.02)',
          boxShadow: '0 14px 40px rgba(17, 17, 17, 0.06), 0 3px 10px rgba(17, 17, 17, 0.03)'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: '1px solid rgba(17, 17, 17, 0.08)',
          backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.86) 100%)'
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(17, 17, 17, 0.06)'
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
          '&:hover': {
            transform: 'translateY(-1px)'
          }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.82)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
          transition: 'box-shadow 0.18s ease, border-color 0.18s ease, background-color 0.18s ease',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.9)'
          },
          '&.Mui-focused': {
            boxShadow: '0 0 0 4px rgba(10, 143, 58, 0.12)'
          }
        },
        notchedOutline: {
          borderColor: 'rgba(17, 17, 17, 0.12)'
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined'
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(17, 17, 17, 0.08)'
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(17, 17, 17, 0.88)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
          fontSize: '0.75rem'
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: '#111111',
          backgroundColor: 'rgba(242, 198, 23, 0.08)',
          borderBottom: '1px solid rgba(17, 17, 17, 0.08)'
        }
      }
    }
  }
})
