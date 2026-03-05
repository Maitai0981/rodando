import { EmailOutlinedIcon, FlagOutlinedIcon, HomeOutlinedIcon, LocationCityOutlinedIcon, LockOutlinedIcon, PersonOutlinedIcon, PinDropOutlinedIcon, VisibilityIcon, VisibilityOffIcon } from '@/ui/primitives/Icon'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
} from '@mui/material'
import AuthSplitLayout from '../components/auth/AuthSplitLayout'
import { useAuth } from '../context/AuthContext'
import { useAssist } from '../context/AssistContext'
import { ApiError } from '../lib/api'
import { isStrongPassword, isValidCep, isValidEmail, maskCep, normalizeCep } from '../lib'
import { AssistHintInline } from '../components/assist'

interface FormErrors {
  name?: string
  email?: string
  password?: string
  cep?: string
}

export default function SignUpPage() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const { completeStep } = useAssist()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cep, setCep] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [stateValue, setStateValue] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [cepLoaded, setCepLoaded] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})

  function clearAddress() {
    setStreet('')
    setCity('')
    setStateValue('')
    setCepLoaded(false)
  }

  async function lookupCepAddress(currentCep: string) {
    const digits = normalizeCep(currentCep)
    if (digits.length !== 8) return

    setCepLoading(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`CEP lookup falhou: ${response.status}`)
      }

      const payload = await response.json()
      if (payload?.erro) {
        setErrors((prev) => ({ ...prev, cep: 'CEP nao encontrado' }))
        clearAddress()
        return
      }

      const resolvedStreet = String(payload?.logradouro || '').trim()
      const resolvedCity = String(payload?.localidade || '').trim()
      const resolvedState = String(payload?.uf || '').trim().toUpperCase()
      if (!resolvedCity || !resolvedState) {
        setErrors((prev) => ({ ...prev, cep: 'CEP sem cidade/UF validos' }))
        clearAddress()
        return
      }

      setStreet(resolvedStreet)
      setCity(resolvedCity)
      setStateValue(resolvedState)
      setCepLoaded(true)
      completeStep('cep-validated', 'auth-signup')
      setErrors((prev) => ({ ...prev, cep: undefined }))
    } catch {
      setErrors((prev) => ({
        ...prev,
        cep: 'Nao foi possivel consultar o CEP agora. Tente novamente.',
      }))
      clearAddress()
    } finally {
      setCepLoading(false)
    }
  }

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

    if (!cep) {
      newErrors.cep = 'CEP e obrigatorio'
    } else if (!isValidCep(cep)) {
      newErrors.cep = 'Informe um CEP valido'
    } else if (!cepLoaded || !city || !stateValue) {
      newErrors.cep = 'Valide o CEP para preencher o endereco'
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
      await signUp({
        name,
        email,
        password,
        cep,
        addressStreet: street,
        addressCity: city,
        addressState: stateValue,
      })
      completeStep('form-filled', 'auth-signup')
      completeStep('signup-complete', 'auth-signup')
      navigate('/')
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
      informativePaneVariant="amber"
      informativeTextTone="dark"
      heroBackground="linear-gradient(180deg, #FFF6DA 0%, #FFF1CC 100%)"
      heroPanelTitle="Primeiro acesso"
      heroPanelText="Cadastro exclusivo para cliente. Acesso owner e separado."
      form={(
        <>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              inputProps={{
                'data-testid': 'signup-name-input',
                autoComplete: 'name',
              }}
              fullWidth
              label="Nome"
              margin="normal"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
              }}
              error={Boolean(errors.name)}
              helperText={errors.name}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlinedIcon tone="muted" size="md" />
                  </InputAdornment>
                ),
              }}
              required
            />

            <TextField
              inputProps={{
                'data-testid': 'signup-email-input',
                autoComplete: 'email',
              }}
              fullWidth
              label="Email"
              margin="normal"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
              }}
              error={Boolean(errors.email)}
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
              inputProps={{
                'data-testid': 'signup-password-input',
                autoComplete: 'new-password',
              }}
              fullWidth
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              margin="normal"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
              }}
              error={Boolean(errors.password)}
              helperText={errors.password || 'Minimo de 6 caracteres'}
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

            <TextField
              inputProps={{ 'data-testid': 'signup-cep-input' }}
              fullWidth
              label="CEP"
              margin="normal"
              value={cep}
              onChange={(event) => {
                const masked = maskCep(event.target.value)
                setCep(masked)
                if (errors.cep) setErrors((prev) => ({ ...prev, cep: undefined }))
                if (normalizeCep(masked).length < 8) clearAddress()
                if (normalizeCep(masked).length === 8) {
                  void lookupCepAddress(masked)
                }
              }}
              onBlur={() => {
                if (normalizeCep(cep).length === 8 && !cepLoaded) {
                  void lookupCepAddress(cep)
                }
              }}
              error={Boolean(errors.cep)}
              helperText={errors.cep || 'Informe 8 digitos'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PinDropOutlinedIcon tone="muted" size="md" />
                  </InputAdornment>
                ),
                endAdornment: cepLoading ? (
                  <InputAdornment position="end">
                    <CircularProgress size={16} />
                  </InputAdornment>
                ) : null,
              }}
              required
            />

            <TextField
              inputProps={{ 'data-testid': 'signup-address-street-input' }}
              fullWidth
              label="Logradouro"
              margin="normal"
              value={street}
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <HomeOutlinedIcon tone="muted" size="md" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              inputProps={{ 'data-testid': 'signup-address-city-input' }}
              fullWidth
              label="Cidade"
              margin="normal"
              value={city}
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <LocationCityOutlinedIcon tone="muted" size="md" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              inputProps={{ 'data-testid': 'signup-address-state-input' }}
              fullWidth
              label="UF"
              margin="normal"
              value={stateValue}
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <FlagOutlinedIcon tone="muted" size="md" />
                  </InputAdornment>
                ),
              }}
            />

            <Button data-testid="signup-submit-button" fullWidth type="submit" variant="contained" color="primary" sx={{ mt: 2 }} disabled={loading || cepLoading}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Ja tem conta? <Link component={RouterLink} to="/auth">Entrar</Link>
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            <AssistHintInline tipId="signup-tip-cep" routeKey="auth-signup">
              Dica: valide o CEP para preencher cidade e UF automaticamente.
            </AssistHintInline>
          </Box>
        </>
      )}
    />
  )
}
