import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAssist } from '../../context/AssistContext'
import { useCart } from '../../context/CartContext'
import { prefetchRouteChunk } from '../../routes/prefetch'
import { Container } from './Container'
import { CounterBadge } from '../primitives/Badge'
import {
  CloseRoundedIcon,
  MenuRoundedIcon,
  NavAccountIcon,
  NavBagIcon,
  NavCatalogIcon,
  NavHomeIcon,
} from '@/ui/primitives/Icon'

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
  const navigate = useNavigate()
  const location = useLocation()
  const { itemCount } = useCart()
  const { status, logout, user } = useAuth()
  const { completeStep } = useAssist()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchInputValue, setSearchInputValue] = useState('')

  function handlePrefetch(pathname: string) {
    prefetchRouteChunk(pathname)
  }

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
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

  const mobileMenuLinks = [
    {
      label: 'Inicio',
      href: '/',
      icon: <NavHomeIcon size="md" tone={location.pathname === '/' ? 'accent' : 'muted'} />,
      active: location.pathname === '/',
    },
    {
      label: 'Catalogo',
      href: '/catalog',
      icon: <NavCatalogIcon size="md" tone={isCatalogRoute(location.pathname) ? 'accent' : 'muted'} />,
      active: isCatalogRoute(location.pathname),
    },
    {
      label: itemCount > 0 ? `Mochila (${itemCount})` : 'Mochila',
      href: '/cart',
      icon: <NavBagIcon size="md" tone={isCartRoute(location.pathname) ? 'accent' : 'muted'} />,
      active: isCartRoute(location.pathname),
    },
    {
      label: accountLabel,
      href: accountHref,
      icon: <NavAccountIcon size="md" tone={isAccountRoute(location.pathname) ? 'accent' : 'muted'} />,
      active: isAccountRoute(location.pathname),
    },
  ]

  return (
    <>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <Container>
          <Toolbar disableGutters sx={{ minHeight: { xs: 62, md: 78 }, gap: { xs: 1, md: 2 }, pb: { xs: 1, md: 0 } }}>
            <IconButton
              aria-label="Abrir menu"
              edge="start"
              onClick={() => setDrawerOpen(true)}
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
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'primary.main',
                  fontWeight: 700,
                }}
              >
                R
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ lineHeight: 1, fontWeight: 800 }}>RODANDO</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
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
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#FFFFFF',
                  color: 'text.primary',
                  font: 'inherit',
                  '&:focus': {
                    outline: '2px solid',
                    outlineColor: 'secondary.main',
                    borderColor: 'secondary.main',
                  },
                }}
              />
            </Box>

            <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
              {NAV_LINKS.map((link) => (
                <Button
                  data-testid={link.testId}
                  key={link.href}
                  component={RouterLink}
                  to={link.href}
                  onMouseEnter={() => handlePrefetch(link.href)}
                  onFocus={() => handlePrefetch(link.href)}
                  onTouchStart={() => handlePrefetch(link.href)}
                  onClick={() => {
                    if (link.href === '/catalog') {
                      completeStep('open-catalog', 'home')
                    }
                  }}
                  color={isActive(location.pathname, link.href) ? 'secondary' : 'inherit'}
                  variant={isActive(location.pathname, link.href) ? 'outlined' : 'text'}
                  sx={{ minHeight: 40, px: 1.5, fontWeight: isActive(location.pathname, link.href) ? 700 : 600 }}
                >
                  {link.label}
                </Button>
              ))}
            </Stack>

            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconButton
                data-testid="header-cart-button"
                aria-label="Abrir carrinho"
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
                  borderRadius: 2,
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

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: 'min(88vw, 360px)',
            maxWidth: 360,
            p: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 14px 34px rgba(15,23,42,0.18)',
            overflow: 'hidden',
          }
        }}
      >
        <Stack sx={{ height: '100%', pt: 'max(env(safe-area-inset-top, 0px), 0px)' }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, py: 1.5 }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
              Menu
            </Typography>
            <IconButton aria-label="Fechar menu" onClick={() => setDrawerOpen(false)}>
              <CloseRoundedIcon size="md" />
            </IconButton>
          </Stack>
          <Divider />
          <List sx={{ p: 1.2, display: 'grid', gap: 0.6 }}>
            {mobileMenuLinks.map((link) => (
              <ListItem disablePadding key={`mobile-${link.href}`}>
                <ListItemButton
                  component={RouterLink}
                  to={link.href}
                  selected={link.active}
                  onMouseEnter={() => handlePrefetch(link.href)}
                  onFocus={() => handlePrefetch(link.href)}
                  onTouchStart={() => handlePrefetch(link.href)}
                  onClick={() => {
                    if (link.href === '/catalog') completeStep('open-catalog', 'home')
                    setDrawerOpen(false)
                  }}
                  sx={{
                    minHeight: 48,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: link.active ? 'rgba(22,163,74,0.34)' : 'transparent',
                    bgcolor: link.active ? 'rgba(22,163,74,0.12)' : 'transparent',
                    '&:hover': {
                      bgcolor: link.active ? 'rgba(22,163,74,0.16)' : 'rgba(15,23,42,0.04)',
                    },
                    '&.Mui-selected': {
                      bgcolor: 'rgba(22,163,74,0.12)',
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
          <Divider sx={{ mt: 0.6 }} />
          <Stack sx={{ mt: 'auto', p: 2, pb: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }} spacing={1}>
            <Button fullWidth variant="contained" component={RouterLink} to="/catalog" onClick={() => setDrawerOpen(false)}>
              Ver catalogo
            </Button>
            {status === 'authenticated' ? (
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                onClick={() => {
                  void handleLogout()
                  setDrawerOpen(false)
                }}
              >
                Sair da conta
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Drawer>
    </>
  )
}
