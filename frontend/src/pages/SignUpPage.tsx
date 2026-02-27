import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Link, TextField, Typography, InputAdornment, IconButton } from '@mui/material'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import AuthSplitLayout from '../components/auth/AuthSplitLayout'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'
import { isStrongPassword, isValidEmail } from '../lib'

interface FormErrors {
  name?: string
  email?: string
  password?: string
}

export default function SignUpPage() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})

  function validateForm(): boolean {
    const newErrors: FormErrors = {}
    
    if (!name || name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres'
    }
    
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
      heroBackground="radial-gradient(circle at 76% 14%, rgba(255,255,255,0.16), transparent 36%), radial-gradient(circle at 30% 72%, rgba(255,223,0,0.12), transparent 40%), linear-gradient(160deg, #0a8f3a 0%, #111111 100%)"
      heroPanelTitle="Primeiro acesso"
      heroPanelText="O primeiro cadastro do sistema recebe permissao de owner."
      form={
        <>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField 
              fullWidth 
              label="Nome" 
              margin="normal" 
              value={name} 
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors(prev => ({ ...prev, name: undefined }))
              }} 
              error={!!errors.name}
              helperText={errors.name}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlinedIcon color="action" />
                  </InputAdornment>
                ),
              }}
              required 
            />
            <TextField 
              fullWidth 
              label="Email" 
              margin="normal" 
              type="email" 
              value={email} 
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
              }}
              error={!!errors.email}
              helperText={errors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon color="action" />
                  </InputAdornment>
                ),
              }}
              required 
            />
            <TextField
              fullWidth
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              margin="normal"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors(prev => ({ ...prev, password: undefined }))
              }}
              error={!!errors.password}
              helperText={errors.password || 'Minimo de 6 caracteres'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
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
