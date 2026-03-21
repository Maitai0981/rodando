import { Link, useLocation } from 'react-router-dom'
import { User, Package, Lock } from 'lucide-react'

const links = [
  { to: '/account/profile', label: 'Perfil', icon: User },
  { to: '/orders', label: 'Meus Pedidos', icon: Package },
  { to: '/account/security', label: 'Segurança', icon: Lock },
]

export function AccountSidebar() {
  const { pathname } = useLocation()
  return (
    <nav className="flex flex-col gap-1 min-w-[180px]">
      {links.map(({ to, label, icon: Icon }) => {
        const active = pathname === to || pathname.startsWith(to + '/')
        return (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              active
                ? 'bg-[#d4a843]/12 text-[#d4a843]'
                : 'text-[#a0a0a0] hover:text-[#f0ede8] hover:bg-white/[0.05]'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
