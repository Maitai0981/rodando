import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { useAuth } from '../shared/context/AuthContext'
import { ApiError } from '../shared/lib/api'
import { isStrongPassword, isValidEmail } from '../shared/lib'

interface FormErrors {
  name?: string
  email?: string
  cep?: string
  password?: string
}

export default function SignUpPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cep, setCep] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})

  function validateForm(): boolean {
    const newErrors: FormErrors = {}

    if (!name) {
      newErrors.name = 'Nome e obrigatorio'
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
      await signUp({ name, email, password, cep })
      const returnTo = searchParams.get('returnTo')
      navigate(returnTo || '/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl p-6 bg-white/[0.03] border border-white/[0.06]">
          <h1 className="text-2xl mb-2 text-[#f0ede8] font-bold">Criar conta</h1>
          <p className="text-sm mb-6 text-[#6b7280]">Cadastre-se para acompanhar seus pedidos.</p>

          {error ? (
            <div className="mb-4 p-3 rounded-lg text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="signup-name" className="text-xs uppercase tracking-widest text-[#d4a843]">
                Nome
              </label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                <input
                  id="signup-name"
                  aria-label="Nome"
                  title="Nome"
                  data-testid="signup-name-input"
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
                  }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                  required
                />
              </div>
              {errors.name ? <p className="text-xs mt-1 text-[#f87171]">{errors.name}</p> : null}
            </div>

            <div>
              <label htmlFor="signup-email" className="text-xs uppercase tracking-widest text-[#d4a843]">
                Email
              </label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                <input
                  id="signup-email"
                  aria-label="Email"
                  title="Email"
                  data-testid="signup-email-input"
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
              <label htmlFor="signup-cep" className="text-xs uppercase tracking-widest text-[#d4a843]">
                CEP
              </label>
              <div className="relative mt-2">
                <input
                  id="signup-cep"
                  aria-label="CEP"
                  title="CEP"
                  data-testid="signup-cep-input"
                  type="text"
                  value={cep}
                  onChange={(event) => {
                    setCep(event.target.value)
                    if (errors.cep) setErrors((prev) => ({ ...prev, cep: undefined }))
                  }}
                  className="w-full py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                  required
                />
              </div>
              {errors.cep ? <p className="text-xs mt-1 text-[#f87171]">{errors.cep}</p> : null}
            </div>

            <div>
              <label htmlFor="signup-password" className="text-xs uppercase tracking-widest text-[#d4a843]">
                Senha
              </label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                <input
                  id="signup-password"
                  aria-label="Senha"
                  title="Senha"
                  data-testid="signup-password-input"
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
              data-testid="signup-submit-button"
              type="submit"
              className={`w-full py-3 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold ${
                loading ? 'opacity-70' : 'opacity-100'
              }`}
              disabled={loading}
            >
              {loading ? 'Criando...' : 'Criar conta'}
            </button>
          </form>

          <p className="text-sm mt-4 text-[#9ca3af]">
            Já tem conta? <Link to="/auth" className="text-[#d4a843]">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
