import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Link, TextField, Typography } from '@mui/material'
import AuthSplitLayout from '../components/auth/AuthSplitLayout'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'

export default function SignUpPage() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const user = await signUp({ name, email, password })
      navigate(user.role === 'owner' ? '/owner/dashboard' : '/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao cadastrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout
      eyebrow="Sign Up"
      title="Criar conta"
      description="Cadastro rapido com login automatico."
      heroTitle="SIGN UP"
      heroDescription="Crie sua conta."
      heroBackground="radial-gradient(circle at 76% 14%, rgba(255,255,255,0.16), transparent 36%), radial-gradient(circle at 30% 72%, rgba(255,223,0,0.12), transparent 40%), linear-gradient(160deg, #0a8f3a 0%, #002776 100%)"
      heroPanelTitle="Primeiro acesso"
      heroPanelText="O primeiro cadastro do sistema recebe permissao de owner."
      form={
        <>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField fullWidth label="Nome" margin="normal" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField fullWidth label="Email" margin="normal" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <TextField
              fullWidth
              label="Senha"
              type="password"
              margin="normal"
              helperText="Minimo de 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button fullWidth type="submit" variant="contained" color="primary" sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Ja tem conta? <Link component={RouterLink} to="/auth">Entrar</Link>
          </Typography>
        </>
      }
    />
  )
}
