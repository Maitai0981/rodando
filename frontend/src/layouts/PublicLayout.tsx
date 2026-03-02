import { useEffect, useRef } from 'react'
import type { PropsWithChildren } from 'react'
import {
  AppBar,
  Badge,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  IconButton,
  Stack,
  Toolbar,
  Typography
} from '@mui/material'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import { motion, useReducedMotion } from 'motion/react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'

const officialChannels = {
  maps:
    'https://www.google.com/maps/place/Rodando+Moto+Center/@-24.9539372,-53.4823137,17z/data=!3m1!4b1!4m6!3m5!1s0x94f3d6abd0f76d39:0x4c1de863cd816ba6!8m2!3d-24.9539372!4d-53.4823137!16s%2Fg%2F1thnpyhg?entry=ttu&g_ep=EgoyMDI2MDIyMi4wIKXMDSoASAFQAw%3D%3D',
  facebook:
    'https://www.facebook.com/people/Rodando-MOTO-Center/100063563260906/?rdid=wT60RblvcFG4P0yO&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F154Nx32j9w%2F',
  instagram: 'https://www.instagram.com/rodandomoto?utm_source=qr&igsh=MWUzd3VvM21rYzk2Mg%3D%3D',
}

const primaryNavLinks = [
  { label: 'Inicio', to: '/' },
  { label: 'Categorias', to: '/catalog' },
  { label: 'Catálogo', to: '/catalog' },
]

const PUBLIC_SHELL_MAX_WIDTH = 1380
const PUBLIC_CONTENT_MAX_WIDTH = '1360px !important'

function isActiveRoute(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function PublicLayout({ children }: PropsWithChildren) {
  const { itemCount } = useCart()
  const { user, status, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const showHomeEditorialActions = isHome && status !== 'authenticated'
  const visibleNavLinks = user?.role === 'owner'
    ? [...primaryNavLinks, { label: 'Painel', to: '/owner/dashboard' }]
    : primaryNavLinks
  const reduceMotion = useReducedMotion()
  const jellyRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const layer = jellyRef.current
    if (!layer) return

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) return

    let rafId = 0
    let running = true
    let lastY = window.scrollY
    let velocity = 0
    let smoothed = 0

    const onScroll = () => {
      const nextY = window.scrollY
      const delta = nextY - lastY
      lastY = nextY
      velocity = Math.max(-40, Math.min(40, delta))
    }

    const tick = () => {
      if (!running) return

      smoothed += (velocity - smoothed) * 0.12
      velocity *= 0.82

      const intensity = Math.max(-1, Math.min(1, smoothed / 28))
      const stretch = Math.abs(intensity)

      layer.style.setProperty('--jelly-translate-y', `${(-intensity * 2.8).toFixed(3)}px`)
      layer.style.setProperty('--jelly-scale-x', (1 + stretch * 0.006).toFixed(4))
      layer.style.setProperty('--jelly-scale-y', (1 - stretch * 0.004).toFixed(4))

      rafId = window.requestAnimationFrame(tick)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    rafId = window.requestAnimationFrame(tick)

    return () => {
      running = false
      window.removeEventListener('scroll', onScroll)
      window.cancelAnimationFrame(rafId)
      layer.style.removeProperty('--jelly-translate-y')
      layer.style.removeProperty('--jelly-scale-x')
      layer.style.removeProperty('--jelly-scale-y')
    }
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <Box sx={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      <Box
        className={`brazil-bg-stripes site-top-stripes${isHome ? ' site-top-stripes--home' : ''}`}
        aria-hidden
      >
        <Box className="bg-stripe bg-stripe-green" />
        <Box className="bg-stripe bg-stripe-yellow" />
        <Box className="bg-stripe bg-stripe-blue" />
      </Box>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: -10 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          className="glass-nav"
          sx={{
            top: 0,
            left: 0,
            right: 0,
            width: '100%',
            borderRadius: 0,
            border: 'none',
            overflow: 'hidden',
            zIndex: (theme) => theme.zIndex.appBar,
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0) 100%)',
            },
          }}
        >
          <Toolbar
            sx={{
              gap: { xs: 0.7, md: 1.35, lg: 1.6 },
              minHeight: { xs: 52, md: 56 },
              px: { xs: 0.8, sm: 1.35, md: 2, lg: 2.4 },
              width: '100%',
              maxWidth: { lg: PUBLIC_SHELL_MAX_WIDTH },
              mx: 'auto',
            }}
          >
            <Stack
              direction="row"
              spacing={{ xs: 1.1, md: 1.35 }}
              alignItems="center"
              component={RouterLink}
              to="/"
              sx={{ color: 'inherit', minWidth: 0 }}
            >
              <Box
                sx={{
                  width: { xs: 40, md: 46 },
                  height: { xs: 40, md: 46 },
                  borderRadius: '50%',
                  border: '1px solid rgba(17,17,17,0.14)',
                  display: 'grid',
                  placeItems: 'center',
                  position: 'relative',
                  bgcolor: 'rgba(255,255,255,0.95)'
                }}
              >
                <Box sx={{ width: { xs: 12, md: 14 }, height: { xs: 12, md: 14 }, borderRadius: '50%', bgcolor: 'secondary.main' }} />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: { xs: 4, md: 5 },
                    borderRadius: '50%',
                    border: '1px dashed rgba(17,17,17,0.18)'
                  }}
                />
              </Box>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                  fontSize: { xs: 13, sm: 14, md: 16 },
                }}
              >
                RODANDO
                {/* <Box component="span" sx={{ color: 'primary.main' }}>
                .BR
              </Box> */}
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{
                mx: 'auto',
                display: { xs: 'none', md: 'flex' },
                p: 0.3,
                borderRadius: 999,
                bgcolor: 'rgba(255,255,255,0.62)',
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              {visibleNavLinks.map((link) => {
                const active = isActiveRoute(location.pathname, link.to)
                return (
                  <Button
                    key={link.to}
                    component={RouterLink}
                    to={link.to}
                    color="primary"
                    aria-current={active ? 'page' : undefined}
                    sx={{
                      px: 1.7,
                      minHeight: 44,
                      minWidth: 0,
                      borderRadius: 999,
                      textTransform: 'none',
                      fontWeight: active ? 700 : 600,
                      fontSize: 13,
                      color: active ? 'info.main' : 'primary.main',
                      bgcolor: active ? 'rgba(255,255,255,0.92)' : 'transparent',
                      border: active ? '1px solid rgba(0,0,0,0.08)' : '1px solid transparent',
                      boxShadow: active ? '0 6px 16px rgba(0,0,0,0.06)' : 'none',
                      '&:hover': {
                        bgcolor: active ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.45)',
                      },
                    }}
                  >
                    {link.label}
                  </Button>
                )
              })}
              {user?.role === 'owner' ? (
                <Button
                  component={RouterLink}
                  to="/owner/products/new"
                  color="primary"
                  sx={{
                    px: 1.5,
                    minHeight: 44,
                    minWidth: 0,
                    borderRadius: 999,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    border: '1px dashed rgba(17,17,17,0.18)',
                    bgcolor: 'rgba(255,255,255,0.5)',
                  }}
                >
                  Adicionar produto
                </Button>
              ) : null}
            </Stack>

            <Stack direction="row" spacing={{ xs: 0.6, sm: 0.9, md: 1.1 }} alignItems="center" sx={{ ml: { xs: 'auto', md: 0 }, minWidth: 0 }}>
              {status !== 'authenticated' && !showHomeEditorialActions ? (
                <>
                  <Button
                    component={RouterLink}
                    to="/auth"
                    variant="text"
                    color="primary"
                    sx={{ display: { xs: 'none', sm: 'inline-flex' }, minHeight: 42, px: 1.4, fontSize: 13, fontWeight: 700 }}
                  >
                    Entrar
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/auth/signup"
                    variant="outlined"
                    color="primary"
                    sx={{ display: { xs: 'none', md: 'inline-flex' }, minHeight: 42, px: 1.7, fontSize: 13, fontWeight: 700 }}
                  >
                    Criar conta
                  </Button>
                </>
              ) : user?.role === 'owner' ? (
                <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
                  <Button component={RouterLink} to="/owner/products/new" variant="text" color="primary">
                    Adicionar
                  </Button>
                  <Button component={RouterLink} to="/owner/dashboard" variant="outlined" color="primary">
                    Painel
                  </Button>
                </Stack>
              ) : null}
              {status === 'authenticated' ? (
                <Button
                  variant="text"
                  color="primary"
                  onClick={() => void handleLogout()}
                  sx={{ display: { xs: 'none', sm: 'inline-flex' }, minHeight: 42, px: 1.3, fontSize: 13, fontWeight: 700 }}
                >
                  Sair
                </Button>
              ) : null}
              {showHomeEditorialActions ? (
                <>
                  <Button
                    variant="outlined"
                    color="inherit"
                    sx={{
                      display: { xs: 'none', md: 'inline-flex' },
                      px: 2.1,
                      minHeight: 50,
                      borderRadius: 999,
                      textTransform: 'none',
                      fontSize: 13,
                      fontWeight: 700,
                      borderColor: 'rgba(17,17,17,0.18)',
                      color: '#111111',
                      bgcolor: 'rgba(255,255,255,0.58)',
                    }}
                  >
                    pt-br
                  </Button>
                  <Button
                    component="a"
                    href="#home-contact"
                    variant="outlined"
                    color="inherit"
                    sx={{
                      display: { xs: 'none', md: 'inline-flex' },
                      px: { md: 2.2, lg: 2.6 },
                      minHeight: 50,
                      borderRadius: 999,
                      textTransform: 'none',
                      fontSize: 13,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      borderColor: 'rgba(17,17,17,0.18)',
                      color: '#111111',
                      bgcolor: 'rgba(255,255,255,0.58)',
                    }}
                  >
                    Seja parceiro
                  </Button>
                </>
              ) : null}
              <Button
                component={RouterLink}
                to="/catalog"
                variant="contained"
                color="primary"
                sx={{
                  display: showHomeEditorialActions ? { xs: 'inline-flex', md: 'none' } : undefined,
                  px: { xs: 1.4, sm: 1.8, md: 2.1 },
                  minWidth: 0,
                  minHeight: { xs: 42, sm: 48 },
                  borderRadius: 999,
                  bgcolor: 'rgba(255, 240, 178, 0.96)',
                  color: '#111111',
                  boxShadow: '0 8px 20px rgba(255,234,0,0.14)',
                  border: '1px solid rgba(17,17,17,0.06)',
                  fontSize: { xs: 12, sm: 13 },
                  fontWeight: 700,
                  '&:hover': {
                    bgcolor: 'rgba(255, 240, 178, 1)',
                    boxShadow: '0 10px 22px rgba(255,234,0,0.18)',
                  },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Ver catálogo
                </Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                  Loja
                </Box>
              </Button>
              {showHomeEditorialActions ? (
                <Button
                  component={RouterLink}
                  to="/catalog"
                  variant="contained"
                  color="primary"
                  sx={{
                    display: { xs: 'none', md: 'inline-flex' },
                    px: { md: 2.6, lg: 3.1 },
                    minHeight: 50,
                    borderRadius: 999,
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    fontSize: 13,
                    fontWeight: 700,
                    bgcolor: 'rgba(255, 240, 178, 0.96)',
                    color: '#111111',
                    boxShadow: '0 8px 20px rgba(255,234,0,0.14)',
                    border: '1px solid rgba(17,17,17,0.06)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 240, 178, 1)',
                      boxShadow: '0 10px 22px rgba(255,234,0,0.18)',
                    },
                  }}
                >
                  Ver catálogo
                </Button>
              ) : null}
              <IconButton
                component={RouterLink}
                to="/cart"
                sx={{
                  display: showHomeEditorialActions ? { xs: 'inline-flex', md: 'none' } : undefined,
                  color: 'info.main',
                  bgcolor: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(17,17,17,0.08)',
                  width: { xs: 42, sm: 46 },
                  height: { xs: 42, sm: 46 },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.98)' }
                }}
              >
                <Badge badgeContent={itemCount} color="secondary" overlap="circular" max={99}>
                  <ShoppingBagOutlinedIcon sx={{ fontSize: 22 }} />
                </Badge>
              </IconButton>
            </Stack>
          </Toolbar>
          <Box sx={{ px: { xs: 1, sm: 1.35 }, pb: 0.7, display: { xs: 'block', md: 'none' }, width: '100%', maxWidth: { lg: PUBLIC_SHELL_MAX_WIDTH }, mx: 'auto' }}>
            <Stack
              direction="row"
              spacing={0.85}
              sx={{
                overflowX: 'auto',
                pb: 0.35,
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
              }}
            >
              {visibleNavLinks.map((link) => {
                const active = isActiveRoute(location.pathname, link.to)
                return (
                  <Chip
                    key={`mobile-${link.to}`}
                    component={RouterLink}
                    to={link.to}
                    clickable
                    label={link.label}
                    variant={active ? 'filled' : 'outlined'}
                    color={active ? 'primary' : 'default'}
                    sx={{
                      height: 36,
                      borderRadius: 999,
                      fontWeight: active ? 700 : 600,
                      fontSize: 12,
                      bgcolor: active ? undefined : 'rgba(255,255,255,0.72)',
                      borderColor: active ? undefined : 'rgba(0,0,0,0.09)',
                      '& .MuiChip-label': { px: 1.3 },
                    }}
                  />
                )
              })}
            </Stack>
          </Box>
        </AppBar>
      </motion.div>

      <Box ref={jellyRef} className="jelly-scroll-layer">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        >
          <Box sx={{ pt: { xs: 0.05, md: 0.15 } }}>
            <Container
              maxWidth="xl"
              sx={{
                py: { xs: 1, md: 1.5 },
                px: { xs: 1.2, sm: 2, md: 2.8, lg: 3.2 },
                maxWidth: PUBLIC_CONTENT_MAX_WIDTH,
                position: 'relative',
              }}
            >
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  inset: { xs: '8px 8px auto', md: '10px 10px auto' },
                  height: 140,
                  borderRadius: 3,
                  background:
                    'radial-gradient(circle at 18% 30%, rgba(44,209,100,0.06), transparent 52%), radial-gradient(circle at 84% 22%, rgba(17,17,17,0.06), transparent 56%), linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0))',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              />
              <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
            </Container>
          </Box>
        </motion.div>

        <Box
          aria-hidden
          sx={{
            mt: { xs: 2.5, md: 3.2 },
            mb: 0,
            mx: { xs: -1.5, sm: -2.5, md: -3 },
            height: 1,
            bgcolor: 'rgba(17,17,17,0.08)',
          }}
        />

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView="visible"
          viewport={{ once: true, amount: 0.08 }}
          variants={{
            hidden: { opacity: 0, y: 18 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
          }}
        >
          <Box
            component="footer"
            sx={{
              mt: 0,
              borderTop: '1px solid rgba(17,17,17,0.07)',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(245,250,247,0.92) 34%, rgba(242,247,244,0.98) 100%)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background:
                  'radial-gradient(circle at 8% 15%, rgba(44,209,100,0.06), transparent 42%), radial-gradient(circle at 92% 12%, rgba(17,17,17,0.06), transparent 44%)',
              },
            }}
          >
            <Container
              maxWidth="xl"
              sx={{
                py: { xs: 4.5, md: 6 },
                px: { xs: 1.6, sm: 2.8, md: 3.4 },
                maxWidth: PUBLIC_CONTENT_MAX_WIDTH,
              }}
            >
              <Stack direction={{ xs: 'column', lg: 'row' }} spacing={4} sx={{ mb: 3 }}>
                <Box
                  sx={{
                    flex: 1,
                    p: { xs: 2, md: 2.4 },
                    borderRadius: 3,
                    border: '1px solid rgba(0,0,0,0.07)',
                    bgcolor: 'rgba(255,255,255,0.72)',
                    boxShadow: '0 12px 28px rgba(0,0,0,0.04)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                  }}
                >
                  <Typography variant="caption" color="primary" sx={{ mb: 1.25, letterSpacing: '0.12em', display: 'block' }}>
                    RODANDO
                  </Typography>
                  <Typography variant="h4" sx={{ maxWidth: 700, letterSpacing: '-0.03em' }}>
                    Catálogo claro. Compra rápida. Marca mais profissional.
                  </Typography>
                </Box>
                <Stack sx={{ minWidth: { lg: 220 } }} justifyContent="flex-end">
                  <Button
                    component={RouterLink}
                    to="/catalog"
                    variant="contained"
                    color="primary"
                    size="large"
                    sx={{
                      boxShadow: '0 10px 22px rgba(44,209,100,0.18)',
                      minHeight: 48,
                    }}
                  >
                    Ver catálogo
                  </Button>
                </Stack>
              </Stack>

              <Divider sx={{ borderColor: 'rgba(17,17,17,0.08)' }} />

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ py: 3.5 }}>
                <Box
                  sx={{
                    flex: 1,
                    p: { xs: 1.6, md: 1.8 },
                    borderRadius: 2.5,
                    border: '1px solid rgba(0,0,0,0.06)',
                    bgcolor: 'rgba(255,255,255,0.62)',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
                    RODANDO
                    <Box component="span" sx={{ color: 'primary.main' }}>
                      .BR
                    </Box>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.75, maxWidth: 380 }}>
                    Especialistas em câmaras de ar e componentes. Clareza, velocidade e confiança.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.2} sx={{ flexWrap: 'wrap' }}>
                  <Stack
                    spacing={1}
                    sx={{
                      p: 1.4,
                      borderRadius: 2.2,
                      border: '1px solid rgba(0,0,0,0.05)',
                      bgcolor: 'rgba(255,255,255,0.55)',
                      minWidth: { sm: 160 },
                    }}
                  >
                    <Typography variant="overline" sx={{ color: 'primary.main' }}>
                      Navegacao
                    </Typography>
                    <Typography component={RouterLink} to="/" variant="body2" className="link-underline">
                      Página inicial
                    </Typography>
                    <Typography component={RouterLink} to="/catalog" variant="body2" className="link-underline">
                      Categorias e produtos
                    </Typography>
                    <Typography component={RouterLink} to="/catalog" variant="body2" className="link-underline">
                      Loja virtual
                    </Typography>
                  </Stack>
                  <Stack
                    spacing={1}
                    sx={{
                      p: 1.4,
                      borderRadius: 2.2,
                      border: '1px solid rgba(0,0,0,0.05)',
                      bgcolor: 'rgba(255,255,255,0.5)',
                      minWidth: { sm: 160 },
                    }}
                  >
                    <Typography variant="overline" sx={{ color: 'primary.main' }}>
                      Suporte
                    </Typography>
                    <Typography variant="body2">Comercial B2B</Typography>
                    <Typography variant="body2">Atendimento</Typography>
                    <Typography variant="body2">Políticas</Typography>
                  </Stack>
                  <Stack
                    spacing={1}
                    sx={{
                      p: 1.4,
                      borderRadius: 2.2,
                      border: '1px solid rgba(0,0,0,0.05)',
                      bgcolor: 'rgba(255,255,255,0.5)',
                      minWidth: { sm: 170 },
                    }}
                  >
                    <Typography variant="overline" sx={{ color: 'primary.main' }}>
                      Canais oficiais
                    </Typography>
                    <Typography component="a" href={officialChannels.maps} target="_blank" rel="noreferrer" variant="body2" className="link-underline">
                      Google Maps
                    </Typography>
                    <Typography component="a" href={officialChannels.instagram} target="_blank" rel="noreferrer" variant="body2" className="link-underline">
                      Instagram
                    </Typography>
                    <Typography component="a" href={officialChannels.facebook} target="_blank" rel="noreferrer" variant="body2" className="link-underline">
                      Facebook
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>

              <Divider sx={{ borderColor: 'rgba(17,17,17,0.08)' }} />
              <Typography
                variant="caption"
                sx={{ display: 'block', pt: 2.25, color: 'text.secondary', letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                © 2026 Rodando.com.br - Peças Automotivas - CNPJ 10.174.972/0001-56
              </Typography>
            </Container>
          </Box>
        </motion.div>
      </Box>
    </Box>
  )
}

