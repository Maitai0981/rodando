import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Grid, Link, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { api, ApiError } from '../lib/api'

export default function SignUpPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await api.signUp({ name, email, password })
      setSuccess(result.message)
      if (result.user.role === 'owner') {
        navigate('/owner/dashboard')
        return
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao cadastrar.')
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
            'radial-gradient(circle at 75% 15%, rgba(255,255,255,0.2), transparent 35%), radial-gradient(circle at 30% 70%, rgba(255,223,0,0.18), transparent 40%), linear-gradient(150deg, #009C3B 0%, #002776 100%)',
          color: '#fff',
          p: { xs: 3, md: 6 },
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Stack spacing={3} sx={{ maxWidth: 480 }}>
          <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.75)' }}>
            Sign Up
          </Typography>
          <Typography variant="h2" sx={{ color: '#fff' }}>
            Crie sua conta para acessar catalogo e painel.
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Sistema com backend Express, autenticacao por sessao e CRUD de produtos para operacao de motos.
          </Typography>
          <Box sx={{ p: 3, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.16)' }}>
            <Typography variant="subtitle1" sx={{ color: '#fff' }}>Regra do owner</Typography>
            <Typography variant="body2" sx={{ opacity: 0.86 }}>
              O primeiro cadastro criado vira owner automaticamente e pode gerenciar produtos no dashboard.
            </Typography>
          </Box>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }} sx={{ p: { xs: 3, md: 6 }, display: 'flex', alignItems: 'center' }}>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, width: '100%', maxWidth: 460, borderRadius: 4 }}>
          <Typography variant="h4" gutterBottom>
            Criar conta
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cadastro rapido com login automatico apos sucesso.
          </Typography>

          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
          {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Nome"
              margin="normal"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
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
              helperText="Minimo de 6 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <Button fullWidth type="submit" variant="contained" color="primary" sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Ja tem conta? <Link component={RouterLink} to="/auth">Entrar</Link>
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  )
}
