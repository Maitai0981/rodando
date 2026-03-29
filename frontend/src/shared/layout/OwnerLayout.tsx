import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Menu, Package, Settings, ShoppingBag, X, Zap } from 'lucide-react'
import { useAuth } from '@/shared/context/AuthContext'

const NAV_GROUPS = [
  {
    label: 'Operações',
    items: [
      { to: '/owner/dashboard', label: 'Início',       icon: LayoutDashboard },
      { to: '/owner/orders',    label: 'Pedidos',      icon: ShoppingBag     },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { to: '/owner/products', label: 'Produtos', icon: Package },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/owner/settings', label: 'Configurações', icon: Settings },
    ],
  },
]

export default function OwnerLayout({ children }: PropsWithChildren) {
  const navigate    = useNavigate()
  const location    = useLocation()
  const { user, status, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'anonymous') { navigate('/owner/login', { replace: true }); return }
    if (user && user.role !== 'owner') navigate('/', { replace: true })
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

  if (!user || user.role !== 'owner') return null

  const initials = (user.email ?? 'U').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f0ede8]">

      {/* ── Mobile top bar ────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0d0d14] border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#d4a843] to-[#f0c040] flex items-center justify-center flex-shrink-0">
            <Zap className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="text-sm font-bold tracking-tight">Rodando Gestão</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex">

        {/* ── Mobile backdrop ───────────────────────────────────── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-40 w-64 flex flex-col transform ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          } transition-transform duration-200 bg-[#0d0d14] border-r border-white/[0.06]`}
        >
          {/* Logo */}
          <div className="px-5 py-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d4a843] to-[#f0c040] flex items-center justify-center flex-shrink-0">
                <Zap className="w-[18px] h-[18px] text-black" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight text-[#f0ede8]">Rodando</p>
                <p className="text-[10px] text-[#4b5563] tracking-wider leading-tight mt-0.5 uppercase">Painel de Gestão</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#374151]">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map(({ to, label, icon: Icon }) => {
                    const active =
                      location.pathname === to ||
                      (to !== '/owner/dashboard' && location.pathname.startsWith(`${to}/`))
                    return (
                      <li key={to}>
                        <Link
                          to={to}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            active
                              ? 'bg-[#d4a843]/10 text-[#d4a843] border border-[#d4a843]/20'
                              : 'text-[#9ca3af] hover:bg-white/[0.05] hover:text-[#f0ede8] border border-transparent'
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          {label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* User info + logout */}
          <div className="px-4 py-4 border-t border-white/[0.06] space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#d4a843]/15 border border-[#d4a843]/25 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-[#d4a843]">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#f0ede8] truncate">{user.email}</p>
                <p className="text-[10px] text-[#4b5563] mt-0.5">Administrador</p>
              </div>
            </div>
            <button
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#6b7280] hover:text-[#f87171] hover:bg-red-500/[0.07] transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {loggingOut ? 'Saindo...' : 'Sair da conta'}
            </button>
          </div>
        </aside>

        {/* ── Main ──────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="px-4 pb-12 pt-6 md:px-8 md:pt-8 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
