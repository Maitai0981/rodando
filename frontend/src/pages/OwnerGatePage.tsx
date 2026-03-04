import { useEffect } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import { useAuth } from '../context/AuthContext'

export default function OwnerGatePage() {
  const navigate = useNavigate()
  const { user, status } = useAuth()

  useEffect(() => {
    if (status !== 'authenticated') return
    if (user?.role === 'owner') {
      navigate('/owner/dashboard', { replace: true })
    }
  }, [navigate, status, user])

  const checking = status === 'loading'

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: { xs: 3, md: 4 }, width: '100%', maxWidth: 540 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle2" color="primary">Owner Access</Typography>
          <Typography variant="h3">
            Area administrativa de produtos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            O acesso ao painel e feito em rota dedicada para owner.
          </Typography>

          {checking ? <Alert severity="info">Verificando sessao atual...</Alert> : null}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1 }}>
            <Button component={RouterLink} to="/owner/login" variant="contained" color="primary">
              Entrar como owner
            </Button>
            <Button component={RouterLink} to="/auth" variant="outlined" color="primary">
              Area de cliente
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
