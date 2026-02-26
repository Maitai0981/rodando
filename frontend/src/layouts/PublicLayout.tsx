import { useEffect, useRef } from 'react'
import type { PropsWithChildren } from 'react'
import {
  AppBar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  Stack,
  Toolbar,
  Typography
} from '@mui/material'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import BrandTireStrip from '../components/common/BrandTireStrip'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'

const officialChannels = {
  maps:
    'https://www.google.com/maps/place/Rodando+Moto+Center/@-24.9539372,-53.4823137,17z/data=!3m1!4b1!4m6!3m5!1s0x94f3d6abd0f76d39:0x4c1de863cd816ba6!8m2!3d-24.9539372!4d-53.4823137!16s%2Fg%2F1thnpyhg?entry=ttu&g_ep=EgoyMDI2MDIyMi4wIKXMDSoASAFQAw%3D%3D',
  facebook:
    'https://www.facebook.com/people/Rodando-MOTO-Center/100063563260906/?rdid=wT60RblvcFG4P0yO&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F154Nx32j9w%2F',
  instagram: 'https://www.instagram.com/rodandomoto?utm_source=qr&igsh=MWUzd3VvM21rYzk2Mg%3D%3D',
}

export default function PublicLayout({ children }: PropsWithChildren) {
  const { itemCount } = useCart()
  const { user, status, logout } = useAuth()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const progressScaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 28,
    mass: 0.25,
  })
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
    <Box sx={{ minHeight: '100vh' }}>
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
          }}
        >
          <Toolbar sx={{ gap: 1.5, minHeight: { xs: 54, md: 60 }, px: { xs: 1, md: 1.5 } }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            component={RouterLink}
            to="/"
            sx={{ color: 'inherit', minWidth: 0 }}
          >
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: '1px solid rgba(0,39,118,0.14)',
                display: 'grid',
                placeItems: 'center',
                position: 'relative',
                bgcolor: 'rgba(255,255,255,0.95)'
              }}
            >
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'secondary.main' }} />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 3,
                  borderRadius: '50%',
                  border: '1px dashed rgba(0,39,118,0.18)'
                }}
              />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
              RODANDO
              <Box component="span" sx={{ color: 'primary.main' }}>
                .BR
              </Box>
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{
              mx: 'auto',
              display: { xs: 'none', md: 'flex' },
              p: 0.25,
              borderRadius: 999,
            }}
          >
            <Button component={RouterLink} to="/" color="primary" sx={{ px: 1.1, minWidth: 0 }}>
              Inicio
            </Button>
            <Button component={RouterLink} to="/technical" color="primary" sx={{ px: 1.1, minWidth: 0 }}>
              Medidas
            </Button>
            <Button component={RouterLink} to="/catalog" color="primary" sx={{ px: 1.1, minWidth: 0 }}>
              Catalogo
            </Button>
            {user?.role === 'owner' ? (
              <Button component={RouterLink} to="/owner/products/new" color="primary" sx={{ px: 1.1, minWidth: 0 }}>
                Adicionar produto
              </Button>
            ) : null}
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: { xs: 'auto', md: 0 } }}>
            {status !== 'authenticated' ? (
              <>
                <Button
                  component={RouterLink}
                  to="/auth"
                  variant="text"
                  color="primary"
                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  Entrar
                </Button>
                <Button
                  component={RouterLink}
                  to="/auth/signup"
                  variant="outlined"
                  color="primary"
                  sx={{ display: { xs: 'none', md: 'inline-flex' } }}
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
                sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
              >
                Sair
              </Button>
            ) : null}
            <Button component={RouterLink} to="/catalog" variant="contained" color="primary" sx={{ px: 1.6 }}>
              Ver loja
            </Button>
            <IconButton
              component={RouterLink}
              to="/cart"
              sx={{
                color: 'info.main',
                bgcolor: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(0,39,118,0.08)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.98)' }
              }}
            >
              <Badge badgeContent={itemCount} color="secondary" overlap="circular" max={99}>
                <ShoppingBagOutlinedIcon />
              </Badge>
            </IconButton>
          </Stack>
          </Toolbar>
          <Box sx={{ px: 1, pb: 0.55 }}>
            <motion.div
              aria-hidden
              style={{ scaleX: reduceMotion ? scrollYProgress : progressScaleX }}
              transition={{ type: 'spring' }}
              className="nav-progress-bar"
            />
          </Box>
        </AppBar>
      </motion.div>

      <Box ref={jellyRef} className="jelly-scroll-layer">
        <BrandTireStrip compact bleed mb={{ xs: 0.5, md: 0.75 }} />

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        >
          <Box sx={{ pt: { xs: 0.15, md: 0.3 } }}>
            <Container sx={{ py: { xs: 1.5, md: 2.25 }, px: { xs: 1.25, sm: 2, md: 2.5 } }}>{children}</Container>
          </Box>
        </motion.div>

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
              mt: 7,
              borderTop: '1px solid rgba(0,39,118,0.07)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(245,250,247,0.92) 100%)'
            }}
          >
          <Container sx={{ py: { xs: 4.5, md: 6 }, px: { xs: 1.5, sm: 2.5, md: 3 } }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={4} sx={{ mb: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="primary" sx={{ mb: 1.25, letterSpacing: '0.12em', display: 'block' }}>
                  RODANDO
                </Typography>
                <Typography variant="h4" sx={{ maxWidth: 700, letterSpacing: '-0.03em' }}>
                  Catalogo claro. Medidas confiaveis. Marca mais profissional.
                </Typography>
              </Box>
              <Stack sx={{ minWidth: { lg: 220 } }} justifyContent="flex-end">
                <Button component={RouterLink} to="/catalog" variant="outlined" color="primary" size="large">
                  Ver catalogo
                </Button>
              </Stack>
            </Stack>

            <Divider sx={{ borderColor: 'rgba(0,39,118,0.08)' }} />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ py: 3.5 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
                  RODANDO
                  <Box component="span" sx={{ color: 'primary.main' }}>
                    .BR
                  </Box>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.75, maxWidth: 380 }}>
                  Especialistas em camaras de ar e componentes. Clareza, velocidade e confianca.
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
                <Stack spacing={1}>
                  <Typography variant="overline" sx={{ color: 'primary.main' }}>
                    Navegacao
                  </Typography>
                  <Typography component={RouterLink} to="/" variant="body2" className="link-underline">
                    Pagina inicial
                  </Typography>
                  <Typography component={RouterLink} to="/technical" variant="body2" className="link-underline">
                    Medidas tecnicas
                  </Typography>
                  <Typography component={RouterLink} to="/catalog" variant="body2" className="link-underline">
                    Loja virtual
                  </Typography>
                </Stack>
                <Stack spacing={1}>
                  <Typography variant="overline" sx={{ color: 'primary.main' }}>
                    Suporte
                  </Typography>
                  <Typography variant="body2">Comercial B2B</Typography>
                  <Typography variant="body2">Atendimento</Typography>
                  <Typography variant="body2">Politicas</Typography>  
                </Stack>
                <Stack spacing={1}>
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

            <Divider sx={{ borderColor: 'rgba(0,39,118,0.08)' }} />
            <Typography
              variant="caption"
              sx={{ display: 'block', pt: 2.25, color: 'text.secondary', letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              © 2026 Rodando.com.br - Pecas Automotivas - CNPJ 10.174.972/0001-56
            </Typography>
          </Container>
          </Box>
        </motion.div>
      </Box>
    </Box>
  )
}
