import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
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

export default function SignInPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { signIn } = useAuth()
  const { completeStep } = useAssist()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})

  function validateForm(): boolean {
    const newErrors: FormErrors = {}
    
    if (!email) {
      newErrors.email = 'Email e obrigatorio'
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Digite um email valido'
    }
    
    if (!password) {
      newErrors.password = 'Senha e obrigatoria'
    } else if (!isStrongPassword(password)) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    setError(null)

    try {
      await signIn({ email, password })
      completeStep('credentials-filled', 'auth-signin')
      completeStep('signin-complete', 'auth-signin')
      const returnTo = searchParams.get('returnTo')
      navigate(returnTo || '/')
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
      informativePaneVariant="amber"
      informativeTextTone="dark"
      heroBackground="linear-gradient(180deg, #FFF6DA 0%, #FFF1CC 100%)"
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
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              inputProps={{ 'data-testid': 'signin-email-input' }}
              fullWidth
              label="Email"
              margin="normal"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
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
              inputProps={{ 'data-testid': 'signin-password-input' }}
              fullWidth
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              margin="normal"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (errors.password) setErrors(prev => ({ ...prev, password: undefined }))
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
            <Button data-testid="signin-submit-button" fullWidth type="submit" variant="contained" color="primary" sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Entrando...' : 'Acessar'}
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Nao tem conta? <Link component={RouterLink} to="/auth/signup">Criar agora</Link>
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Conta owner: use <Link component={RouterLink} to="/owner/login">/owner/login</Link>.
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            <AssistHintInline tipId="signin-tip-owner" routeKey="auth-signin">
              Se você é cliente comum, use esta tela. Conta owner entra em /owner/login.
            </AssistHintInline>
          </Box>
        </>
      }
    />
  )
}
