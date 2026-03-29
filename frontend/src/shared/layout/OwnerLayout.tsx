import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Menu, Package, Settings, Shield, ShoppingBag, Users, X, Zap } from 'lucide-react'
import { useAuth } from '@/shared/context/AuthContext'

const NAV_GROUPS = [
  {
    label: 'Operações',
    ownerOnly: false,
    items: [
      { to: '/owner/dashboard', label: 'Início',        icon: LayoutDashboard },
      { to: '/owner/orders',    label: 'Pedidos',       icon: ShoppingBag     },
    ],
  },
  {
    label: 'Catálogo',
    ownerOnly: false,
    items: [
      { to: '/owner/products', label: 'Produtos', icon: Package },
    ],
  },
  {
    label: 'Equipe',
    ownerOnly: true,
    items: [
      { to: '/owner/staff',  label: 'Funcionários', icon: Users  },
      { to: '/owner/audit',  label: 'Auditoria',    icon: Shield },
    ],
  },
  {
    label: 'Sistema',
    ownerOnly: false,
    items: [
      { to: '/owner/settings', label: 'Configurações', icon: Settings },
    ],
  },
]

const MOBILE_BAR_H = 49 // px — altura da barra superior no mobile

export default function OwnerLayout({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, status, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'anonymous') { navigate('/owner/login', { replace: true }); return }
    if (user && user.role !== 'owner' && user.role !== 'staff') navigate('/', { replace: true })
  }, [navigate, status, user])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  async function handleLogout() {
    setLoggingOut(true)
    try { await logout() } finally {
      navigate('/owner/login', { replace: true })
      setLoggingOut(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0a0a0f] text-[#6b7280] text-sm">
        Verificando acesso...
      </div>
    )
  }

  if (!user || (user.role !== 'owner' && user.role !== 'staff')) return null

  const initials = (user.name ?? user.email ?? 'U').slice(0, 2).toUpperCase()

  const Sidebar = (
    <aside
      style={{ top: `${MOBILE_BAR_H}px` }}
      className={`fixed md:static md:top-auto bottom-0 left-0 z-40 w-64 flex flex-col transform
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        transition-transform duration-200 ease-in-out
        bg-[#0d0d14] border-r border-white/[0.07]`}
    >
      {/* Logo — visível só no desktop */}
      <div className="hidden md:flex items-center gap-3 px-5 py-5 border-b border-white/[0.07] flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d4a843] to-[#f0c040] flex items-center justify-center flex-shrink-0 shadow-sm">
          <Zap className="w-[18px] h-[18px] text-black" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight text-[#f0ede8] truncate">Rodando</p>
          <p className="text-[10px] text-[#6b7280] tracking-widest leading-tight mt-0.5 uppercase">Painel de Gestão</p>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
        {NAV_GROUPS.filter((g) => !g.ownerOnly || user.role === 'owner').map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'pt-3' : ''}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b7280]">
              {group.label}
            </p>
            {group.items.map(({ to, label, icon: Icon }) => {
              const active =
                location.pathname === to ||
                (to !== '/owner/dashboard' && location.pathname.startsWith(`${to}/`))
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-[#d4a843]/[0.12] text-[#d4a843]'
                      : 'text-[#9ca3af] hover:bg-white/[0.05] hover:text-[#e5e7eb]'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#d4a843]' : 'text-[#6b7280]'}`} />
                  {label}
                  {active ? (
                    <span className="ml-auto w-1 h-4 rounded-full bg-[#d4a843]" />
                  ) : null}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Usuário + sair */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-white/[0.07] space-y-1">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-[#d4a843]/20 border border-[#d4a843]/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-[#d4a843]">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[#e5e7eb] truncate leading-tight">{user.name || user.email}</p>
            <p className="text-[10px] text-[#6b7280] leading-tight mt-0.5">{user.role === 'owner' ? 'Proprietário' : 'Funcionário'}</p>
          </div>
        </div>
        <button
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#6b7280] hover:text-[#f87171] hover:bg-red-500/[0.06] transition-colors disabled:opacity-50"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {loggingOut ? 'Saindo...' : 'Sair da conta'}
        </button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f] text-[#f0ede8]">

      {/* ── Barra superior mobile ─────────────────────────────── */}
      <div
        className="md:hidden flex-shrink-0 flex items-center justify-between px-4 bg-[#0d0d14] border-b border-white/[0.07]"
        style={{ height: MOBILE_BAR_H }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#d4a843] to-[#f0c040] flex items-center justify-center flex-shrink-0">
            <Zap className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="text-sm font-bold tracking-tight">Rodando Gestão</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/[0.07] transition-colors"
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ── Layout principal ──────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Backdrop mobile */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {Sidebar}

        {/* Conteúdo */}
        <main className="flex-1 min-w-0">
          <div className="px-4 pb-12 pt-6 md:px-8 md:pt-8 max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
