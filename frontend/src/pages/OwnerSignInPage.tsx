import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Link, TextField, Typography, InputAdornment, IconButton } from '@mui/material'
import AuthSplitLayout from '../components/auth/AuthSplitLayout'
import { useAuth } from '../context/AuthContext'
import { useAssist } from '../context/AssistContext'
import { ApiError } from '../lib/api'
import { isStrongPassword, isValidEmail } from '../lib'
import { AssistHintInline } from '../components/assist'
import { EmailOutlinedIcon, LockOutlinedIcon, VisibilityIcon, VisibilityOffIcon } from '@/ui/primitives/Icon'

interface FormErrors {
  email?: string
  password?: string
}

export default function OwnerSignInPage() {
  const navigate = useNavigate()
  const { signInOwner } = useAuth()
  const { completeStep } = useAssist()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})

  function validateForm(): boolean {
    const next: FormErrors = {}
    if (!email) next.email = 'Email e obrigatorio'
    else if (!isValidEmail(email)) next.email = 'Digite um email valido'
    if (!password) next.password = 'Senha e obrigatoria'
    else if (!isStrongPassword(password)) next.password = 'Senha deve ter pelo menos 6 caracteres'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError(null)
    try {
      await signInOwner({ email, password })
      completeStep('credentials-filled', 'owner-login')
      completeStep('signin-complete', 'owner-login')
      navigate('/owner/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao entrar no owner.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout
      eyebrow="Owner"
      title="Entrar no painel"
      description="Acesso exclusivo para conta owner."
      heroTitle="OWNER LOGIN"
      heroDescription="Gestao operacional da loja."
      informativePaneVariant="amber"
      informativeTextTone="dark"
      heroBackground="linear-gradient(180deg, #FFF6DA 0%, #FFF1CC 100%)"
      heroPanelTitle="Acesso restrito"
      heroPanelText="Somente usuarios com role owner autenticam nesta rota."
      form={
        <>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              inputProps={{ 'data-testid': 'owner-signin-email-input' }}
              fullWidth
              label="Email owner"
              margin="normal"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
              }}
              error={!!errors.email}
              helperText={errors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon tone="muted" size="md" />
                  </InputAdornment>
                ),
              }}
              required
            />
            <TextField
              inputProps={{ 'data-testid': 'owner-signin-password-input' }}
              fullWidth
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              margin="normal"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
              }}
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon tone="muted" size="md" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon tone="muted" size="md" /> : <VisibilityIcon tone="muted" size="md" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              required
            />
            <Button data-testid="owner-signin-submit-button" fullWidth type="submit" variant="contained" color="primary" sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar no owner'}
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Login de cliente? <Link component={RouterLink} to="/auth">Ir para /auth</Link>
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            <AssistHintInline tipId="owner-login-tip" routeKey="owner-login">
              Dica: esta tela aceita apenas usuários com perfil owner.
            </AssistHintInline>
          </Box>
        </>
      }
    />
  )
}
