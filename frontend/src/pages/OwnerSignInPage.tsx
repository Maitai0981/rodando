import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useAuth } from '../shared/context/AuthContext'
import { useAssist } from '../shared/context/AssistContext'
import { ApiError } from '../shared/lib/api'
import { isStrongPassword, isValidEmail } from '../shared/lib'

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
    <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl p-6 bg-white/[0.03] border border-white/[0.06]">
          <h1 className="text-2xl mb-2 text-[#f0ede8] font-bold">Entrar no painel</h1>
          <p className="text-sm mb-6 text-[#6b7280]">Acesso exclusivo para conta owner.</p>

          {error ? (
            <div className="mb-4 p-3 rounded-lg text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="owner-signin-email" className="text-xs uppercase tracking-widest text-[#d4a843]">
                Email owner
              </label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                <input
                  id="owner-signin-email"
                  aria-label="Email owner"
                  title="Email owner"
                  data-testid="owner-signin-email-input"
                  autoComplete="username"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                  }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                  required
                />
              </div>
              {errors.email ? <p className="text-xs mt-1 text-[#f87171]">{errors.email}</p> : null}
            </div>

            <div>
              <label htmlFor="owner-signin-password" className="text-xs uppercase tracking-widest text-[#d4a843]">
                Senha
              </label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                <input
                  id="owner-signin-password"
                  aria-label="Senha"
                  title="Senha"
                  data-testid="owner-signin-password-input"
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                  }}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password ? <p className="text-xs mt-1 text-[#f87171]">{errors.password}</p> : null}
            </div>

            <button
              data-testid="owner-signin-submit-button"
              type="submit"
              className={`w-full py-3 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold ${
                loading ? 'opacity-70' : 'opacity-100'
              }`}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar no owner'}
            </button>
          </form>

          <p className="text-sm mt-4 text-[#9ca3af]">
            Login de cliente? <Link to="/auth" className="text-[#d4a843]">Ir para /auth</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
