import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, Send, CheckCircle, Mail } from 'lucide-react'
import { BackButton } from '../shared/ui/primitives/BackButton'
import { AccountSidebar } from '../shared/ui/primitives/AccountSidebar'
import { api, ApiError } from '../shared/lib/api'
import { useAuth } from '../shared/context/AuthContext'
import { isValidEmail } from '../shared/lib'

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Fraca', color: '#ef4444' }
  if (score <= 2) return { score, label: 'Regular', color: '#f59e0b' }
  if (score <= 3) return { score, label: 'Boa', color: '#d4a843' }
  return { score, label: 'Forte', color: '#22c55e' }
}

type Step = 'idle' | 'code' | 'done'

export default function SecurityPage() {
  const { status, user, refreshSession } = useAuth()

  // ── Password change ────────────────────────────────────────────────────────
  const [pwStep, setPwStep] = useState<Step>('idle')
  const [pwSendLoading, setPwSendLoading] = useState(false)
  const [pwSendError, setPwSendError] = useState<string | null>(null)
  const [pwDevCode, setPwDevCode] = useState<string | null>(null)
  const [pwCode, setPwCode] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [showPwNew, setShowPwNew] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const pwStrength = useMemo(() => getPasswordStrength(pwNew), [pwNew])
  const [pwFieldErrors, setPwFieldErrors] = useState<{ code?: string; password?: string; confirm?: string }>({})
  const [pwConfirmLoading, setPwConfirmLoading] = useState(false)
  const [pwConfirmError, setPwConfirmError] = useState<string | null>(null)

  async function handleSendPwCode() {
    setPwSendLoading(true)
    setPwSendError(null)
    try {
      const res = await api.requestPasswordChangeCode()
      if (res.devCode) setPwDevCode(res.devCode)
      setPwStep('code')
    } catch (err) {
      setPwSendError(err instanceof ApiError ? err.message : 'Falha ao enviar código. Tente novamente.')
    } finally {
      setPwSendLoading(false)
    }
  }

  function validatePwConfirm(): boolean {
    const errors: typeof pwFieldErrors = {}
    if (!pwCode || pwCode.length !== 6 || !/^\d{6}$/.test(pwCode)) errors.code = 'Informe o código de 6 dígitos'
    if (!pwNew) errors.password = 'Nova senha é obrigatória'
    else if (pwNew.length < 6) errors.password = 'A nova senha deve ter pelo menos 6 caracteres'
    if (!pwConfirm) errors.confirm = 'Confirme a nova senha'
    else if (pwNew !== pwConfirm) errors.confirm = 'As senhas não coincidem'
    setPwFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handlePwConfirm(event: FormEvent) {
    event.preventDefault()
    if (!validatePwConfirm()) return
    setPwConfirmLoading(true)
    setPwConfirmError(null)
    try {
      await api.confirmPasswordChange(pwCode, pwNew)
      setPwStep('done')
    } catch (err) {
      setPwConfirmError(err instanceof ApiError ? err.message : 'Falha ao alterar senha.')
    } finally {
      setPwConfirmLoading(false)
    }
  }

  function resetPwForm() {
    setPwStep('idle')
    setPwCode('')
    setPwNew('')
    setPwConfirm('')
    setPwFieldErrors({})
    setPwConfirmError(null)
    setPwSendError(null)
    setPwDevCode(null)
  }

  // ── Email change ───────────────────────────────────────────────────────────
  const [emailStep, setEmailStep] = useState<Step>('idle')
  const [newEmail, setNewEmail] = useState('')
  const [newEmailError, setNewEmailError] = useState<string | null>(null)
  const [emailSendLoading, setEmailSendLoading] = useState(false)
  const [emailSendError, setEmailSendError] = useState<string | null>(null)
  const [emailDevCode, setEmailDevCode] = useState<string | null>(null)
  const [emailCode, setEmailCode] = useState('')
  const [emailCodeError, setEmailCodeError] = useState<string | null>(null)
  const [emailConfirmLoading, setEmailConfirmLoading] = useState(false)
  const [emailConfirmError, setEmailConfirmError] = useState<string | null>(null)

  async function handleSendEmailCode(event: FormEvent) {
    event.preventDefault()
    if (!isValidEmail(newEmail)) {
      setNewEmailError('Informe um email válido')
      return
    }
    setNewEmailError(null)
    setEmailSendLoading(true)
    setEmailSendError(null)
    try {
      const res = await api.requestEmailChangeCode(newEmail)
      if (res.devCode) setEmailDevCode(res.devCode)
      setEmailStep('code')
    } catch (err) {
      setEmailSendError(err instanceof ApiError ? err.message : 'Falha ao enviar código. Tente novamente.')
    } finally {
      setEmailSendLoading(false)
    }
  }

  async function handleEmailConfirm(event: FormEvent) {
    event.preventDefault()
    if (!emailCode || emailCode.length !== 6 || !/^\d{6}$/.test(emailCode)) {
      setEmailCodeError('Informe o código de 6 dígitos')
      return
    }
    setEmailCodeError(null)
    setEmailConfirmLoading(true)
    setEmailConfirmError(null)
    try {
      await api.confirmEmailChange(emailCode, newEmail)
      await refreshSession()
      setEmailStep('done')
    } catch (err) {
      setEmailConfirmError(err instanceof ApiError ? err.message : 'Falha ao alterar email.')
    } finally {
      setEmailConfirmLoading(false)
    }
  }

  function resetEmailForm() {
    setEmailStep('idle')
    setNewEmail('')
    setNewEmailError(null)
    setEmailCode('')
    setEmailCodeError(null)
    setEmailConfirmError(null)
    setEmailSendError(null)
    setEmailDevCode(null)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#9ca3af]">
            Carregando...
          </div>
        </div>
      </div>
    )
  }

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <h1 className="text-2xl mb-2 text-[#f0ede8] font-bold">Segurança</h1>
            <p className="text-sm mb-4 text-[#6b7280]">Faça login para gerenciar sua senha.</p>
            <Link
              to="/auth?returnTo=/account/security"
              className="inline-flex px-4 py-2 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold"
            >
              Entrar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <BackButton />
        <div className="flex gap-8 items-start">
          <div className="hidden md:block sticky top-28"><AccountSidebar /></div>
          <div className="flex-1 space-y-6">

            <div className="mb-6">
              <h1 className="text-2xl text-[#f0ede8] font-bold">Segurança</h1>
              <p className="text-sm text-[#6b7280]">Gerencie email e senha da sua conta.</p>
            </div>

            {/* ── Email change ─────────────────────────────────────────────── */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-1">
                <Mail className="w-5 h-5 text-[#d4a843]" />
                <h2 className="text-lg text-[#f0ede8] font-bold">Alterar email</h2>
              </div>
              <p className="text-sm text-[#6b7280] mb-4">
                Email atual: <span className="text-[#d4a843]">{user?.email}</span>
              </p>

              {emailStep === 'done' ? (
                <div className="py-4 text-center">
                  <CheckCircle className="mx-auto mb-3 w-10 h-10 text-[#22c55e]" />
                  <p className="text-sm text-[#22c55e] font-medium mb-4">Email alterado com sucesso!</p>
                  <button type="button" onClick={resetEmailForm} className="text-xs text-[#d4a843] hover:underline">
                    Alterar novamente
                  </button>
                </div>
              ) : emailStep === 'idle' ? (
                <form onSubmit={(e) => void handleSendEmailCode(e)} noValidate className="space-y-4">
                  <div>
                    <label htmlFor="email-new" className="text-xs uppercase tracking-widest text-[#d4a843]">Novo email</label>
                    <div className="relative mt-2">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                      <input
                        id="email-new"
                        type="email"
                        autoComplete="email"
                        value={newEmail}
                        onChange={(e) => { setNewEmail(e.target.value); setNewEmailError(null) }}
                        placeholder="novo@email.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                      />
                    </div>
                    {newEmailError ? <p className="text-xs mt-1 text-[#f87171]">{newEmailError}</p> : null}
                  </div>
                  {emailSendError ? (
                    <div className="p-3 rounded-lg text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">{emailSendError}</div>
                  ) : null}
                  <button
                    type="submit"
                    disabled={emailSendLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    {emailSendLoading ? 'Enviando...' : 'Enviar código de verificação'}
                  </button>
                </form>
              ) : (
                <>
                  <p className="text-sm text-[#6b7280] mb-1">
                    Enviamos um código para <span className="text-[#d4a843]">{newEmail}</span>.
                  </p>
                  <p className="text-xs text-[#6b7280] mb-4">
                    Válido por 15 minutos · Máximo de 5 tentativas.{' '}
                    <button type="button" onClick={resetEmailForm} className="text-[#d4a843] hover:underline">Cancelar</button>
                  </p>
                  {emailDevCode ? (
                    <div className="mb-4 p-3 rounded-lg text-sm bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b]">
                      <p className="font-bold mb-1">Modo dev — email não configurado</p>
                      <p>Código gerado: <span className="font-mono font-black tracking-widest text-base">{emailDevCode}</span></p>
                    </div>
                  ) : null}
                  {emailConfirmError ? (
                    <div className="mb-4 p-3 rounded-lg text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
                      {emailConfirmError}
                      {(emailConfirmError.includes('expirado') || emailConfirmError.includes('tentativas')) ? (
                        <span>{' '}<button type="button" onClick={resetEmailForm} className="underline font-medium">Solicitar novo código</button></span>
                      ) : null}
                    </div>
                  ) : null}
                  <form onSubmit={(e) => void handleEmailConfirm(e)} noValidate className="space-y-4">
                    <div>
                      <label htmlFor="email-code" className="text-xs uppercase tracking-widest text-[#d4a843]">Código de verificação</label>
                      <div className="relative mt-2">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                        <input
                          id="email-code"
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          maxLength={6}
                          value={emailCode}
                          onChange={(e) => { setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setEmailCodeError(null) }}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8] tracking-widest font-mono"
                          placeholder="000000"
                        />
                      </div>
                      {emailCodeError ? <p className="text-xs mt-1 text-[#f87171]">{emailCodeError}</p> : null}
                    </div>
                    <button
                      type="submit"
                      disabled={emailConfirmLoading}
                      className="px-4 py-2 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold disabled:opacity-60"
                    >
                      {emailConfirmLoading ? 'Confirmando...' : 'Confirmar novo email'}
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* ── Password change ───────────────────────────────────────────── */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-lg text-[#f0ede8] font-bold mb-1">Alterar senha por código</h2>

              {pwStep === 'done' ? (
                <div className="py-4 text-center">
                  <CheckCircle className="mx-auto mb-3 w-10 h-10 text-[#22c55e]" />
                  <p className="text-sm text-[#22c55e] font-medium mb-4">Senha alterada com sucesso!</p>
                  <button type="button" onClick={resetPwForm} className="text-xs text-[#d4a843] hover:underline">Alterar novamente</button>
                </div>
              ) : pwStep === 'idle' ? (
                <>
                  <p className="text-sm text-[#6b7280] mb-4">
                    Para sua segurança, enviaremos um código de verificação para{' '}
                    <span className="text-[#d4a843]">{user?.email}</span> antes de alterar a senha.
                  </p>
                  {pwSendError ? (
                    <div className="mb-4 p-3 rounded-lg text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">{pwSendError}</div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleSendPwCode()}
                    disabled={pwSendLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    {pwSendLoading ? 'Enviando...' : 'Enviar código por email'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-[#6b7280] mb-1">
                    Enviamos um código para <span className="text-[#d4a843]">{user?.email}</span>.
                  </p>
                  <p className="text-xs text-[#6b7280] mb-4">
                    Válido por 15 minutos · Máximo de 5 tentativas.{' '}
                    <button type="button" onClick={resetPwForm} className="text-[#d4a843] hover:underline">Cancelar</button>
                  </p>
                  {pwDevCode ? (
                    <div className="mb-4 p-3 rounded-lg text-sm bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b]">
                      <p className="font-bold mb-1">Modo dev — email não configurado</p>
                      <p>Código gerado: <span className="font-mono font-black tracking-widest text-base">{pwDevCode}</span></p>
                    </div>
                  ) : null}
                  {pwConfirmError ? (
                    <div className="mb-4 p-3 rounded-lg text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
                      {pwConfirmError}
                      {(pwConfirmError.includes('expirado') || pwConfirmError.includes('tentativas')) ? (
                        <span>{' '}<button type="button" onClick={resetPwForm} className="underline font-medium">Solicitar novo código</button></span>
                      ) : null}
                    </div>
                  ) : null}
                  <form onSubmit={(e) => void handlePwConfirm(e)} noValidate className="space-y-4">
                    <div>
                      <label htmlFor="sec-code" className="text-xs uppercase tracking-widest text-[#d4a843]">Código de verificação</label>
                      <div className="relative mt-2">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                        <input
                          id="sec-code"
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          maxLength={6}
                          value={pwCode}
                          onChange={(e) => { setPwCode(e.target.value.replace(/\D/g, '').slice(0, 6)); if (pwFieldErrors.code) setPwFieldErrors((p) => ({ ...p, code: undefined })) }}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8] tracking-widest font-mono"
                          placeholder="000000"
                        />
                      </div>
                      {pwFieldErrors.code ? <p className="text-xs mt-1 text-[#f87171]">{pwFieldErrors.code}</p> : null}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="sec-pw-new" className="text-xs uppercase tracking-widest text-[#d4a843]">Nova senha</label>
                        <div className="relative mt-2">
                          <input
                            id="sec-pw-new"
                            type={showPwNew ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={pwNew}
                            onChange={(e) => { setPwNew(e.target.value); if (pwFieldErrors.password) setPwFieldErrors((p) => ({ ...p, password: undefined })) }}
                            className="w-full py-2.5 pl-3 pr-10 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                          />
                          <button type="button" aria-label={showPwNew ? 'Ocultar' : 'Mostrar'} onClick={() => setShowPwNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280]">
                            {showPwNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {pwNew ? (
                          <div className="mt-2">
                            <div className="flex gap-1 mb-1">
                              {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-1 flex-1 rounded-full transition-colors"
                                  style={{ backgroundColor: pwStrength.score >= i ? pwStrength.color : 'rgba(255,255,255,0.08)' }} />
                              ))}
                            </div>
                            <p className="text-xs" style={{ color: pwStrength.color }}>{pwStrength.label}</p>
                          </div>
                        ) : null}
                        {pwFieldErrors.password ? <p className="text-xs mt-1 text-[#f87171]">{pwFieldErrors.password}</p> : null}
                      </div>
                      <div>
                        <label htmlFor="sec-pw-confirm" className="text-xs uppercase tracking-widest text-[#d4a843]">Confirmar nova senha</label>
                        <div className="relative mt-2">
                          <input
                            id="sec-pw-confirm"
                            type={showPwConfirm ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={pwConfirm}
                            onChange={(e) => { setPwConfirm(e.target.value); if (pwFieldErrors.confirm) setPwFieldErrors((p) => ({ ...p, confirm: undefined })) }}
                            className="w-full py-2.5 pl-3 pr-10 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                          />
                          <button type="button" aria-label={showPwConfirm ? 'Ocultar' : 'Mostrar'} onClick={() => setShowPwConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280]">
                            {showPwConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {pwFieldErrors.confirm ? <p className="text-xs mt-1 text-[#f87171]">{pwFieldErrors.confirm}</p> : null}
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={pwConfirmLoading}
                      className="px-4 py-2 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold disabled:opacity-60"
                    >
                      {pwConfirmLoading ? 'Salvando...' : 'Alterar senha'}
                    </button>
                  </form>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
