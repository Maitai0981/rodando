import { Box, CircularProgress, Typography } from '@mui/material'

type RouteFallbackProps = {
  label?: string
}

export default function RouteFallback({ label = 'Carregando pagina...' }: RouteFallbackProps) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Box>
  )
}
