import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import type { PropsWithChildren } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function OwnerRoute({ children }: PropsWithChildren) {
  const { status, user } = useAuth()

  if (status === 'loading') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', gap: 1.2 }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">
          Validando acesso...
        </Typography>
      </Box>
    )
  }

  if (status !== 'authenticated') {
    return <Navigate to="/owner" replace />
  }

  if (user?.role !== 'owner') {
    return <Navigate to="/" replace />
  }

  return children ? <>{children}</> : <Outlet />
}
