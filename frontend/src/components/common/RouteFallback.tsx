import { Box, CircularProgress, Typography } from '@mui/material'

type RouteFallbackProps = {
  label?: string
}

export default function RouteFallback({ label = 'Carregando pagina...' }: RouteFallbackProps) {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        width: '100%',
        minHeight: 56,
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1 }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13.5 }}>
          {label}
        </Typography>
      </Box>
    </Box>
  )
}
