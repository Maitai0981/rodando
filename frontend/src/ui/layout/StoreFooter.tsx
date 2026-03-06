import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'
import type { FooterProps } from '../types'
import { Container } from './Container'

const DEFAULT_LINKS: FooterProps['quickLinks'] = [
  { label: 'Inicio', href: '/' },
  { label: 'Catalogo', href: '/catalog' },
  { label: 'Carrinho', href: '/cart' },
  { label: 'Pedidos', href: '/orders' },
]
const BRAND_SLOGAN = 'Rodando te ajudando a continuar rodando'

export function StoreFooter({ quickLinks = DEFAULT_LINKS }: Partial<FooterProps>) {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        mt: { xs: 5, md: 7 },
        bgcolor: 'rgba(251,249,244,0.92)',
        background: 'linear-gradient(180deg, rgba(251,249,244,0.94) 0%, rgba(243,239,230,0.92) 100%)',
      }}
    >
      <Container>
        <Stack spacing={2} sx={{ py: { xs: 2.8, md: 5.2 }, pb: { xs: 'calc(6.2rem + env(safe-area-inset-bottom, 0px))', md: 5.2 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
            <Stack spacing={0.8} sx={{ maxWidth: 420 }}>
              <Typography variant="overline" color="secondary.main">Rodando Moto Center</Typography>
              <Typography variant="h5">Pecas para sua moto, com suporte tecnico local.</Typography>
              <Typography variant="caption" className="brand-slogan">
                {BRAND_SLOGAN}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Av. Brasil, 8708 - Cascavel/PR • Segunda a sexta, 08h as 18h.
              </Typography>
              <Button
                size="small"
                variant="outlined"
                component="a"
                href="https://wa.me/5545999346779"
                target="_blank"
                rel="noreferrer"
                sx={{ alignSelf: 'flex-start' }}
              >
                Falar no WhatsApp
              </Button>
            </Stack>

            <Stack spacing={0.6}>
              <Typography variant="subtitle2" color="text.secondary">Links rapidos</Typography>
              {quickLinks.map((link) => (
                <Typography key={link.href} component={RouterLink} to={link.href} variant="body2" sx={{ '&:hover': { color: 'secondary.dark' } }}>
                  {link.label}
                </Typography>
              ))}
            </Stack>
          </Stack>
          <Divider />
          <Typography variant="caption" color="text.secondary">© {new Date().getFullYear()} Rodando Moto Center. Todos os direitos reservados.</Typography>
        </Stack>
      </Container>
    </Box>
  )
}
