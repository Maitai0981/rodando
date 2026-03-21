import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import {
  ShoppingCart,
  Menu,
  X,
  Search,
  Phone,
  MapPin,
  Mail,
  Instagram,
  Facebook,
  ChevronRight,
  Zap,
  LogIn,
  LogOut,
  UserRound,
  Sun,
  Moon,
} from 'lucide-react'
import { useCart } from '@/shared/context/CartContext'
import { useAuth } from '@/shared/context/AuthContext'
import { useSiteTheme } from '@/shared/context/ThemeContext'
import { AccountMenu } from '@/shared/ui/primitives/AccountMenu'

const navLinks = [
  { label: 'Início', path: '/' },
  { label: 'Catálogo', path: '/catalog' },
]

export default function SiteLayout() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const { itemCount } = useCart()
  const { status, logout, user } = useAuth()
  const { isLightTheme, toggleTheme } = useSiteTheme()
  const isAuthenticated = status === 'authenticated'
  const showHeaderSearch = location.pathname === '/'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location])

  useEffect(() => {
    if (location.pathname !== '/catalog') return
    const params = new URLSearchParams(location.search)
    setSearchValue(params.get('q') || '')
  }, [location.pathname, location.search])

  useEffect(() => {
    if (showHeaderSearch) return
    setSearchOpen(false)
  }, [showHeaderSearch])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = searchValue.trim()
    setSearchOpen(false)
    navigate(query ? `/catalog?q=${encodeURIComponent(query)}` : '/catalog')
  }

  function isNavLinkActive(path: string) {
    if (path === '/') return location.pathname === '/'
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f] text-[#f0ede8]">
      <m.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-[#d4a843]/15'
            : 'bg-transparent border-b border-transparent'
        }`}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <m.div
              className="relative flex items-center gap-2"
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#d4a843] to-[#f0c040]">
                <Zap className="w-4 h-4 text-black" />
              </div>
              <div>
                <span className="text-sm tracking-widest uppercase text-[#d4a843] font-['Rajdhani'] font-bold">
                  RODANDO
                </span>
                <span className="block text-xs text-gray-400 -mt-1 tracking-wider">
                  MOTO CENTER
                </span>
              </div>
            </m.div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path}>
                <m.span
                  className={`relative text-sm tracking-[0.1em] uppercase font-medium ${
                    isNavLinkActive(link.path) ? 'text-[#d4a843]' : 'text-[#a0a0a0]'
                  }`}
                  whileHover={{ color: '#d4a843' }}
                  transition={{ duration: 0.2 }}
                >
                  {link.label}
                  {isNavLinkActive(link.path) && (
                    <m.div
                      className="absolute -bottom-1 left-0 right-0 h-0.5 rounded bg-gradient-to-r from-[#d4a843] to-[#f0c040]"
                      layoutId="nav-indicator"
                    />
                  )}
                </m.span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {showHeaderSearch ? (
              <m.button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 rounded-lg transition-colors text-[#a0a0a0]"
                whileHover={{ color: '#d4a843', background: 'rgba(212,168,67,0.1)' }}
                whileTap={{ scale: 0.9 }}
                aria-label="Abrir busca"
              >
                <Search className="w-5 h-5" />
              </m.button>
            ) : null}

            {/* Carrinho */}
            <Link to="/cart" aria-label="Ver carrinho">
              <m.div
                whileHover={{ background: 'rgba(212,168,67,0.1)' }}
                whileTap={{ scale: 0.9 }}
                className="relative p-2 rounded-lg text-[#a0a0a0] cursor-pointer"
              >
                <ShoppingCart className={`w-5 h-5 ${itemCount > 0 ? 'text-[#d4a843]' : ''}`} />
                <AnimatePresence>
                  {itemCount > 0 && (
                    <m.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-black bg-[#d4a843]"
                    >
                      {itemCount}
                    </m.span>
                  )}
                </AnimatePresence>
              </m.div>
            </Link>

            {/* Avatar / dropdown de conta */}
            <div className="hidden sm:block">
              <AccountMenu />
            </div>

            {/* Menu mobile */}
            <m.button
              className="md:hidden p-2 text-[#a0a0a0]"
              onClick={() => setMenuOpen(!menuOpen)}
              whileTap={{ scale: 0.9 }}
              aria-label="Abrir menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </m.button>
          </div>
        </div>

        <AnimatePresence>
          {showHeaderSearch && searchOpen && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-[#d4a843]/15"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                <form className="relative" onSubmit={handleSearchSubmit}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4a843]" />
                  <input
                    type="text"
                    placeholder="Buscar produto, categoria ou marca..."
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    aria-label="Buscar no catálogo"
                    className="w-full pl-10 pr-24 py-2.5 rounded-lg text-sm outline-none bg-white/[0.05] border border-[#d4a843]/30 text-[#f0ede8]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-xs font-semibold text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040]"
                  >
                    Buscar
                  </button>
                </form>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {menuOpen && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden bg-[#0a0a0f]/95 border-t border-[#d4a843]/15"
            >
              <div className="px-4 py-4 flex flex-col gap-2">
                {navLinks.map((link, i) => (
                  <m.div
                    key={link.path}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Link
                      to={link.path}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                        isNavLinkActive(link.path)
                          ? 'bg-[#d4a843]/15 text-[#d4a843]'
                          : 'text-[#a0a0a0]'
                      }`}
                    >
                      <span className="text-sm tracking-wider uppercase font-medium">
                        {link.label}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </m.div>
                ))}

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="mt-2 flex items-center justify-between px-4 py-3 rounded-lg border border-white/[0.08] text-[#f0ede8]"
                >
                  <span className="text-sm tracking-wider uppercase font-medium">
                    {isLightTheme ? 'Tema escuro' : 'Tema claro'}
                  </span>
                  {isLightTheme ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>

                {isAuthenticated ? (
                  <div className="flex items-center gap-3 px-2 py-2 rounded-lg border border-[#d4a843]/20 bg-[#d4a843]/05">
                    <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden border-2 border-[#d4a843]/40 bg-gradient-to-br from-[#d4a843] to-[#f0c040] flex items-center justify-center text-black font-black text-sm select-none">
                      {user?.avatarUrl
                        ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                        : (user?.name ?? 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#f0ede8] truncate">{user?.name ?? 'Usuário'}</p>
                      <p className="text-xs text-[#a0a0a0]">{user?.role === 'owner' ? 'Administrador' : 'Cliente'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="p-2 rounded-lg text-[#a0a0a0] hover:text-[#d4a843] hover:bg-[#d4a843]/10 transition-colors"
                      aria-label="Sair da conta"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      className="flex items-center justify-between px-4 py-3 rounded-lg border border-white/[0.08] text-[#f0ede8]"
                    >
                      <span className="text-sm tracking-wider uppercase font-medium">Entrar</span>
                      <LogIn className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/auth/signup"
                      className="flex items-center justify-between px-4 py-3 rounded-lg border border-white/[0.08] text-[#f0ede8]"
                    >
                      <span className="text-sm tracking-wider uppercase font-medium">
                        Criar conta
                      </span>
                      <UserRound className="w-4 h-4" />
                    </Link>
                  </>
                )}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </m.header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-[#060608] border-t border-[#d4a843]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#d4a843] to-[#f0c040]">
                  <Zap className="w-4 h-4 text-black" />
                </div>
                <div>
                  <span className="text-sm tracking-widest uppercase text-[#d4a843] font-['Rajdhani'] font-bold">
                    RODANDO
                  </span>
                  <span className="ml-1 text-xs text-gray-500 tracking-wider">MOTO CENTER</span>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs mb-4">
                Peças para sua moto, com suporte técnico local. Rodando te ajudando a continuar
                rodando.
              </p>
              <p className="text-xs text-[#d4a843]">Rodando te ajudando a continuar rodando</p>
              <div className="flex items-center gap-2 mt-4 text-sm text-gray-400">
                <MapPin className="w-4 h-4 flex-shrink-0 text-[#d4a843]" />
                <span>Av. Brasil, 8708 · Cascavel/PR</span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                <Phone className="w-4 h-4 flex-shrink-0 text-[#d4a843]" />
                <span>+55 45 99934-6779</span>
              </div>
              <div className="flex gap-3 mt-5">
                <m.a
                  href="#"
                  whileHover={{ scale: 1.15, color: '#d4a843' }}
                  className="p-2 rounded-lg bg-white/[0.05] text-[#a0a0a0]"
                >
                  <Instagram className="w-4 h-4" />
                </m.a>
                <m.a
                  href="#"
                  whileHover={{ scale: 1.15, color: '#d4a843' }}
                  className="p-2 rounded-lg bg-white/[0.05] text-[#a0a0a0]"
                >
                  <Facebook className="w-4 h-4" />
                </m.a>
              </div>
            </div>

            <div>
              <h4 className="text-xs tracking-widest uppercase mb-4 text-[#d4a843] font-semibold">
                Links Rápidos
              </h4>
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="text-sm text-gray-400 hover:text-amber-400 transition-colors flex items-center gap-1 group"
                    >
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#d4a843]" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs tracking-widest uppercase mb-4 text-[#d4a843] font-semibold">
                Atendimento
              </h4>
              <div className="space-y-3 text-sm text-gray-400">
                <div>
                  <p className="font-medium text-[#f0ede8]">Seg a Sex</p>
                  <p>08h às 18h</p>
                </div>
                <div>
                  <p className="font-medium text-[#f0ede8]">Sábado</p>
                  <p>08h às 12h</p>
                </div>
                <m.a
                  href="https://wa.me/5545999634779"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg text-xs text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-semibold"
                  whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(212,168,67,0.4)' }}
                >
                  <Phone className="w-3 h-3" />
                  Falar no WhatsApp
                </m.a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.05]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-gray-600">
              © 2026 Rodando Moto Center. Todos os direitos reservados.
            </p>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              contato@rodandomoto.com.br
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
