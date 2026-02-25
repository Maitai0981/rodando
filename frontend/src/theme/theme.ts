import { createTheme } from '@mui/material/styles'
import { palette } from './palette'
import { typography } from './typography'

export const theme = createTheme({
  palette,
  typography,
  shape: {
    borderRadius: 14
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          colorScheme: 'light'
        }
      }
    },
    MuiContainer: {
      defaultProps: {
        maxWidth: 'xl'
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingLeft: 22,
          paddingRight: 22,
          paddingTop: 11,
          paddingBottom: 11,
          borderWidth: 1.5,
          transition: 'transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease',
          '&:hover': {
            transform: 'translateY(-1px)'
          }
        },
        contained: {
          boxShadow: '0 12px 28px rgba(0, 39, 118, 0.14)'
        },
        outlined: {
          borderWidth: 1.5,
          backgroundColor: 'rgba(248, 246, 238, 0.55)',
          borderColor: 'rgba(0, 39, 118, 0.14)'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          border: '1px solid rgba(0, 39, 118, 0.1)',
          backdropFilter: 'blur(8px)'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(0, 39, 118, 0.1)',
          backgroundColor: 'rgba(255, 255, 255, 0.74)',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 10px 30px rgba(0, 39, 118, 0.05)'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.82)'
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: '#002776',
          backgroundColor: '#F1F9F4'
        }
      }
    }
  }
})
