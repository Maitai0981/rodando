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
  { label: 'Catalogo', href: '/catalog' },
  { label: 'Medidas', href: '/technical' },
  { label: 'Carrinho', href: '/cart' },
  { label: 'Contato', href: '/#home-contact' },
]

export function Footer() {
  return (
    <Box component="footer" sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 8 }}>
      <UiContainer sx={{ py: { xs: 5, md: 7 } }}>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            justifyContent="space-between"
            alignItems={{ md: 'flex-start' }}
          >
            <Stack spacing={1.4} sx={{ maxWidth: 430 }}>
              <Typography variant="overline" color="primary">
                Rodando Moto Center
              </Typography>
              <Typography variant="h4">Peças para sua moto com suporte rápido.</Typography>
              <Typography variant="body2" color="text.secondary">
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
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver mapa
                </Button>
              </Stack>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2.5, sm: 4 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2">Links úteis</Typography>
                {QUICK_LINKS.map((link) => (
                  <Typography
                    component={RouterLink}
                    to={link.href}
                    variant="body2"
                    key={link.href}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'text.primary',
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
                <Typography variant="subtitle2">Redes</Typography>
                <Typography
                  component="a"
                  href="https://www.instagram.com/rodandomoto"
                  target="_blank"
                  rel="noreferrer"
                  variant="body2"
                  sx={{ color: 'text.secondary' }}
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
                  sx={{ color: 'text.secondary' }}
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
          <Typography variant="caption" color="text.secondary">
            © {new Date().getFullYear()} Rodando Moto Center. Todos os direitos reservados.
          </Typography>
        </Stack>
      </UiContainer>
    </Box>
  )
}
