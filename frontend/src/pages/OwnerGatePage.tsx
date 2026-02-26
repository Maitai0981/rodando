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
      <Paper elevation={0} sx={{ p: 4, borderRadius: 4, width: '100%', maxWidth: 540 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle2" color="primary">Owner Access</Typography>
          <Typography variant="h3">Area administrativa de produtos</Typography>
          <Typography variant="body2" color="text.secondary">
            O acesso ao painel e feito por login/sessao no backend Express. O primeiro usuario cadastrado no sistema vira owner.
          </Typography>

          {checking ? <Alert severity="info">Verificando sessao atual...</Alert> : null}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1 }}>
            <Button component={RouterLink} to="/auth" variant="contained" color="primary">
              Entrar
            </Button>
            <Button component={RouterLink} to="/auth/signup" variant="outlined" color="primary">
              Criar conta
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
