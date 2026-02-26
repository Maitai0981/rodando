import type { PaletteOptions } from '@mui/material/styles'

export const palette: PaletteOptions = {
  mode: 'light',
  primary: {
    main: '#0A8F3A',
    dark: '#076D2C',
    light: '#2DB861',
    contrastText: '#F8FFF9'
  },
  secondary: {
    main: '#F2C617',
    dark: '#C8A30E',
    light: '#FFE37A',
    contrastText: '#17140A'
  },
  info: {
    main: '#141414',
    dark: '#090909',
    light: '#343434',
    contrastText: '#FAFAFA'
  },
  success: {
    main: '#17733F'
  },
  error: {
    main: '#C63A3A'
  },
  warning: {
    main: '#D9A010'
  },
  background: {
    default: '#F7F8F4',
    paper: '#FFFFFF'
  },
  text: {
    primary: '#111111',
    secondary: '#5B5B5B'
  },
  divider: 'rgba(17, 17, 17, 0.10)',
  action: {
    hover: 'rgba(17, 17, 17, 0.04)',
    selected: 'rgba(17, 17, 17, 0.08)',
    focus: 'rgba(10, 143, 58, 0.22)'
  }
}
