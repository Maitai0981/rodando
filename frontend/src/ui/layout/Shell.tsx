import Box from '@mui/material/Box'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'
import { MobileBottomNav } from '../../components/layout/MobileBottomNav'
import { shouldShowMobileBottomNav } from '../../layouts/mobileNavVisibility'
import { Container } from './Container'
import { StoreFooter } from './StoreFooter'
import { StoreHeader } from './StoreHeader'

export function Shell({
  children,
  contained = true,
  contentPaddingTop = { xs: 14.5, md: 12 },
  contentPaddingBottom = { xs: 11.5, md: 7 },
}: PropsWithChildren<{
  contained?: boolean
  contentPaddingTop?: object
  contentPaddingBottom?: object
}>) {
  const location = useLocation()
  const isMobileViewport = useMediaQuery('(max-width:1024px)')
  const showMobileNav = isMobileViewport && shouldShowMobileBottomNav(location.pathname)

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <StoreHeader />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          maxWidth: 'var(--ds-content-max-width)',
          mx: 'auto',
          px: { xs: 1.5, sm: 2, md: 3 },
          pt: contentPaddingTop,
          pb: contentPaddingBottom,
        }}
      >
        {contained ? <Container>{children}</Container> : children}
      </Box>
      {showMobileNav ? (
        <Box
          aria-hidden
          sx={{
            display: 'block',
            height: {
              xs: 'calc(84px + env(safe-area-inset-bottom, 0px))',
              sm: 'calc(88px + env(safe-area-inset-bottom, 0px))',
              md: 'calc(92px + env(safe-area-inset-bottom, 0px))',
            },
          }}
        />
      ) : null}
      <MobileBottomNav />
      <StoreFooter />
    </Box>
  )
}
