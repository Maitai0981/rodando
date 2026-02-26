import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Link, TextField, Typography } from '@mui/material'
import AuthSplitLayout from '../components/auth/AuthSplitLayout'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'

export default function SignInPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const user = await signIn({ email, password })
      navigate(user.role === 'owner' ? '/owner/dashboard' : '/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout
      eyebrow="Sign In"
      title="Entrar"
      description="Entre com seu email e senha."
      heroTitle="SIGN IN"
      heroDescription="Acesse sua conta."
      heroBackground="radial-gradient(circle at 22% 18%, rgba(255,255,255,0.14), transparent 36%), radial-gradient(circle at 78% 68%, rgba(255,223,0,0.1), transparent 38%), linear-gradient(160deg, #0a8f3a 0%, #002776 100%)"
      heroPanelTitle="Acesso seguro"
      heroPanelText="Sessao por cookie e autenticacao integrada ao backend."
      form={
        <>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
              {String(error).toLowerCase().includes('credenciais') ? ' Verifique o email/senha ou crie uma conta primeiro.' : ''}
            </Alert>
          ) : null}
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
        </>
      }
    />
  )
}
