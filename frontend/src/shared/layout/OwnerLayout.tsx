import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/shared/context/AuthContext'

export default function OwnerLayout({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, status, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'anonymous') {
      navigate('/owner/login', { replace: true })
      return
    }
    if (user && user.role !== 'owner') {
      navigate('/', { replace: true })
    }
  }, [navigate, status, user])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      navigate('/owner/login', { replace: true })
      setLoggingOut(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0a0a0f] text-[#9ca3af]">
        Validando sessao...
      </div>
    )
  }

  if (!user || user.role !== 'owner') {
    return null
  }

  const ownerLinks = [
    { to: '/owner/dashboard', label: 'Dashboard' },
    { to: '/owner/products', label: 'Produtos' },
    { to: '/owner/orders', label: 'Pedidos' },
    { to: '/owner/settings', label: 'Configurações' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f0ede8]">
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#d4a843]/15">
        <span className="font-bold">Rodando Owner</span>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex">
        <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} transition-transform duration-200 bg-[#0d0d14] border-r border-[#d4a843]/15 flex flex-col`}>
          <div className="p-4 border-b border-[#d4a843]/15">
            <p className="text-sm font-bold">Rodando Owner</p>
            <p className="text-xs text-[#6b7280]">{user.email}</p>
          </div>
          <nav className="p-3 space-y-1">
            {ownerLinks.map((link) => {
              const active = location.pathname === link.to || location.pathname.startsWith(`${link.to}/`)
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`block px-3 py-2 rounded-lg text-sm ${
                    active ? 'bg-[#d4a843]/15 text-[#d4a843]' : 'text-[#a0a0a0]'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
          <div className="p-4 mt-auto">
            <button
              onClick={() => void handleLogout()}
              className={`w-full px-3 py-2 rounded-lg text-sm border border-[#d4a843]/40 text-[#d4a843] ${
                loggingOut ? 'opacity-60' : 'opacity-100'
              }`}
              disabled={loggingOut}
            >
              {loggingOut ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        </aside>

        <main className="flex-1 md:ml-64 px-4 pb-10 pt-6 md:px-8 md:pt-8 flex justify-center">
          <div className="w-full max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
