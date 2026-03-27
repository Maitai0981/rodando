import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BackButton } from '../shared/ui/primitives/BackButton'
import { Mail, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { api, ApiError } from '../shared/lib/api'
import { isValidEmail } from '../shared/lib'

type Step = 'email' | 'code' | 'done'

function getPasswordStrength(pw: string): { label: string; width: string; color: string } {
  if (!pw) return { label: '', width: '0%', color: '' }
  if (pw.length < 6) return { label: 'Fraca', width: '25%', color: '#ef4444' }
  if (pw.length < 8) return { label: 'Regular', width: '50%', color: '#f59e0b' }
  if (pw.length < 12) return { label: 'Boa', width: '75%', color: '#3b82f6' }
  return { label: 'Forte', width: '100%', color: '#22c55e' }
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('email')

  // Step 1
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [emailApiError, setEmailApiError] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)

  // Step 2
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loadingConfirm, setLoadingConfirm] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ code?: string; password?: string; confirm?: string }>({})

  const strength = getPasswordStrength(password)

  useEffect(() => {
    if (step !== 'done') return
    const timeout = setTimeout(() => navigate('/auth'), 3500)
    return () => clearTimeout(timeout)
  }, [step, navigate])

  async function handleRequestCode(event: FormEvent) {
    event.preventDefault()
    if (!email) { setEmailError('Email é obrigatório'); return }
    if (!isValidEmail(email)) { setEmailError('Digite um email válido'); return }
    setEmailError(null)

    setLoadingEmail(true)
    setEmailApiError(null)
    try {
      const res = await api.requestPasswordReset(email)
      if ('devCode' in res && res.devCode) setDevCode(res.devCode as string)
      setStep('code')
    } catch (err) {
      setEmailApiError(err instanceof ApiError ? err.message : 'Falha ao enviar código. Tente novamente.')
    } finally {
      setLoadingEmail(false)
    }
  }

  function validateConfirm(): boolean {
    const errors: typeof fieldErrors = {}
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      errors.code = 'Informe o código de 6 dígitos recebido por email'
    }
    if (!password) {
      errors.password = 'Nova senha é obrigatória'
    } else if (password.length < 6) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres'
    }
    if (!confirmPassword) {
      errors.confirm = 'Confirme a nova senha'
    } else if (password !== confirmPassword) {
      errors.confirm = 'As senhas não coincidem'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault()
    if (!validateConfirm()) return

    setLoadingConfirm(true)
    setConfirmError(null)
    try {
      await api.confirmPasswordReset(email, code, password)
      setStep('done')
    } catch (err) {
      setConfirmError(err instanceof ApiError ? err.message : 'Falha ao redefinir senha. Tente novamente.')
    } finally {
      setLoadingConfirm(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl p-6 bg-white/[0.03] border border-white/[0.06] text-center py-10">
            <CheckCircle className="mx-auto mb-4 w-12 h-12 text-[#22c55e]" />
            <h1 className="text-2xl mb-3 text-[#f0ede8] font-bold">Senha redefinida!</h1>
            <p className="text-sm mb-6 text-[#9ca3af] leading-relaxed">
              Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes.
            </p>
            <Link to="/auth" className="text-sm text-[#d4a843] hover:underline">
              Ir para o login agora
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
        <BackButton />
        <div className="rounded-2xl p-6 bg-white/[0.03] border border-white/[0.06]">

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${step === 'email' ? 'bg-[#d4a843] text-black' : 'bg-[#22c55e] text-white'}`}>
              {step === 'email' ? '1' : '✓'}
            </div>
            <div className={`h-px flex-1 ${step === 'code' ? 'bg-[#d4a843]' : 'bg-white/[0.08]'}`} />
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${step === 'code' ? 'bg-[#d4a843] text-black' : 'bg-white/[0.08] text-[#6b7280]'}`}>
              2
            </div>
          </div>

          {/* Step 1 – Email */}
          {step === 'email' && (
            <>
              <h1 className="text-2xl mb-2 text-[#f0ede8] font-bold">Esqueci minha senha</h1>
              <p className="text-sm mb-6 text-[#6b7280]">
                Informe seu email e enviaremos um código de 6 dígitos para verificação.
              </p>

              {emailApiError ? (
                <div className="mb-4 p-3 rounded-lg text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
                  {emailApiError}
                </div>
              ) : null}

              <form onSubmit={handleRequestCode} noValidate className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="text-xs uppercase tracking-widest text-[#d4a843]">
                    Email
                  </label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                    <input
                      id="forgot-email"
                      data-testid="forgot-email-input"
                      autoComplete="email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(null) }}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                      required
                    />
                  </div>
                  {emailError ? <p className="text-xs mt-1 text-[#f87171]">{emailError}</p> : null}
                </div>

                <button
                  data-testid="forgot-submit-button"
                  type="submit"
                  disabled={loadingEmail}
                  className={`w-full py-3 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold ${loadingEmail ? 'opacity-70' : 'opacity-100'}`}
                >
                  {loadingEmail ? 'Enviando...' : 'Enviar código'}
                </button>
              </form>

              <p className="text-sm mt-4 text-[#9ca3af]">
                Lembrou a senha?{' '}
                <Link to="/auth" className="text-[#d4a843]">Entrar</Link>
              </p>
            </>
          )}

          {/* Step 2 – Code + new password */}
          {step === 'code' && (
            <>
              <h1 className="text-2xl mb-2 text-[#f0ede8] font-bold">Verificar e criar senha</h1>
              <p className="text-sm mb-1 text-[#6b7280]">
                Enviamos um código de 6 dígitos para{' '}
                <span className="text-[#d4a843] font-medium">{email}</span>.
              </p>
              <p className="text-xs mb-6 text-[#6b7280]">
                Válido por 15 minutos · Máximo de 5 tentativas.{' '}
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-[#d4a843] hover:underline"
                >
                  Alterar email
                </button>
              </p>

              {devCode ? (
                <div className="mb-4 p-3 rounded-lg text-sm bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b]">
                  <p className="font-bold mb-1">Modo dev — email não configurado</p>
                  <p>Código gerado: <span className="font-mono font-black tracking-widest text-base">{devCode}</span></p>
                </div>
              ) : null}

              {confirmError ? (
                <div className="mb-4 p-3 rounded-lg text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
                  {confirmError}
                  {(confirmError.includes('expirado') || confirmError.includes('tentativas')) ? (
                    <span>
                      {' '}
                      <button
                        type="button"
                        onClick={() => { setStep('email'); setConfirmError(null) }}
                        className="underline font-medium"
                      >
                        Solicitar novo código
                      </button>
                    </span>
                  ) : null}
                </div>
              ) : null}

              <form onSubmit={handleConfirm} noValidate className="space-y-4">
                <div>
                  <label htmlFor="forgot-code" className="text-xs uppercase tracking-widest text-[#d4a843]">
                    Código de verificação
                  </label>
                  <div className="relative mt-2">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                    <input
                      id="forgot-code"
                      data-testid="forgot-code-input"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                        setCode(v)
                        if (fieldErrors.code) setFieldErrors((p) => ({ ...p, code: undefined }))
                      }}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8] tracking-widest font-mono"
                      placeholder="000000"
                      required
                    />
                  </div>
                  {fieldErrors.code ? <p className="text-xs mt-1 text-[#f87171]">{fieldErrors.code}</p> : null}
                </div>

                <div>
                  <label htmlFor="forgot-password" className="text-xs uppercase tracking-widest text-[#d4a843]">
                    Nova senha
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="forgot-password"
                      data-testid="forgot-password-input"
                      autoComplete="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }))
                      }}
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                      required
                    />
                    <button type="button" aria-label={showPassword ? 'Ocultar' : 'Mostrar'} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280]">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password ? (
                    <div className="mt-2">
                      <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: strength.width, backgroundColor: strength.color }} />
                      </div>
                      <p className="text-xs mt-1" style={{ color: strength.color }}>{strength.label}</p>
                    </div>
                  ) : null}
                  {fieldErrors.password ? <p className="text-xs mt-1 text-[#f87171]">{fieldErrors.password}</p> : null}
                </div>

                <div>
                  <label htmlFor="forgot-confirm" className="text-xs uppercase tracking-widest text-[#d4a843]">
                    Confirmar nova senha
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="forgot-confirm"
                      data-testid="forgot-confirm-input"
                      autoComplete="new-password"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (fieldErrors.confirm) setFieldErrors((p) => ({ ...p, confirm: undefined }))
                      }}
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                      required
                    />
                    <button type="button" aria-label={showConfirm ? 'Ocultar' : 'Mostrar'} onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280]">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirm ? <p className="text-xs mt-1 text-[#f87171]">{fieldErrors.confirm}</p> : null}
                </div>

                <button
                  data-testid="forgot-confirm-button"
                  type="submit"
                  disabled={loadingConfirm}
                  className={`w-full py-3 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold ${loadingConfirm ? 'opacity-70' : 'opacity-100'}`}
                >
                  {loadingConfirm ? 'Salvando...' : 'Redefinir senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
