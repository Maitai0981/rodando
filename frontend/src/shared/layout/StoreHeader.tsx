import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Grow from '@mui/material/Grow'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import Modal from '@mui/material/Modal'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { LayoutGroup } from 'framer-motion'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/shared/context/AuthContext'
import { useAssist } from '@/shared/context/AssistContext'
import { useCart } from '@/shared/context/CartContext'
import { prefetchRouteChunk } from '@/routes/prefetch'
import { Container } from './Container'
import { BrandWordmark } from '../ui/primitives/BrandWordmark'
import { CounterBadge } from '../ui/primitives/Badge'
import { NavTransition } from '../ui/primitives/NavTransition'
import {
  CloseRoundedIcon,
  MenuRoundedIcon,
  NavAccountIcon,
  NavBagIcon,
  NavCatalogIcon,
  NavHomeIcon,
} from '@/shared/ui/primitives/Icon'

const NAV_LINKS = [
  { label: 'Inicio', href: '/', testId: 'header-nav-home' },
  { label: 'Catalogo', href: '/catalog', testId: 'header-nav-catalog' },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function isCatalogRoute(pathname: string) {
  return pathname === '/catalog' || pathname.startsWith('/catalog/') || pathname.startsWith('/produto/')
}

function isCartRoute(pathname: string) {
  return pathname === '/cart' || pathname.startsWith('/cart/') || pathname === '/checkout'
}

function isAccountRoute(pathname: string) {
  return pathname.startsWith('/auth')
    || pathname.startsWith('/account')
    || pathname.startsWith('/orders')
    || pathname.startsWith('/owner')
}

export function StoreHeader() {
  const theme = useTheme()
  const isMobileViewport = useMediaQuery(theme.breakpoints.down('md'))
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const navigate = useNavigate()
  const location = useLocation()
  const { itemCount } = useCart()
  const { status, logout, user } = useAuth()
  const { completeStep } = useAssist()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchInputValue, setSearchInputValue] = useState('')
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null)

  function handlePrefetch(pathname: string) {
    prefetchRouteChunk(pathname)
  }

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  function handleOpenMobileMenu() {
    setDrawerOpen(true)
  }

  function handleCloseMobileMenu(restoreFocus = false) {
    setDrawerOpen(false)
    if (restoreFocus && typeof window !== 'undefined') {
      window.setTimeout(() => {
        menuTriggerRef.current?.focus()
      }, 0)
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = searchInputValue.trim()
    navigate(`/catalog${query ? `?q=${encodeURIComponent(query)}` : ''}`)
    if (location.pathname === '/') {
      completeStep('search-used', 'home')
      completeStep('open-catalog', 'home')
    }
    completeStep('filter-applied', 'catalog')
  }

  const accountLabel = status === 'authenticated' ? user?.name || 'Conta' : 'Entrar'
  const accountHref = status === 'authenticated'
    ? (user?.role === 'owner' ? '/owner/dashboard' : '/account/profile')
    : '/auth'

  const mobileMenuLinks = useMemo(() => [
    {
      label: 'Inicio',
      href: '/',
      prefetchPath: '/',
      icon: <NavHomeIcon size="md" tone={location.pathname === '/' ? 'accent' : 'muted'} />,
      active: location.pathname === '/',
    },
    {
      label: 'Catalogo',
      href: '/catalog',
      prefetchPath: '/catalog',
      icon: <NavCatalogIcon size="md" tone={isCatalogRoute(location.pathname) ? 'accent' : 'muted'} />,
      active: isCatalogRoute(location.pathname),
    },
    {
      label: itemCount > 0 ? `Mochila (${itemCount})` : 'Mochila',
      href: '/cart',
      prefetchPath: '/cart',
      icon: <NavBagIcon size="md" tone={isCartRoute(location.pathname) ? 'accent' : 'muted'} />,
      active: isCartRoute(location.pathname),
    },
    {
      label: accountLabel,
      href: accountHref,
      prefetchPath: accountHref,
      icon: <NavAccountIcon size="md" tone={isAccountRoute(location.pathname) ? 'accent' : 'muted'} />,
      active: isAccountRoute(location.pathname),
    },
  ], [accountHref, accountLabel, itemCount, location.pathname])

  const mobileAuxLinks = useMemo(
    () => [
      { label: 'Promocoes', href: '/catalog?promo=true&sort=discount-desc', prefetchPath: '/catalog' },
      { label: 'Pedidos', href: '/orders', prefetchPath: '/orders' },
    ],
    [],
  )

  const isMobileMenuOpen = drawerOpen && isMobileViewport

  return (
    <>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: 'none',
          bgcolor: 'rgba(252,247,236,0.88)',
          backdropFilter: 'blur(14px) saturate(1.04)',
          WebkitBackdropFilter: 'blur(14px) saturate(1.04)',
          boxShadow: '0 10px 24px rgba(14,27,46,0.09)',
        }}
      >
        <Container>
          <Toolbar disableGutters sx={{ minHeight: { xs: 62, md: 78 }, gap: { xs: 1, md: 2 }, pb: { xs: 1, md: 0 } }}>
            <IconButton
              ref={menuTriggerRef}
              aria-label="Abrir menu"
              aria-haspopup="dialog"
              aria-controls="mobile-header-menu"
              aria-expanded={isMobileMenuOpen}
              edge="start"
              onClick={handleOpenMobileMenu}
              className="ds-pressable"
              sx={{ display: { xs: 'inline-flex', md: 'none' } }}
            >
              <MenuRoundedIcon size="lg" />
            </IconButton>

            <Stack component={RouterLink} to="/" direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  width: { xs: 36, md: 40 },
                  height: { xs: 36, md: 40 },
                  borderRadius: '50%',
                  border: 'none',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  background: 'linear-gradient(160deg, rgba(51,74,98,0.94) 0%, rgba(31,49,70,0.96) 72%, rgba(138,115,94,0.85) 100%)',
                  boxShadow: '0 8px 18px rgba(20,34,53,0.16)',
                }}
              >
                R
              </Box>
              <Box>
                <BrandWordmark variant="compact" tone="dark" text="RODANDO" sx={{ fontSize: '1.02rem' }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, letterSpacing: '0.04em' }}>
                  Moto Center
                </Typography>

              </Box>
            </Stack>

            <Box
              component="form"
              onSubmit={handleSearchSubmit}
              data-testid="header-search-autocomplete"
              sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }}
            >
              <Box
                component="input"
                type="search"
                placeholder="Buscar por produto, categoria ou marca"
                value={searchInputValue}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchInputValue(event.target.value)}
                data-testid="header-search-input"
                sx={{
                  width: '100%',
                  minHeight: 40,
                  px: 1.6,
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#FFFFFF',
                  color: 'text.primary',
                  font: 'inherit',
                  '&:focus': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    borderColor: 'primary.main',
                  },
                }}
              />
            </Box>

            <LayoutGroup id="header-route-nav">
              <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
                {NAV_LINKS.map((link) => {
                  const active = isActive(location.pathname, link.href)
                  return (
                    <NavTransition
                      key={link.href}
                      to={link.href}
                      label={link.label}
                      testId={link.testId}
                      active={active}
                      layoutId="header-nav-active-pill"
                      onIntent={handlePrefetch}
                      onSelect={() => {
                        if (link.href === '/catalog') {
                          completeStep('open-catalog', 'home')
                        }
                      }}
                      sx={{
                        border: 'none',
                        bgcolor: active ? 'rgba(216,154,42,0.16)' : 'transparent',
                        }}
                    />
                  )
                })}
              </Stack>
            </LayoutGroup>

            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconButton
                data-testid="header-cart-button"
                aria-label="Abrir carrinho"
                className="ds-pressable"
                component={RouterLink}
                to="/cart"
                onMouseEnter={() => handlePrefetch('/cart')}
                onFocus={() => handlePrefetch('/cart')}
                onTouchStart={() => handlePrefetch('/cart')}
              >
                <CounterBadge content={itemCount}>
                  <NavBagIcon size="md" />
                </CounterBadge>
              </IconButton>
              <Button
                data-testid="header-account-button"
                className="ds-pressable ds-action-glint"
                component={RouterLink}
                to={accountHref}
                variant="outlined"
                startIcon={<NavAccountIcon size="sm" />}
                onMouseEnter={() => handlePrefetch(accountHref)}
                onFocus={() => handlePrefetch(accountHref)}
                onTouchStart={() => handlePrefetch(accountHref)}
                sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
              >
                {accountLabel}
              </Button>
              {status === 'authenticated' ? (
                <Button
                  data-testid="header-logout-button"
                  className="ds-pressable ds-action-glint"
                  variant="text"
                  color="inherit"
                  onClick={() => {
                    void handleLogout()
                  }}
                  sx={{ display: { xs: 'none', lg: 'inline-flex' } }}
                >
                  Sair
                </Button>
              ) : null}
            </Stack>
          </Toolbar>

          <Box sx={{ display: { xs: 'block', md: 'none' }, pb: 1.4 }}>
            <Box component="form" onSubmit={handleSearchSubmit}>
              <Box
                component="input"
                type="search"
                data-testid="header-search-input-mobile"
                placeholder="Buscar produto ou categoria"
                value={searchInputValue}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchInputValue(event.target.value)}
                sx={{
                  width: '100%',
                  minHeight: 40,
                  px: 1.5,
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#FFFFFF',
                  font: 'inherit',
                }}
              />
            </Box>
          </Box>
        </Container>
      </AppBar>

      <Modal
        open={isMobileMenuOpen}
        onClose={() => handleCloseMobileMenu(true)}
        keepMounted
        closeAfterTransition
        slotProps={{
          backdrop: {
            sx: {
              bgcolor: 'rgba(12, 21, 39, 0.34)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              transition: prefersReducedMotion ? 'none' : 'opacity var(--ds-motion-fast)',
            },
          },
        }}
      >
        <Grow
          in={isMobileMenuOpen}
          timeout={prefersReducedMotion ? 0 : { enter: 360, exit: 280 }}
          style={{ transformOrigin: 'top center' }}
        >
          <Box
            id="mobile-header-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-header-menu-title"
            className="ds-menu-panel"
            sx={{
              display: { xs: 'flex', md: 'none' },
              position: 'fixed',
              inset: 0,
              bgcolor: '#F8FBF9',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(14, 27, 46, 0.2)',
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ px: 2, py: 1.5, pt: 'max(calc(env(safe-area-inset-top, 0px) + 12px), 12px)' }}
            >
              <Stack spacing={0.2}>
                <Typography
                  id="mobile-header-menu-title"
                  variant="subtitle1"
                  sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}
                >
                  Menu
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Acesso rápido às principais áreas
                </Typography>
              </Stack>
              <IconButton
                aria-label="Fechar menu"
                className="ds-pressable"
                onClick={() => handleCloseMobileMenu(true)}
              >
                <CloseRoundedIcon size="md" />
              </IconButton>
            </Stack>

            <Divider />

            <Box sx={{ flex: 1, overflowY: 'auto', px: 1.4, py: 1.4 }}>
              <Stack spacing={1.6}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.09em', color: 'text.secondary', px: 0.8 }}
                  >
                    Navegação
                  </Typography>
                  <List sx={{ p: 0.2, mt: 0.8, display: 'grid', gap: 0.7 }}>
                    {mobileMenuLinks.map((link, index) => (
                      <ListItem disablePadding key={`mobile-${link.href}`}>
                        <ListItemButton
                          component={RouterLink}
                          className={`ds-pressable ds-menu-item ds-action-glint ${
                            prefersReducedMotion ? '[animation-delay:0ms]' : `[animation-delay:${index * 30}ms]`
                          }`}
                          to={link.href}
                          selected={link.active}
                          onMouseEnter={() => handlePrefetch(link.prefetchPath)}
                          onFocus={() => handlePrefetch(link.prefetchPath)}
                          onTouchStart={() => handlePrefetch(link.prefetchPath)}
                          onClick={() => {
                            if (link.href === '/catalog') completeStep('open-catalog', 'home')
                            handleCloseMobileMenu(false)
                          }}
                          data-testid={`mobile-menu-link-${index}`}
                          sx={{
                            minHeight: 56,
                            borderRadius: 2.4,
                            border: 'none',
                            bgcolor: link.active ? 'rgba(51,74,98,0.12)' : 'transparent',
                            '&:hover': {
                              bgcolor: link.active ? 'rgba(51,74,98,0.16)' : 'rgba(15,23,42,0.04)',
                            },
                            '&.Mui-selected': {
                              bgcolor: 'rgba(51,74,98,0.12)',
                            },
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ width: '100%' }}>
                            <Box sx={{ display: 'grid', placeItems: 'center', color: link.active ? 'primary.main' : 'text.secondary' }}>
                              {link.icon}
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: link.active ? 700 : 600 }}>
                              {link.label}
                            </Typography>
                          </Stack>
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.09em', color: 'text.secondary', px: 0.8 }}
                  >
                    Atalhos
                  </Typography>
                  <List sx={{ p: 0.2, mt: 0.8, display: 'grid', gap: 0.7 }}>
                    {mobileAuxLinks.map((link, index) => (
                      <ListItem disablePadding key={`mobile-aux-${link.href}`}>
                        <ListItemButton
                          component={RouterLink}
                          className={`ds-pressable ds-menu-item ds-action-glint ${
                            prefersReducedMotion
                              ? '[animation-delay:0ms]'
                              : `[animation-delay:${(index + mobileMenuLinks.length) * 30}ms]`
                          }`}
                          to={link.href}
                          onMouseEnter={() => handlePrefetch(link.prefetchPath)}
                          onFocus={() => handlePrefetch(link.prefetchPath)}
                          onTouchStart={() => handlePrefetch(link.prefetchPath)}
                          onClick={() => handleCloseMobileMenu(false)}
                          sx={{
                            minHeight: 52,
                            borderRadius: 2.4,
                            border: 'none',
                            bgcolor: 'rgba(255,255,255,0.68)',
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {link.label}
                          </Typography>
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Stack>
            </Box>

            <Divider />
            <Stack
              spacing={1}
              sx={{
                p: 2,
                pb: 'calc(16px + env(safe-area-inset-bottom, 0px))',
                bgcolor: 'rgba(242, 246, 243, 0.92)',
              }}
            >
              <Button
                fullWidth
                variant="contained"
                component={RouterLink}
                className="ds-pressable"
                to="/catalog"
                onClick={() => handleCloseMobileMenu(false)}
              >
                Ver catalogo
              </Button>
              {status === 'authenticated' ? (
                <Button
                  fullWidth
                  variant="outlined"
                  color="inherit"
                  className="ds-pressable"
                  onClick={() => {
                    void handleLogout()
                    handleCloseMobileMenu(false)
                  }}
                >
                  Sair da conta
                </Button>
              ) : null}
            </Stack>
          </Box>
        </Grow>
      </Modal>
    </>
  )
}
