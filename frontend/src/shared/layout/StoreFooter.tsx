import Box from '@mui/material/Box'
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
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {[
                  {
                    label: 'WhatsApp',
                    href: 'https://wa.me/5545999346779',
                    icon: (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    ),
                  },
                  {
                    label: 'Instagram',
                    href: 'https://www.instagram.com/rodandomoto?utm_source=qr&igsh=MWUzd3VvM21rYzk2Mg%3D%3D',
                    icon: (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                      </svg>
                    ),
                  },
                  {
                    label: 'Facebook',
                    href: 'https://www.facebook.com/people/Rodando-MOTO-Center/100063563260906/?rdid=hmuIEMzS0niAaxPa&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F154Nx32j9w%2F',
                    icon: (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    ),
                  },
                ].map(({ label, href, icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(212,168,67,0.4)',
                      color: '#d4a843',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      textDecoration: 'none',
                      transition: 'border-color 0.2s, background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#d4a843'
                      e.currentTarget.style.backgroundColor = 'rgba(212,168,67,0.08)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(212,168,67,0.4)'
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    {icon}
                    {label}
                  </a>
                ))}
              </Stack>
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
