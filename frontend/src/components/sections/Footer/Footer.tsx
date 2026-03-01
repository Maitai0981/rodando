import FacebookRoundedIcon from '@mui/icons-material/FacebookRounded'
import InstagramIcon from '@mui/icons-material/Instagram'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'
import { UiContainer } from '../../ui'

const QUICK_LINKS = [
  { label: 'Inicio', href: '/' },
  { label: 'Catálogo', href: '/catalog' },
  { label: 'Promoções', href: '/catalog?promo=true&sort=discount-desc' },
  { label: 'Carrinho', href: '/cart' },
  { label: 'Contato', href: '/#home-contact' },
]

export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: '1px solid',
        borderColor: { xs: 'rgba(216,211,194,0.95)', md: 'divider' },
        mt: { xs: 5, md: 8 },
        bgcolor: { xs: '#F7F5EE', md: 'transparent' },
        color: { xs: 'text.primary', md: 'inherit' },
      }}
    >
      <UiContainer sx={{ py: { xs: 3.2, md: 7 }, pb: { xs: 'calc(6.2rem + env(safe-area-inset-bottom, 0px))', md: 7 } }}>
        <Stack spacing={{ xs: 1.9, md: 3 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 2.2, md: 3 }}
            justifyContent="space-between"
            alignItems={{ md: 'flex-start' }}
          >
            <Stack
              spacing={1.4}
              sx={{
                maxWidth: 430,
                borderRadius: { xs: 2.5, md: 0 },
                border: { xs: '1px solid #D8D3C2', md: 'none' },
                bgcolor: { xs: '#FFFFFF', md: 'transparent' },
                p: { xs: 2, md: 0 },
              }}
            >
              <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 700, letterSpacing: '0.12em' }}>
                Rodando Moto Center
              </Typography>
              <Typography variant="h4" sx={{ color: { xs: 'text.primary', md: 'text.primary' } }}>Peças para sua moto com suporte rápido.</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ color: { xs: 'text.secondary', md: 'text.secondary' } }}>
                Av. Brasil, 8708 - Cascavel/PR. Segunda a sexta, 08h às 18h.
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<WhatsAppIcon />}
                  component="a"
                  href="https://wa.me/5545999346779"
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </Button>
                <Button
                  variant="text"
                  size="small"
                  startIcon={<PlaceRoundedIcon />}
                  component="a"
                  href="https://www.google.com/maps/place/Rodando+Moto+Center/@-24.9539372,-53.4823137,17z/data=!3m1!4b1!4m6!3m5!1s0x94f3d6abd0f76d39:0x4c1de863cd816ba6!8m2!3d-24.9539372!4d-53.4823137!16s%2Fg%2F1thnpyhg?entry=ttu&g_ep=EgoyMDI2MDIyMi4wIKXMDSoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver mapa
                </Button>
              </Stack>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 4 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ color: 'secondary.dark' }}>Links úteis</Typography>
                {QUICK_LINKS.map((link) => (
                  <Typography
                    component={RouterLink}
                    to={link.href}
                    variant="body2"
                    key={link.href}
                    sx={{
                      color: { xs: 'text.secondary', md: 'text.secondary' },
                      '&:hover': {
                        color: 'secondary.dark',
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: 2,
                        borderRadius: 1,
                      },
                    }}
                  >
                    {link.label}
                  </Typography>
                ))}
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ color: 'secondary.dark' }}>Redes</Typography>
                <Typography
                  component="a"
                  href="https://www.instagram.com/rodandomoto"
                  target="_blank"
                  rel="noreferrer"
                  variant="body2"
                  sx={{
                    color: { xs: 'text.secondary', md: 'text.secondary' },
                    '&:hover': {
                      color: 'secondary.dark',
                    },
                  }}
                >
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <InstagramIcon sx={{ fontSize: 16 }} />
                    <span>Instagram</span>
                  </Stack>
                </Typography>
                <Typography
                  component="a"
                  href="https://www.facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  variant="body2"
                  sx={{
                    color: { xs: 'text.secondary', md: 'text.secondary' },
                    '&:hover': {
                      color: 'secondary.dark',
                    },
                  }}
                >
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <FacebookRoundedIcon sx={{ fontSize: 16 }} />
                    <span>Facebook</span>
                  </Stack>
                </Typography>
              </Stack>
            </Stack>
          </Stack>

          <Divider />
          <Typography variant="caption" color="text.secondary" sx={{ color: { xs: 'text.secondary', md: 'text.secondary' } }}>
            © {new Date().getFullYear()} Rodando Moto Center. Todos os direitos reservados.
          </Typography>
        </Stack>
      </UiContainer>
    </Box>
  )
}
