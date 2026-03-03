import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'

type NavItem = {
  label: string
  to: string
  icon: ReactNode
  active: (pathname: string) => boolean
  testId: string
}

function isRoute(pathname: string, target: string) {
  if (target === '/') return pathname === '/'
  return pathname === target || pathname.startsWith(`${target}/`)
}

export function MobileBottomNav() {
  const location = useLocation()
  const { status, user } = useAuth()
  const { itemCount } = useCart()

  const accountHref = status === 'authenticated'
    ? (user?.role === 'owner' ? '/owner/dashboard' : '/account/profile')
    : '/auth'

  const items: NavItem[] = [
    {
      label: 'Início',
      to: '/',
      icon: <HomeRoundedIcon sx={{ fontSize: 20 }} />,
      active: (pathname) => pathname === '/',
      testId: 'mobile-nav-home',
    },
    {
      label: 'Catálogo',
      to: '/catalog',
      icon: <StorefrontRoundedIcon sx={{ fontSize: 20 }} />,
      active: (pathname) => isRoute(pathname, '/catalog'),
      testId: 'mobile-nav-catalog',
    },
    {
      label: itemCount > 0 ? `Mochila (${itemCount})` : 'Mochila',
      to: '/cart',
      icon: <ShoppingBagOutlinedIcon sx={{ fontSize: 20 }} />,
      active: (pathname) => isRoute(pathname, '/cart'),
      testId: 'mobile-nav-cart',
    },
    {
      label: status === 'authenticated' ? 'Conta' : 'Entrar',
      to: accountHref,
      icon: <PersonOutlineRoundedIcon sx={{ fontSize: 20 }} />,
      active: (pathname) => isRoute(pathname, '/auth') || isRoute(pathname, '/owner') || isRoute(pathname, '/account') || isRoute(pathname, '/orders'),
      testId: 'mobile-nav-account',
    },
  ]

  return (
    <Box
      data-testid="mobile-bottom-nav"
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
        zIndex: (theme) => theme.zIndex.appBar + 5,
      }}
    >
      <Box
        sx={{
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: '#D8D3C2',
          backgroundColor: 'rgba(255,255,255,0.96)',
          px: 1,
          py: 1,
          boxShadow: '0 10px 24px rgba(20,34,53,0.18)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 0.5 }}>
          {items.map((item) => {
            const active = item.active(location.pathname)
            return (
              <Box
                key={item.to}
                component={RouterLink}
                to={item.to}
                data-testid={item.testId}
                aria-current={active ? 'page' : undefined}
                sx={{
                  textDecoration: 'none',
                  minHeight: 52,
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.3,
                  color: active ? '#FFFFFF' : '#34475D',
                  backgroundColor: active ? '#1C9C4B' : 'transparent',
                  border: active ? '1px solid rgba(21,122,57,0.9)' : '1px solid transparent',
                  transition: 'background-color 160ms ease, color 160ms ease, border-color 160ms ease',
                  '&:hover': {
                    backgroundColor: active ? '#1C9C4B' : 'rgba(20,34,53,0.06)',
                  },
                }}
              >
                {item.icon}
                <Typography
                  component="span"
                  sx={{
                    fontSize: 10.5,
                    lineHeight: 1,
                    letterSpacing: '0.01em',
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
}
