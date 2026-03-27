import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, Send, CheckCircle } from 'lucide-react'
import { BackButton } from '../shared/ui/primitives/BackButton'
import { AccountSidebar } from '../shared/ui/primitives/AccountSidebar'
import { api, ApiError } from '../shared/lib/api'
import { useAuth } from '../shared/context/AuthContext'

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
  const { status, user } = useAuth()

  const [step, setStep] = useState<Step>('idle')
  const [sendLoading, setSendLoading] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [showPwNew, setShowPwNew] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const pwStrength = useMemo(() => getPasswordStrength(pwNew), [pwNew])
  const [fieldErrors, setFieldErrors] = useState<{ code?: string; password?: string; confirm?: string }>({})
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  async function handleSendCode() {
    setSendLoading(true)
    setSendError(null)
    try {
      const res = await api.requestPasswordChangeCode()
      if ('devCode' in res && res.devCode) setDevCode(res.devCode as string)
      setStep('code')
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : 'Falha ao enviar código. Tente novamente.')
    } finally {
      setSendLoading(false)
    }
  }

  function validateConfirm(): boolean {
    const errors: typeof fieldErrors = {}
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      errors.code = 'Informe o código de 6 dígitos recebido por email'
    }
    if (!pwNew) {
      errors.password = 'Nova senha é obrigatória'
    } else if (pwNew.length < 6) {
      errors.password = 'A nova senha deve ter pelo menos 6 caracteres'
    }
    if (!pwConfirm) {
      errors.confirm = 'Confirme a nova senha'
    } else if (pwNew !== pwConfirm) {
      errors.confirm = 'As senhas não coincidem'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault()
    if (!validateConfirm()) return

    setConfirmLoading(true)
    setConfirmError(null)
    try {
      await api.confirmPasswordChange(code, pwNew)
      setStep('done')
    } catch (err) {
      setConfirmError(err instanceof ApiError ? err.message : 'Falha ao alterar senha.')
    } finally {
      setConfirmLoading(false)
    }
  }

  function resetForm() {
    setStep('idle')
    setCode('')
    setPwNew('')
    setPwConfirm('')
    setFieldErrors({})
    setConfirmError(null)
    setSendError(null)
    setDevCode(null)
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
              <p className="text-sm text-[#6b7280]">Gerencie sua senha de acesso.</p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-lg text-[#f0ede8] font-bold mb-1">Alterar senha por código</h2>

              {/* Done state */}
              {step === 'done' ? (
                <div className="py-4 text-center">
                  <CheckCircle className="mx-auto mb-3 w-10 h-10 text-[#22c55e]" />
                  <p className="text-sm text-[#22c55e] font-medium mb-4">Senha alterada com sucesso!</p>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-[#d4a843] hover:underline"
                  >
                    Alterar novamente
                  </button>
                </div>
              ) : step === 'idle' ? (
                /* Idle state – show send code button */
                <>
                  <p className="text-sm text-[#6b7280] mb-4">
                    Para sua segurança, enviaremos um código de verificação para{' '}
                    <span className="text-[#d4a843]">{user?.email}</span> antes de alterar a senha.
                  </p>

                  {sendError ? (
                    <div className="mb-4 p-3 rounded-lg text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
                      {sendError}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void handleSendCode()}
                    disabled={sendLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    {sendLoading ? 'Enviando...' : 'Enviar código por email'}
                  </button>
                </>
              ) : (
                /* Code step – enter OTP + new password */
                <>
                  <p className="text-sm text-[#6b7280] mb-1">
                    Enviamos um código para{' '}
                    <span className="text-[#d4a843]">{user?.email}</span>.
                  </p>
                  <p className="text-xs text-[#6b7280] mb-4">
                    Válido por 15 minutos · Máximo de 5 tentativas.{' '}
                    <button type="button" onClick={resetForm} className="text-[#d4a843] hover:underline">
                      Cancelar
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
                          <button type="button" onClick={resetForm} className="underline font-medium">
                            Solicitar novo código
                          </button>
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <form onSubmit={(e) => void handleConfirm(e)} noValidate className="space-y-4">
                    <div>
                      <label htmlFor="sec-code" className="text-xs uppercase tracking-widest text-[#d4a843]">
                        Código de verificação
                      </label>
                      <div className="relative mt-2">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                        <input
                          id="sec-code"
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
                        />
                      </div>
                      {fieldErrors.code ? <p className="text-xs mt-1 text-[#f87171]">{fieldErrors.code}</p> : null}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="sec-pw-new" className="text-xs uppercase tracking-widest text-[#d4a843]">
                          Nova senha
                        </label>
                        <div className="relative mt-2">
                          <input
                            id="sec-pw-new"
                            type={showPwNew ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={pwNew}
                            onChange={(e) => {
                              setPwNew(e.target.value)
                              if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }))
                            }}
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
                        {fieldErrors.password ? <p className="text-xs mt-1 text-[#f87171]">{fieldErrors.password}</p> : null}
                      </div>

                      <div>
                        <label htmlFor="sec-pw-confirm" className="text-xs uppercase tracking-widest text-[#d4a843]">
                          Confirmar nova senha
                        </label>
                        <div className="relative mt-2">
                          <input
                            id="sec-pw-confirm"
                            type={showPwConfirm ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={pwConfirm}
                            onChange={(e) => {
                              setPwConfirm(e.target.value)
                              if (fieldErrors.confirm) setFieldErrors((p) => ({ ...p, confirm: undefined }))
                            }}
                            className="w-full py-2.5 pl-3 pr-10 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                          />
                          <button type="button" aria-label={showPwConfirm ? 'Ocultar' : 'Mostrar'} onClick={() => setShowPwConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280]">
                            {showPwConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {fieldErrors.confirm ? <p className="text-xs mt-1 text-[#f87171]">{fieldErrors.confirm}</p> : null}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={confirmLoading}
                      className="px-4 py-2 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold disabled:opacity-60"
                    >
                      {confirmLoading ? 'Salvando...' : 'Alterar senha'}
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
