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
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { api, type AuthUser } from '../lib/api'

const drawerWidth = 248

export default function OwnerLayout({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    let active = true

    api
      .me()
      .then(({ user }) => {
        if (!active) return
        if (user.role !== 'owner') {
          navigate('/', { replace: true })
          return
        }
        setUser(user)
      })
      .catch(() => {
        if (!active) return
        navigate('/auth', { replace: true })
      })
      .finally(() => {
        if (active) {
          setChecking(false)
        }
      })

    return () => {
      active = false
    }
  }, [navigate])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await api.logout()
    } finally {
      navigate('/auth', { replace: true })
    }
  }

  if (checking) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CircularProgress size={22} />
          <Typography variant="body2" color="text.secondary">Validando sessao...</Typography>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#EEF2FA' }}>
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
          <Typography variant="caption" sx={{ opacity: 0.75 }}>{user?.email}</Typography>
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

      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="sticky" color="transparent" elevation={0}>
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
        <Container sx={{ py: 6 }}>{children}</Container>
      </Box>
    </Box>
  )
}
