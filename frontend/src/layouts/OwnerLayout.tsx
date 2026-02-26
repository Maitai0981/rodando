import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography
} from '@mui/material'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import { motion, useReducedMotion } from 'motion/react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const drawerWidth = 268

export default function OwnerLayout({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, status, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'anonymous') {
      navigate('/auth', { replace: true })
      return
    }
    if (user && user.role !== 'owner') {
      navigate('/', { replace: true })
    }
  }, [navigate, status, user])

  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [location.pathname])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      navigate('/auth', { replace: true })
      setLoggingOut(false)
    }
  }

  if (status === 'loading') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CircularProgress size={22} />
          <Typography variant="body2" color="text.secondary">Validando sessao...</Typography>
        </Box>
      </Box>
    )
  }

  if (!user || user.role !== 'owner') {
    return null
  }

  const ownerLinks = [
    { to: '/owner/dashboard', label: 'Dashboard' },
    { to: '/owner/products', label: 'Produtos' },
  ]

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        sx={{
          minHeight: 'auto',
          px: 2.25,
          py: 2.25,
          alignItems: 'flex-start',
          flexDirection: 'column',
          gap: 0.8,
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 20, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          Rodando Owner
        </Typography>
        <Typography
          sx={{
            opacity: 0.78,
            maxWidth: '100%',
            wordBreak: 'break-word',
            fontSize: 12,
            lineHeight: 1.35,
            letterSpacing: '0.02em',
          }}
        >
          {user.email}
        </Typography>
      </Toolbar>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.12)', mx: 1.5 }} />

      <Box sx={{ px: 1.1, pt: 1.15, pb: 0.6 }}>
        <Typography
          sx={{
            px: 1.15,
            color: 'rgba(255,255,255,0.56)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Navegacao
        </Typography>
      </Box>

      <List sx={{ px: 1.1, py: 0.2, display: 'grid', gap: 0.45 }}>
        {ownerLinks.map((link) => {
          const active = location.pathname === link.to || location.pathname.startsWith(`${link.to}/`)

          return (
            <ListItem disablePadding key={link.to}>
              <ListItemButton
                component={RouterLink}
                to={link.to}
                selected={active}
                onClick={() => setMobileDrawerOpen(false)}
                sx={{
                  minHeight: 44,
                  px: 1.2,
                  borderRadius: 2,
                  color: '#fff',
                  border: '1px solid transparent',
                  bgcolor: active ? 'rgba(255,255,255,0.09)' : 'transparent',
                  borderColor: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  '& .MuiListItemText-primary': {
                    fontSize: 14,
                    fontWeight: active ? 700 : 600,
                    letterSpacing: '-0.01em',
                  },
                  '&:hover': {
                    bgcolor: active ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.05)',
                  },
                  '&.Mui-selected': {
                    bgcolor: 'rgba(255,255,255,0.09)',
                  },
                  '&.Mui-selected:hover': {
                    bgcolor: 'rgba(255,255,255,0.12)',
                  },
                }}
              >
                <ListItemText primary={link.label} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      <Box sx={{ mt: 'auto', p: 1.6 }}>
        <Box
          sx={{
            p: 1.4,
            borderRadius: 2.2,
            border: '1px solid rgba(255,255,255,0.08)',
            bgcolor: 'rgba(255,255,255,0.03)',
          }}
        >
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.58)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Painel
          </Typography>
          <Typography sx={{ mt: 0.4, fontSize: 13, lineHeight: 1.35, color: 'rgba(255,255,255,0.86)' }}>
            Gerencie produtos e acompanhe a operacao da loja.
          </Typography>
        </Box>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#F7F8F4', overflowX: 'clip' }}>
      {isDesktop ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: -28 }}
          animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <Drawer
            variant="permanent"
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              [`& .MuiDrawer-paper`]: {
                width: drawerWidth,
                boxSizing: 'border-box',
                background: 'linear-gradient(180deg, #121212 0%, #0a0a0a 100%)',
                color: '#fff',
                borderRight: '0',
                boxShadow: '8px 0 24px rgba(0,0,0,0.18)',
              }
            }}
          >
            {drawerContent}
          </Drawer>
        </motion.div>
      ) : (
        <Drawer
          variant="temporary"
          anchor="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            [`& .MuiDrawer-paper`]: {
              width: 'min(84vw, 300px)',
              boxSizing: 'border-box',
              background: 'linear-gradient(180deg, #121212 0%, #0a0a0a 100%)',
              color: '#fff',
              borderRight: '0',
              boxShadow: '12px 0 34px rgba(0,0,0,0.28)',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1 }}>
        <AppBar component={motion.div} position="sticky" color="transparent" elevation={0}
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', gap: 2, minHeight: 60 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1 }}>
              {!isDesktop && (
                <IconButton
                  edge="start"
                  aria-label="Abrir menu lateral"
                  onClick={() => setMobileDrawerOpen(true)}
                  sx={{
                    border: '1px solid rgba(17,17,17,0.12)',
                    bgcolor: 'rgba(255,255,255,0.7)',
                    width: 40,
                    height: 40,
                  }}
                >
                  <MenuRoundedIcon sx={{ fontSize: 22 }} />
                </IconButton>
              )}
              <Box>
                <Typography color="text.secondary" sx={{ fontSize: 12, lineHeight: 1.15 }}>
                  Area administrativa
                </Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.02em' }}>
                  Controle e governanca
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleLogout}
              disabled={loggingOut}
              sx={{ minHeight: 38, px: 1.4, fontSize: 13, fontWeight: 700 }}
            >
              {loggingOut ? 'Saindo...' : 'Logout'}
            </Button>
          </Toolbar>
        </AppBar>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        >
          <Container sx={{ py: 5.5 }}>{children}</Container>
        </motion.div>
      </Box>
    </Box>
  )
}
