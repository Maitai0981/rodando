import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Shield,
  ShieldOff,
  User,
  UserPlus,
  X,
} from 'lucide-react'
import OwnerLayout from '../shared/layout/OwnerLayout'
import { api, friendlyError, type StaffMember } from '../shared/lib/api'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

// ── Sub-components ─────────────────────────────────────────────────────────

function FieldInput({
  id, label, icon: Icon, type = 'text', value, onChange, error, autoComplete,
}: {
  id: string
  label: string
  icon: React.ElementType
  type?: string
  value: string
  onChange: (v: string) => void
  error?: string
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[10px] uppercase tracking-widest text-[#d4a843] mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8] focus:border-[#d4a843]/50"
        />
      </div>
      {error ? <p className="text-[10px] text-[#f87171] mt-1">{error}</p> : null}
    </div>
  )
}

// ── Modal: criar funcionário ───────────────────────────────────────────────

function CreateStaffModal({ onClose, onCreated }: { onClose: () => void; onCreated: (s: StaffMember) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validate() {
    const e: Record<string, string> = {}
    if (name.trim().length < 2) e.name = 'Nome muito curto'
    if (!email.includes('@')) e.email = 'Email inválido'
    if (password.length < 6) e.password = 'Mínimo 6 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError(null)
    try {
      const { item } = await api.createStaff({ name: name.trim(), email: email.trim(), password })
      onCreated(item)
    } catch (err) {
      setError(friendlyError(err, 'Falha ao criar funcionário.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-[#0d0d14] border border-white/[0.08] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[#f0ede8] flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#d4a843]" />
            Novo funcionário
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-[#f0ede8] hover:bg-white/[0.06]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error ? (
          <div className="mb-4 p-3 rounded-lg text-xs bg-red-500/10 border border-red-500/20 text-[#f87171]">{error}</div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <FieldInput id="staff-name" label="Nome completo" icon={User} value={name} onChange={setName} error={errors.name} autoComplete="name" />
          <FieldInput id="staff-email" label="E-mail" icon={Mail} type="email" value={email} onChange={setEmail} error={errors.email} autoComplete="email" />
          <FieldInput id="staff-password" label="Senha inicial" icon={Lock} type="password" value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" />

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-xl text-sm border border-white/[0.1] text-[#9ca3af] hover:text-[#f0ede8] hover:border-white/[0.2] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 h-10 rounded-xl text-sm bg-[#d4a843] text-black font-bold flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {loading ? 'Criando...' : 'Criar conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal: redefinir senha ─────────────────────────────────────────────────

function ResetPasswordModal({ staff, onClose }: { staff: StaffMember; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return }
    if (password !== confirm) { setError('Senhas não coincidem'); return }
    setLoading(true)
    setError(null)
    try {
      await api.resetStaffPassword(staff.id, { password })
      setDone(true)
    } catch (err) {
      setError(friendlyError(err, 'Falha ao redefinir senha.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-sm rounded-2xl bg-[#0d0d14] border border-white/[0.08] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[#f0ede8] flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#d4a843]" />
            Redefinir senha
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-[#f0ede8] hover:bg-white/[0.06]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-[#6b7280] mb-4">
          Definir nova senha para <span className="text-[#f0ede8] font-medium">{staff.name}</span>.
          Todas as sessões ativas serão encerradas.
        </p>

        {done ? (
          <div className="p-3 rounded-lg text-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            Senha redefinida. Funcionário precisará entrar novamente.
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error ? <div className="p-3 rounded-lg text-xs bg-red-500/10 border border-red-500/20 text-[#f87171]">{error}</div> : null}
            <FieldInput id="reset-pw" label="Nova senha" icon={Lock} type="password" value={password} onChange={setPassword} autoComplete="new-password" />
            <FieldInput id="reset-pw-confirm" label="Confirmar senha" icon={Lock} type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            <button type="submit" disabled={loading}
              className="w-full h-10 rounded-xl text-sm bg-[#d4a843] text-black font-bold flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {loading ? 'Salvando...' : 'Confirmar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function OwnerStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null)
  const [toggling, setToggling] = useState<number | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await api.listStaff()
      if (mountedRef.current) setStaff(items)
    } catch (err) {
      if (mountedRef.current) setError(friendlyError(err, 'Falha ao carregar funcionários.'))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function toggleActive(member: StaffMember) {
    setToggling(member.id)
    try {
      const { item } = await api.updateStaff(member.id, { active: !member.active })
      setStaff((prev) => prev.map((s) => s.id === item.id ? item : s))
    } catch (err) {
      setError(friendlyError(err, 'Falha ao atualizar funcionário.'))
    } finally {
      setToggling(null)
    }
  }

  function handleCreated(item: StaffMember) {
    setStaff((prev) => [item, ...prev])
    setShowCreate(false)
  }

  const active = staff.filter((s) => s.active)
  const inactive = staff.filter((s) => !s.active)

  return (
    <OwnerLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#f0ede8]">Funcionários</h1>
            <p className="mt-0.5 text-xs text-[#6b7280]">
              Gerencie as contas de acesso da equipe ao painel.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void load()} disabled={loading}
              className="flex items-center gap-2 h-9 px-3 rounded-lg text-xs border border-white/[0.1] text-[#9ca3af] hover:text-[#f0ede8] hover:border-white/[0.2] transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg text-xs bg-[#d4a843]/10 border border-[#d4a843]/30 text-[#d4a843] hover:bg-[#d4a843]/15 transition-colors font-medium">
              <UserPlus className="w-3.5 h-3.5" />
              Novo funcionário
            </button>
          </div>
        </div>

        {error ? (
          <div className="p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/20 text-[#f87171]">{error}</div>
        ) : null}

        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total', value: staff.length, color: 'text-[#f0ede8]' },
            { label: 'Ativos', value: active.length, color: 'text-emerald-400' },
            { label: 'Inativos', value: inactive.length, color: 'text-[#6b7280]' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07]">
              <p className="text-[10px] uppercase tracking-widest text-[#6b7280]">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Lista */}
        {loading && staff.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-[#6b7280] text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <User className="w-8 h-8 text-[#374151] mb-3" />
            <p className="text-sm text-[#6b7280]">Nenhum funcionário cadastrado ainda.</p>
            <button onClick={() => setShowCreate(true)}
              className="mt-4 flex items-center gap-2 h-9 px-4 rounded-lg text-xs bg-[#d4a843]/10 border border-[#d4a843]/30 text-[#d4a843] hover:bg-[#d4a843]/15 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Adicionar primeiro funcionário
            </button>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-white/[0.07]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-[#6b7280] font-medium">Funcionário</th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-[#6b7280] font-medium hidden sm:table-cell">Cadastro</th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-[#6b7280] font-medium hidden md:table-cell">Último acesso</th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-[#6b7280] font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-[#6b7280] font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => (
                    <tr key={member.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${
                            member.active
                              ? 'bg-[#d4a843]/20 border border-[#d4a843]/30 text-[#d4a843]'
                              : 'bg-white/[0.05] border border-white/[0.1] text-[#6b7280]'
                          }`}>
                            {initials(member.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#e5e7eb] truncate">{member.name}</p>
                            <p className="text-[11px] text-[#6b7280] truncate">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6b7280] hidden sm:table-cell">
                        {formatDate(member.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6b7280] hidden md:table-cell">
                        {formatDate(member.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          member.active
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                            : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
                        }`}>
                          {member.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setResetTarget(member)}
                            title="Redefinir senha"
                            className="w-8 h-8 rounded-lg border border-white/[0.08] text-[#6b7280] hover:text-[#d4a843] hover:border-[#d4a843]/30 inline-flex items-center justify-center transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => void toggleActive(member)}
                            disabled={toggling === member.id}
                            title={member.active ? 'Desativar conta' : 'Reativar conta'}
                            className={`w-8 h-8 rounded-lg border inline-flex items-center justify-center transition-colors disabled:opacity-50 ${
                              member.active
                                ? 'border-red-500/20 text-red-400 hover:bg-red-500/[0.06]'
                                : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/[0.06]'
                            }`}
                          >
                            {toggling === member.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : member.active
                                ? <ShieldOff className="w-3.5 h-3.5" />
                                : <Shield className="w-3.5 h-3.5" />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showCreate ? <CreateStaffModal onClose={() => setShowCreate(false)} onCreated={handleCreated} /> : null}
      {resetTarget ? <ResetPasswordModal staff={resetTarget} onClose={() => setResetTarget(null)} /> : null}
    </OwnerLayout>
  )
}
