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
import { Link as RouterLink } from 'react-router-dom'

export default function PublicLayout({ children }: PropsWithChildren) {
  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        className="glass-nav"
        sx={{
          top: { xs: 12, md: 18 },
          left: { xs: 10, md: 18 },
          right: { xs: 10, md: 18 },
          width: 'auto',
          borderRadius: 999,
          border: '1px solid rgba(0,39,118,0.12)'
        }}
      >
        <Toolbar sx={{ gap: 2, minHeight: { xs: 66, md: 74 }, px: { xs: 1.5, md: 2.25 } }}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            component={RouterLink}
            to="/"
            sx={{ color: 'inherit', minWidth: 0 }}
          >
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                border: '1.5px solid rgba(0,39,118,0.18)',
                display: 'grid',
                placeItems: 'center',
                position: 'relative',
                bgcolor: 'rgba(255,255,255,0.9)'
              }}
            >
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: 'secondary.main' }} />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 4,
                  borderRadius: '50%',
                  border: '1px dashed rgba(0,39,118,0.24)'
                }}
              />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
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
              p: 0.5,
              borderRadius: 999,
              border: '1px solid rgba(0,39,118,0.08)',
              bgcolor: 'rgba(255,255,255,0.35)'
            }}
          >
            <Button component={RouterLink} to="/" color="primary" sx={{ px: 1.75 }}>
              Inicio
            </Button>
            <Button component={RouterLink} to="/technical" color="primary" sx={{ px: 1.75 }}>
              Medidas
            </Button>
            <Button component={RouterLink} to="/catalog" color="primary" sx={{ px: 1.75 }}>
              Catalogo
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: { xs: 'auto', md: 0 } }}>
            <Button
              component={RouterLink}
              to="/technical"
              variant="outlined"
              color="primary"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Tabela tecnica
            </Button>
            <Button component={RouterLink} to="/catalog" variant="contained" color="primary">
              Ver loja
            </Button>
            <IconButton
              component={RouterLink}
              to="/cart"
              sx={{
                color: 'info.main',
                bgcolor: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(0,39,118,0.12)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.98)' }
              }}
            >
              <Badge badgeContent={1} color="secondary" overlap="circular">
                <ShoppingBagOutlinedIcon />
              </Badge>
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ pt: { xs: 12, md: 15 } }}>
        <Container sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, sm: 3, md: 4 } }}>{children}</Container>
      </Box>

      <Box
        component="footer"
        sx={{
          mt: 8,
          borderTop: '1px solid rgba(0,39,118,0.1)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(241,249,244,0.92) 100%)'
        }}
      >
        <Container sx={{ py: { xs: 6, md: 8 }, px: { xs: 2, sm: 3, md: 4 } }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={5} sx={{ mb: 4 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
                Infraestrutura comercial + tecnica
              </Typography>
              <Typography variant="h2" sx={{ maxWidth: 760 }}>
                Catalogo claro, medidas confiaveis e uma apresentacao mais profissional da marca.
              </Typography>
            </Box>
            <Stack sx={{ minWidth: { lg: 260 } }} justifyContent="flex-end">
              <Button component={RouterLink} to="/catalog" variant="contained" color="primary" size="large">
                Explorar catalogo
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ borderColor: 'rgba(0,39,118,0.12)' }} />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={6} sx={{ py: 4.5 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
                RODANDO
                <Box component="span" sx={{ color: 'primary.main' }}>
                  .BR
                </Box>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.75, maxWidth: 380 }}>
                Especialistas em camaras de ar e componentes para quem nao pode parar de rodar. Plataforma com foco em
                clareza, velocidade e confianca.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={6}>
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
                <Typography variant="body2">Atendimento tecnico</Typography>
                <Typography variant="body2">Comercial B2B</Typography>
                <Typography variant="body2">Politicas e trocas</Typography>
              </Stack>
            </Stack>
          </Stack>

          <Divider sx={{ borderColor: 'rgba(0,39,118,0.08)' }} />
          <Typography
            variant="caption"
            sx={{ display: 'block', pt: 3, color: 'text.secondary', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            © 2026 Rodando.com.br - Pecas Automotivas - CNPJ 00.000.000/0000-00
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}
