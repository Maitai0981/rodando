import { MenuRoundedIcon, NavAccountIcon, NavBagIcon, NavCatalogIcon, NavHomeIcon } from '@/ui/primitives/Icon'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import type { ChangeEvent, FormEvent } from 'react'
import { useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { useCart } from '../../../context/CartContext'
import { useAssist } from '../../../context/AssistContext'
import {
  UiBadge,
  UiChip,
  UiContainer,
  UiDrawer,
} from '../../ui'

const NAV_LINKS = [
  { label: 'Inicio', href: '/', testId: 'header-nav-home' },
  { label: 'Catálogo', href: '/catalog', testId: 'header-nav-catalog' },
]

const CATEGORY_LINKS = [
  'Câmaras de ar',
  'Pneus',
  'Relação',
  'Freios',
  'Transmissão',
  'Acessórios',
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

export function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { itemCount } = useCart()
  const { status, logout, user } = useAuth()
  const { completeStep } = useAssist()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchInputValue, setSearchInputValue] = useState('')

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = (searchInputValue || '').trim()
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
      label: 'Início',
      href: '/',
      icon: <NavHomeIcon size="md" tone={location.pathname === '/' ? 'accent' : 'muted'} />,
      active: location.pathname === '/',
    },
    {
      label: 'Catálogo',
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
          borderColor: { xs: 'rgba(216,211,194,0.95)', md: 'divider' },
          bgcolor: { xs: 'rgba(247,245,238,0.95)', md: 'rgba(255,255,255,0.95)' },
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <UiContainer fluid>
          <Toolbar
            disableGutters
            sx={{ minHeight: { xs: 62, md: 78 }, gap: { xs: 1, md: 2 }, pb: { xs: 1, md: 0 } }}
          >
            <IconButton
              aria-label="Abrir categorias"
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ display: { xs: 'inline-flex', md: 'none' }, color: { xs: 'text.primary', md: 'inherit' } }}
            >
              <MenuRoundedIcon size="lg" />
            </IconButton>

            <Stack
              component={RouterLink}
              to="/"
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ minWidth: 0 }}
            >
              <Box
                sx={{
                  width: { xs: 36, md: 40 },
                  height: { xs: 36, md: 40 },
                  borderRadius: '50%',
                  border: '1px solid',
                  borderColor: { xs: 'rgba(216,211,194,0.95)', md: 'divider' },
                  bgcolor: { xs: '#FFFDF7', md: 'transparent' },
                  display: 'grid',
                  placeItems: 'center',
                  color: { xs: 'primary.main', md: 'inherit' },
                  fontWeight: 700,
                  fontSize: { xs: 14, md: 16 },
                }}
              >
                R
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ lineHeight: 1, fontWeight: 700, color: { xs: 'primary.main', md: 'text.primary' } }}>
                  RODANDO
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, color: { xs: 'text.secondary', md: 'text.secondary' } }}>
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
                  borderRadius: 2.2,
                  border: '1px solid',
                  borderColor: '#D8D3C2',
                  bgcolor: '#FFFFFF',
                  color: 'text.primary',
                  font: 'inherit',
                  lineHeight: 1.4,
                  '&::placeholder': {
                    color: 'text.secondary',
                    opacity: 1,
                  },
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
                  onClick={() => {
                    if (link.href === '/catalog') {
                      completeStep('open-catalog', 'home')
                    }
                  }}
                  color={isActive(location.pathname, link.href) ? 'secondary' : 'inherit'}
                  variant={isActive(location.pathname, link.href) ? 'outlined' : 'text'}
                  sx={{
                    minHeight: 40,
                    px: 1.7,
                    fontWeight: isActive(location.pathname, link.href) ? 700 : 600,
                    '&:hover': {
                      color: 'secondary.dark',
                    },
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Stack>

            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconButton data-testid="header-cart-button" aria-label="Abrir carrinho" component={RouterLink} to="/cart">
                <UiBadge badgeContent={itemCount} color="secondary" max={99}>
                  <NavBagIcon size="md" />
                </UiBadge>
              </IconButton>
              <Button
                data-testid="header-account-button"
                component={RouterLink}
                to={accountHref}
                variant="outlined"
                startIcon={<NavAccountIcon size="sm" />}
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

          <Box sx={{ display: { xs: 'block', md: 'none' }, pb: 1.5 }}>
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
                  px: 1.6,
                  borderRadius: 2.2,
                  border: '1px solid',
                  borderColor: '#D8D3C2',
                  bgcolor: '#FFFFFF',
                  color: 'text.primary',
                  font: 'inherit',
                  lineHeight: 1.4,
                  '&::placeholder': {
                    color: 'text.secondary',
                    opacity: 1,
                  },
                  '&:focus': {
                    outline: '2px solid',
                    outlineColor: 'secondary.main',
                    borderColor: 'secondary.main',
                  },
                }}
              />
            </Box>
          </Box>
        </UiContainer>
      </AppBar>

      <UiDrawer
        anchor="left"
        open={drawerOpen}
        onClose={(_, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            setDrawerOpen(false)
          }
        }}
        headerTitle="Categorias"
        footer={<Button fullWidth variant="contained" component={RouterLink} to="/catalog">Ver catálogo</Button>}
      >
        <List sx={{ p: 0 }}>
          {mobileMenuLinks.map((link) => (
            <ListItem disablePadding key={`mobile-${link.href}`}>
              <ListItemButton
                component={RouterLink}
                to={link.href}
                selected={link.active}
                onClick={() => {
                  if (link.href === '/catalog') {
                    completeStep('open-catalog', 'home')
                  }
                  setDrawerOpen(false)
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  {link.icon}
                  <Typography variant="body2" sx={{ fontWeight: link.active ? 700 : 600 }}>
                    {link.label}
                  </Typography>
                </Stack>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {CATEGORY_LINKS.map((category) => (
            <UiChip key={category} label={category} emphasis="soft" />
          ))}
        </Stack>
      </UiDrawer>
    </>
  )
}
