import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'
import { LayoutGroup } from 'framer-motion'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../shared/context/AuthContext'
import { useCart } from '../../shared/context/CartContext'
import { NavTransition } from '@/shared/ui/primitives/NavTransition'
import { NavAccountIcon, NavBagIcon, NavCatalogIcon, NavHomeIcon } from '@/shared/ui/primitives/Icon'
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
          border: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(10,10,15,0.95)',
          px: 1,
          py: 0.95,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <LayoutGroup id="mobile-route-nav">
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 0.5 }}>
            {items.map((item) => {
              const active = item.active(location.pathname)
              return (
                <NavTransition
                  key={item.to}
                  to={item.to}
                  testId={item.testId}
                  label={item.label}
                  icon={item.renderIcon(active)}
                  orientation="vertical"
                  active={active}
                  layoutId="mobile-nav-active-pill"
                  onIntent={handlePrefetch}
                  sx={{
                    border: 'none',
                    backgroundColor: active ? '#d4a843' : 'transparent',
                    '&:hover': {
                      backgroundColor: active ? '#d4a843' : 'rgba(212,168,67,0.08)',
                    },
                  }}
                  contentSx={{
                    color: active ? '#000000' : '#6b7280',
                  }}
                  indicatorSx={{
                    background: 'linear-gradient(165deg, rgba(212,168,67,0.98) 0%, rgba(240,192,64,0.98) 100%)',
                    border: 'none',
                  }}
                />
              )
            })}
          </Box>
        </LayoutGroup>
      </Box>
    </Box>
  )

  if (typeof document === 'undefined') {
    return navContent
  }

  return createPortal(navContent, document.body)
}

export const MobileBottomNav = FloatingAccessBarMobile
