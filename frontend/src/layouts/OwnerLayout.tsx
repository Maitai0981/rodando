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
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography
} from '@mui/material'
import { motion, useReducedMotion } from 'motion/react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import BrandTireStrip from '../components/common/BrandTireStrip'
import { useAuth } from '../context/AuthContext'

const drawerWidth = 248

export default function OwnerLayout({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const { user, status, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const reduceMotion = useReducedMotion()

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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#EEF2FA' }}>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: -14 }}
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
              background: '#002776',
              color: '#fff',
              borderRight: '0'
            }
          }}
        >
          <Toolbar sx={{ py: 2, alignItems: 'flex-start', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Rodando Owner</Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>{user.email}</Typography>
          </Toolbar>
          <Divider sx={{ bgcolor: 'rgba(255,255,255,0.15)' }} />
          <List>
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to="/owner/dashboard" sx={{ color: '#fff' }}>
                <ListItemText primary="Dashboard" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to="/owner/products" sx={{ color: '#fff' }}>
                <ListItemText primary="Produtos" />
              </ListItemButton>
            </ListItem>
          </List>
        </Drawer>
      </motion.div>

      <Box sx={{ flexGrow: 1 }}>
        <AppBar component={motion.div} position="sticky" color="transparent" elevation={0}
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Area administrativa</Typography>
              <Typography variant="h6">Controle e governanca</Typography>
            </Box>
            <Button variant="outlined" color="primary" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? 'Saindo...' : 'Logout'}
            </Button>
          </Toolbar>
        </AppBar>
        <BrandTireStrip compact mb={{ xs: 1, md: 1.25 }} />
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
