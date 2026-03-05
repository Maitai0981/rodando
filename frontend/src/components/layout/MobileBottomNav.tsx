import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { NavAccountIcon, NavBagIcon, NavCatalogIcon, NavHomeIcon } from '@/ui/primitives/Icon'
import { prefetchRouteChunk } from '../../routes/prefetch'

type NavItem = {
  label: string
  to: string
  renderIcon: (active: boolean) => ReactNode
  active: (pathname: string) => boolean
  testId: string
}

function isRoute(pathname: string, target: string) {
  if (target === '/') return pathname === '/'
  return pathname === target || pathname.startsWith(`${target}/`)
}

type FloatingAccessBarMobileProps = {
  visible?: boolean
}

export function FloatingAccessBarMobile({ visible = true }: FloatingAccessBarMobileProps) {
  const theme = useTheme()
  const location = useLocation()
  const { status, user } = useAuth()
  const { itemCount } = useCart()

  function handlePrefetch(pathname: string) {
    prefetchRouteChunk(pathname)
  }

  if (!visible) {
    return null
  }

  const accountHref = status === 'authenticated'
    ? (user?.role === 'owner' ? '/owner/dashboard' : '/account/profile')
    : '/auth'

  const items: NavItem[] = [
    {
      label: 'Início',
      to: '/',
      renderIcon: (active) => <NavHomeIcon size="md" tone={active ? 'inverse' : 'muted'} />,
      active: (pathname) => pathname === '/',
      testId: 'mobile-nav-home',
    },
    {
      label: 'Catálogo',
      to: '/catalog',
      renderIcon: (active) => <NavCatalogIcon size="md" tone={active ? 'inverse' : 'muted'} />,
      active: (pathname) => isRoute(pathname, '/catalog') || isRoute(pathname, '/produto'),
      testId: 'mobile-nav-catalog',
    },
    {
      label: itemCount > 0 ? `Mochila (${itemCount})` : 'Mochila',
      to: '/cart',
      renderIcon: (active) => <NavBagIcon size="md" tone={active ? 'inverse' : 'muted'} />,
      active: (pathname) => isRoute(pathname, '/cart') || isRoute(pathname, '/checkout'),
      testId: 'mobile-nav-cart',
    },
    {
      label: status === 'authenticated' ? 'Conta' : 'Entrar',
      to: accountHref,
      renderIcon: (active) => <NavAccountIcon size="md" tone={active ? 'inverse' : 'muted'} />,
      active: (pathname) => isRoute(pathname, '/auth') || isRoute(pathname, '/owner') || isRoute(pathname, '/account') || isRoute(pathname, '/orders'),
      testId: 'mobile-nav-account',
    },
  ]

  const navContent = (
    <Box
      data-testid="mobile-bottom-nav"
      sx={{
        display: 'block',
        position: 'fixed',
        left: { xs: 10, sm: 12 },
        right: { xs: 10, sm: 12 },
        bottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        zIndex: theme.zIndex.modal - 5,
      }}
    >
      <Box
        sx={{
          maxWidth: 'var(--ds-content-max-width)',
          mx: 'auto',
          borderRadius: 3,
          border: '1px solid',
          borderColor: '#D8D3C2',
          backgroundColor: 'rgba(255,255,255,0.98)',
          px: 1,
          py: 0.95,
          boxShadow: '0 12px 28px rgba(20,34,53,0.2)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 0.5 }}>
          {items.map((item) => {
            const active = item.active(location.pathname)
            return (
              <Box
                key={item.to}
                component={RouterLink}
                className="ds-pressable"
                to={item.to}
                data-testid={item.testId}
                aria-current={active ? 'page' : undefined}
                onMouseEnter={() => handlePrefetch(item.to)}
                onFocus={() => handlePrefetch(item.to)}
                onTouchStart={() => handlePrefetch(item.to)}
                sx={{
                  textDecoration: 'none',
                  minHeight: 54,
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.35,
                  color: active ? '#FFFFFF' : '#34475D',
                  backgroundColor: active ? '#1C9C4B' : 'transparent',
                  border: active ? '1px solid rgba(21,122,57,0.9)' : '1px solid transparent',
                  transition: 'background-color 160ms ease, color 160ms ease, border-color 160ms ease',
                  '&:hover': {
                    backgroundColor: active ? '#1C9C4B' : 'rgba(20,34,53,0.06)',
                  },
                  '&:active': {
                    transform: 'scale(0.98)',
                  },
                }}
              >
                {item.renderIcon(active)}
                <Typography
                  component="span"
                  sx={{
                    fontSize: { xs: 11, sm: 11.5 },
                    lineHeight: 1.05,
                    letterSpacing: '-0.005em',
                    fontWeight: active ? 700 : 600,
                    color: 'inherit',
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            )
          })}
        </Box>
      </Box>
    </Box>
  )

  if (typeof document === 'undefined') {
    return navContent
  }

  return createPortal(navContent, document.body)
}

export const MobileBottomNav = FloatingAccessBarMobile
