import type { PaletteOptions } from '@mui/material/styles'

export const palette: PaletteOptions = {
  mode: 'light',
  primary: {
    main: '#1C9C4B',
    dark: '#157A39',
    light: '#4ADE80',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#C28A0E',
    dark: '#9D6D09',
    light: '#E0AE3C',
    contrastText: '#1A1A1A',
  },
  info: {
    main: '#C28A0E',
    dark: '#9D6D09',
    light: '#E0AE3C',
    contrastText: '#1A1A1A',
  },
  success: {
    main: '#1C9C4B',
  },
  error: {
    main: '#DC2626',
    dark: '#B91C1C',
    light: '#EF4444',
  },
  warning: {
    main: '#F59E0B',
  },
  background: {
    default: '#F7F5EE',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#142235',
    secondary: '#34475D',
  },
  divider: '#D8D3C2',
  action: {
    hover: 'rgba(194,138,14,0.1)',
    selected: 'rgba(194,138,14,0.16)',
    focus: 'rgba(28,156,75,0.22)',
  },
}
