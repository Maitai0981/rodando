import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'
import type { FooterProps } from '../ui/types'
import { Container } from './Container'
import { BrandWordmark } from '../ui/primitives/BrandWordmark'

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
        borderTop: 'none',
        mt: { xs: 5, md: 7 },
        bgcolor: 'transparent',
        background:
          'radial-gradient(circle at 16% 100%, rgba(212,168,67,0.08) 0%, transparent 46%), linear-gradient(180deg, rgba(10,10,15,0) 0%, rgba(10,10,15,0.97) 20%, rgba(10,10,15,1) 100%)',
        boxShadow: 'none',
      }}
    >
      <Container>
        <Stack spacing={2} sx={{ py: { xs: 2.8, md: 5.2 }, pb: { xs: 'calc(6.2rem + env(safe-area-inset-bottom, 0px))', md: 5.2 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
            <Stack spacing={0.8} sx={{ maxWidth: 420 }}>
              <Typography variant="overline" color="secondary.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.7, flexWrap: 'wrap' }}>
                <BrandWordmark variant="compact" tone="light" text="RODANDO" sx={{ fontSize: '0.95rem' }} />
                Moto Center
              </Typography>
              <Typography variant="h5" sx={{ color: '#f0ede8' }}>Peças para sua moto, com suporte técnico local.</Typography>
              <Typography variant="caption" className="brand-slogan" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                {BRAND_SLOGAN}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Av. Brasil, 8708 - Cascavel/PR • Segunda a sexta, 08h às 18h.
              </Typography>
              <Button
                className="ds-pressable"
                size="small"
                variant="outlined"
                component="a"
                href="https://wa.me/5545999346779"
                target="_blank"
                rel="noreferrer"
                sx={{ alignSelf: 'flex-start', color: '#d4a843', borderColor: 'rgba(212,168,67,0.4)', '&:hover': { borderColor: '#d4a843', bgcolor: 'rgba(212,168,67,0.08)' } }}
              >
                Falar no WhatsApp
              </Button>
            </Stack>

            <Stack spacing={0.6}>
              <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.45)' }}>Links rápidos</Typography>
              {quickLinks.map((link) => (
                <Typography key={link.href} component={RouterLink} to={link.href} variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', '&:hover': { color: '#d4a843' }, transition: 'color 0.2s' }}>
                  {link.label}
                </Typography>
              ))}
            </Stack>
          </Stack>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>© {new Date().getFullYear()} Rodando Moto Center. Todos os direitos reservados.</Typography>
        </Stack>
      </Container>
    </Box>
  )
}
