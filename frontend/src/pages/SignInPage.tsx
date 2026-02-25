import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Grid, Link, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { api, ApiError } from '../lib/api'

export default function SignInPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await api.signIn({ email, password })
      if (result.user.role === 'owner') {
        navigate('/owner/dashboard')
        return
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Grid container sx={{ minHeight: '100vh' }}>
      <Grid
        size={{ xs: 12, md: 6 }}
        sx={{
          background:
            'radial-gradient(circle at 25% 20%, rgba(255,255,255,0.16), transparent 35%), radial-gradient(circle at 75% 65%, rgba(255,223,0,0.14), transparent 35%), linear-gradient(150deg, #009C3B 0%, #002776 90%)',
          color: '#fff',
          p: { xs: 3, md: 6 },
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Stack spacing={3} sx={{ maxWidth: 480 }}>
          <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.75)' }}>
            Sign In - Owner / Cliente
          </Typography>
          <Typography variant="h2" sx={{ color: '#fff' }}>
            Acesse sua conta e gerencie o catalogo em tempo real.
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Login com sessao segura no backend Express, controle de acesso por perfil e CRUD de produtos no painel owner.
          </Typography>
          <Box sx={{ p: 3, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <Typography variant="subtitle1" sx={{ color: '#fff' }}>Fluxo implementado</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Sign in, sign up, logout, sessao via cookie httpOnly e API de produtos.
            </Typography>
          </Box>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }} sx={{ p: { xs: 3, md: 6 }, display: 'flex', alignItems: 'center' }}>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, width: '100%', maxWidth: 460, borderRadius: 4 }}>
          <Typography variant="h4" gutterBottom>
            Entrar
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Use o email e senha cadastrados. O primeiro cadastro criado no sistema vira owner automaticamente.
          </Typography>

          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              margin="normal"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Senha"
              type="password"
              margin="normal"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <Button fullWidth type="submit" variant="contained" color="primary" sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Entrando...' : 'Acessar'}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Nao tem conta? <Link component={RouterLink} to="/auth/signup">Criar agora</Link>
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  )
}
