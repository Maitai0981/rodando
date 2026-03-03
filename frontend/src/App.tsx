import { Suspense } from 'react'
import { Box } from '@mui/material'
import RouteFallback from './components/common/RouteFallback'
import { AppRoutes } from './routes'

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Box sx={{ width: '100%', minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>
        <AppRoutes />
      </Box>
    </Suspense>
  )
}
