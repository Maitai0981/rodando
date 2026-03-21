import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { User, Package, LogOut, ChevronRight, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '@/shared/context/AuthContext'

function AvatarImg({ src, initial }: { src: string; initial: string }) {
  const [broken, setBroken] = useState(false)
  if (broken)
    return (
      <div className="w-full h-full rounded-full bg-gradient-to-br from-[#d4a843] to-[#f0c040] flex items-center justify-center text-black font-black text-sm select-none">
        {initial}
      </div>
    )
  return (
    <img
      src={src}
      alt=""
      className="w-full h-full rounded-full object-cover"
      onError={() => setBroken(true)}
    />
  )
}

export function AccountMenu() {
  const { status, user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isAuthenticated = status === 'authenticated'
  const accountHref = isAuthenticated
    ? user?.role === 'owner'
      ? '/owner/dashboard'
      : '/account/profile'
    : '/auth'
  const initial = (user?.name ?? 'U')[0].toUpperCase()

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function handleLogout() {
    setOpen(false)
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div ref={ref} className="relative">
      {/* Botão avatar */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={isAuthenticated ? `Menu de ${user?.name ?? 'usuário'}` : 'Entrar'}
        className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 border-2 ${
          isAuthenticated
            ? 'border-[#d4a843]/55 hover:border-[#d4a843] hover:shadow-[0_0_0_3px_rgba(212,168,67,0.15)]'
            : 'border-white/15 hover:border-[#d4a843] hover:shadow-[0_0_0_3px_rgba(212,168,67,0.15)]'
        }`}
      >
        {isAuthenticated ? (
          user?.avatarUrl ? (
            <AvatarImg src={user.avatarUrl} initial={initial} />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#d4a843] to-[#f0c040] flex items-center justify-center text-black font-black text-sm select-none">
              {initial}
            </div>
          )
        ) : (
          <User className="w-4 h-4 text-white/75" />
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#0d0d14] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden z-50"
          >
            {isAuthenticated ? (
              <>
                {/* Cabeçalho com avatar + nome */}
                <Link
                  to={accountHref}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden border-2 border-[#d4a843]/40">
                    {user?.avatarUrl ? (
                      <AvatarImg src={user.avatarUrl} initial={initial} />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#d4a843] to-[#f0c040] flex items-center justify-center text-black font-black text-sm select-none">
                        {initial}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#f0ede8] truncate">{user?.name}</p>
                    <p className="text-xs text-[#6b7280] truncate">{user?.email}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#6b7280] flex-shrink-0" />
                </Link>

                <div className="border-t border-white/[0.06]" />

                {/* Links */}
                <div className="py-1.5">
                  <Link
                    to="/account/profile"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#d0ccc6] hover:text-[#f0ede8] hover:bg-white/[0.04] transition-colors"
                  >
                    <User className="w-4 h-4 text-[#6b7280]" />
                    Meu perfil
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#d0ccc6] hover:text-[#f0ede8] hover:bg-white/[0.04] transition-colors"
                  >
                    <Package className="w-4 h-4 text-[#6b7280]" />
                    Meus pedidos
                  </Link>
                  {user?.role === 'owner' && (
                    <Link
                      to="/owner/dashboard"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#d4a843] hover:bg-[#d4a843]/10 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                      Painel admin
                    </Link>
                  )}
                </div>

                <div className="border-t border-white/[0.06]" />

                {/* Sair */}
                <div className="py-1.5">
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#f87171] hover:bg-[#ef4444]/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair da conta
                  </button>
                </div>
              </>
            ) : (
              <div className="py-1.5">
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#d0ccc6] hover:text-[#f0ede8] hover:bg-white/[0.04] transition-colors"
                >
                  <LogIn className="w-4 h-4 text-[#6b7280]" />
                  Entrar
                </Link>
                <Link
                  to="/auth/signup"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#d0ccc6] hover:text-[#f0ede8] hover:bg-white/[0.04] transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-[#6b7280]" />
                  Criar conta
                </Link>
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
