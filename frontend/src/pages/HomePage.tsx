import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Rating,
  Stack,
  Typography,
} from '@mui/material'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import BuildRoundedIcon from '@mui/icons-material/BuildRounded'
import TwoWheelerRoundedIcon from '@mui/icons-material/TwoWheelerRounded'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded'
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import type { SvgIconComponent } from '@mui/icons-material'
import { AppShell } from '../layouts/AppShell'
import { formatCurrency } from '../lib'

interface QuickAction {
  title: string
  note: string
  href: string
  cta: string
  external?: boolean
  icon: SvgIconComponent
}

interface CategoryItem {
  title: string
  note: string
  href: string
  chip: string
  icon: SvgIconComponent
}

interface HighlightProduct {
  name: string
  note: string
  price: number
  oldPrice?: number
  tag: string
  search: string
}

const officialLinks = {
  maps:
    'https://www.google.com/maps/place/Rodando+Moto+Center/@-24.9539372,-53.4823137,17z/data=!3m1!4b1!4m6!3m5!1s0x94f3d6abd0f76d39:0x4c1de863cd816ba6!8m2!3d-24.9539372!4d-53.4823137!16s%2Fg%2F1thnpyhg?entry=ttu&g_ep=EgoyMDI2MDIyMi4wIKXMDSoASAFQAw%3D%3D',
  whatsapp: 'https://wa.me/5545999346779',
}

const quickActions: QuickAction[] = [
  {
    title: 'Ver catalogo',
    note: 'Pecas e acessorios por categoria',
    href: '/catalog',
    cta: 'Explorar agora',
    icon: StorefrontRoundedIcon,
  },
  {
    title: 'Falar no WhatsApp',
    note: 'Atendimento rapido para orcamentos',
    href: officialLinks.whatsapp,
    cta: 'Abrir conversa',
    external: true,
    icon: WhatsAppIcon,
  },
  {
    title: 'Ofertas da semana',
    note: 'Itens com condicoes especiais',
    href: '#home-offers',
    cta: 'Ver ofertas',
    icon: BoltRoundedIcon,
  },
]

const categories: CategoryItem[] = [
  {
    title: 'Pneus',
    note: 'Modelos urbanos e trilha para varias cilindradas',
    href: '/catalog?q=pneu',
    chip: 'Mais vendidos',
    icon: TwoWheelerRoundedIcon,
  },
  {
    title: 'Camaras de ar',
    note: 'Linhas premium e reforcadas para uso diario',
    href: '/catalog?q=camara',
    chip: 'Entrega rapida',
    icon: BuildRoundedIcon,
  },
  {
    title: 'Freios',
    note: 'Pastilhas e componentes para maior seguranca',
    href: '/catalog?q=freio',
    chip: 'Seguranca',
    icon: SecurityRoundedIcon,
  },
  {
    title: 'Relacao',
    note: 'Corrente, coroa e pinhao para reposicao completa',
    href: '/catalog?q=relacao',
    chip: 'Kit completo',
    icon: CategoryRoundedIcon,
  },
]

const highlights: HighlightProduct[] = [
  {
    name: 'Kit Relacao 428 Premium',
    note: 'Durabilidade para uso urbano e estrada',
    price: 289.9,
    oldPrice: 329.9,
    tag: 'Oferta',
    search: 'kit relacao 428',
  },
  {
    name: 'Pneu Street Grip 90/90-18',
    note: 'Mais aderencia em piso seco e molhado',
    price: 419.0,
    tag: 'Top venda',
    search: 'pneu 90/90-18',
  },
  {
    name: 'Camara Reforcada 300-18',
    note: 'Linha reforcada com maior resistencia',
    price: 79.9,
    oldPrice: 94.9,
    tag: 'Preco baixo',
    search: 'camara 300-18',
  },
  {
    name: 'Pastilha Freio Pro Stop',
    note: 'Resposta progressiva para uso diario',
    price: 129.0,
    tag: 'Reposicao rapida',
    search: 'pastilha freio',
  },
]

const trustPillars = [
  {
    title: 'Loja fisica',
    note: 'Retire no balcão com suporte tecnico local.',
    icon: StorefrontRoundedIcon,
  },
  {
    title: 'Garantia real',
    note: 'Produtos com procedencia e politicas claras.',
    icon: VerifiedRoundedIcon,
  },
  {
    title: 'Entrega agil',
    note: 'Despacho rapido para reduzir tempo parado.',
    icon: LocalShippingRoundedIcon,
  },
  {
    title: 'Suporte especializado',
    note: 'Equipe pronta para orientar compra e aplicacao.',
    icon: SupportAgentRoundedIcon,
  },
]

const reviews = [
  {
    name: 'Lucas M.',
    rating: 5,
    comment: 'Atendimento rapido no WhatsApp e pedido chegou antes do prazo.',
  },
  {
    name: 'Fernanda R.',
    rating: 5,
    comment: 'Catalogo organizado e facil de encontrar a peca correta.',
  },
  {
    name: 'Rafael C.',
    rating: 4,
    comment: 'Retirada na loja foi tranquila e equipe ajudou na escolha.',
  },
]

const storeAddress = 'Av. Brasil, 8708 - Cascavel - PR'

function ActionCard({ action }: { action: QuickAction }) {
  const IconComponent = action.icon

  return (
    <Paper
      component={action.external ? 'a' : RouterLink}
      href={action.external ? action.href : undefined}
      to={action.external ? undefined : action.href}
      target={action.external ? '_blank' : undefined}
      rel={action.external ? 'noreferrer' : undefined}
      elevation={0}
      sx={{
        p: 2,
        height: '100%',
        borderRadius: 3,
        border: '1px solid rgba(255,255,255,0.14)',
        bgcolor: 'rgba(9,9,9,0.78)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        textDecoration: 'none',
        transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: 'rgba(255,223,0,0.52)',
          boxShadow: '0 14px 26px rgba(0,0,0,0.3)',
        },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'rgba(0,156,59,0.18)',
          color: 'primary.main',
        }}
      >
        <IconComponent sx={{ fontSize: 24 }} />
      </Box>
      <Typography variant="h6" sx={{ fontSize: '1.7rem', color: 'info.main' }}>
        {action.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
        {action.note}
      </Typography>
      <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.04em' }}>
        {action.cta}
      </Typography>
    </Paper>
  )
}

function ProductCard({ product }: { product: HighlightProduct }) {
  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        p: 2,
        borderRadius: 3,
        border: '1px solid rgba(255,255,255,0.14)',
        bgcolor: 'rgba(10,10,10,0.82)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.4,
        transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: 'rgba(255,223,0,0.55)',
          boxShadow: '0 14px 26px rgba(0,0,0,0.3)',
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          aspectRatio: '4 / 3',
          borderRadius: 2.5,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.14)',
          background:
            'radial-gradient(circle at 22% 20%, rgba(0,156,59,0.22), transparent 45%), radial-gradient(circle at 84% 18%, rgba(255,223,0,0.16), transparent 42%), linear-gradient(160deg, #171717 0%, #101010 100%)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            color: 'rgba(255,255,255,0.8)',
          }}
        >
          <TwoWheelerRoundedIcon sx={{ fontSize: 56 }} />
        </Box>
      </Box>

      <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
        <Chip size="small" label={product.tag} variant="outlined" />
      </Stack>

      <Typography variant="h6" sx={{ color: 'info.main', fontSize: '1.65rem', lineHeight: 1.15 }}>
        {product.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ minHeight: 42 }}>
        {product.note}
      </Typography>

      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 'auto' }}>
        <Typography variant="h5" sx={{ color: 'info.main', fontWeight: 700 }}>
          {formatCurrency(product.price)}
        </Typography>
        {product.oldPrice ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', textDecoration: 'line-through' }}>
            {formatCurrency(product.oldPrice)}
          </Typography>
        ) : null}
      </Stack>

      <Button
        component={RouterLink}
        to={`/catalog?q=${encodeURIComponent(product.search)}`}
        variant="contained"
        color="primary"
        sx={{ minHeight: 44 }}
      >
        Comprar / Orcar
      </Button>
    </Paper>
  )
}

export default function HomePage() {
  const [copiedAddress, setCopiedAddress] = useState(false)

  async function handleCopyAddress() {
    try {
      await navigator.clipboard.writeText(storeAddress)
      setCopiedAddress(true)
      window.setTimeout(() => setCopiedAddress(false), 1800)
    } catch {
      setCopiedAddress(false)
    }
  }

  return (
    <AppShell contained={false}>
      <Stack spacing={{ xs: 3, md: 4 }}>
        <Paper
          component="section"
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.4, md: 3 },
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.16)',
            background:
              'radial-gradient(circle at 10% 0%, rgba(0,156,59,0.2), transparent 40%), radial-gradient(circle at 90% 0%, rgba(255,223,0,0.14), transparent 34%), linear-gradient(180deg, rgba(14,14,14,0.96) 0%, rgba(8,8,8,0.95) 100%)',
            boxShadow: '0 22px 40px rgba(0,0,0,0.35)',
          }}
        >
          <Grid container spacing={{ xs: 2, md: 3 }} alignItems="center">
            <Grid size={{ xs: 12, lg: 7 }}>
              <Stack spacing={1.4}>
                <Chip
                  icon={<VerifiedRoundedIcon sx={{ fontSize: 18 }} />}
                  label="Marketplace de pecas para moto"
                  sx={{ alignSelf: 'flex-start', height: 32, px: 0.5 }}
                />

                <Typography
                  component="h1"
                  sx={{
                    fontSize: 'clamp(2.8rem, 5vw, 5rem)',
                    lineHeight: 0.95,
                    letterSpacing: '-0.04em',
                    color: 'info.main',
                    maxWidth: 780,
                  }}
                >
                  Pecas certas para sua moto, com compra rapida e suporte real.
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.secondary',
                    maxWidth: 680,
                    fontSize: 'clamp(1.45rem, 2vw, 1.8rem)',
                  }}
                >
                  Compare categorias, veja ofertas e fale com nossa equipe em poucos cliques.
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button component={RouterLink} to="/catalog" variant="contained" color="primary" sx={{ minHeight: 46 }}>
                    Ver catalogo
                  </Button>
                  <Button
                    component="a"
                    href={officialLinks.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    variant="outlined"
                    color="success"
                    startIcon={<WhatsAppIcon />}
                    sx={{ minHeight: 46 }}
                  >
                    Falar no WhatsApp
                  </Button>
                  <Button component="a" href="#home-offers" variant="text" color="info" sx={{ minHeight: 46 }}>
                    Ver ofertas
                  </Button>
                </Stack>

                <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                  <Chip label="Loja fisica" variant="outlined" size="small" />
                  <Chip label="Retirada local" variant="outlined" size="small" />
                  <Chip label="Garantia" variant="outlined" size="small" />
                </Stack>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, lg: 5 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.14)',
                  bgcolor: 'rgba(7,7,7,0.65)',
                }}
              >
                <Stack spacing={1.4}>
                  <Typography variant="subtitle2" sx={{ color: 'primary.main', letterSpacing: '0.08em' }}>
                    DESTAQUES DA SEMANA
                  </Typography>
                  <Stack spacing={1}>
                    {highlights.slice(0, 3).map((item) => (
                      <Box
                        key={item.name}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'auto 1fr auto',
                          alignItems: 'center',
                          gap: 1,
                          p: 1.2,
                          borderRadius: 2,
                          border: '1px solid rgba(255,255,255,0.14)',
                          bgcolor: 'rgba(255,255,255,0.04)',
                        }}
                      >
                        <BoltRoundedIcon sx={{ color: 'info.main', fontSize: 20 }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 600 }}>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.note}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 700 }}>
                          {formatCurrency(item.price)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Paper>

        <Box component="section">
          <Grid container spacing={2}>
            {quickActions.map((action) => (
              <Grid key={action.title} size={{ xs: 12, md: 4 }}>
                <ActionCard action={action} />
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box component="section" id="home-categories">
          <Stack spacing={1.2} sx={{ mb: 2 }}>
            <Typography variant="h3" sx={{ color: 'info.main', fontSize: 'clamp(2.1rem, 3.2vw, 3.2rem)' }}>
              Categorias para compra rapida
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 760 }}>
              Encontre a categoria certa e siga para o catalogo filtrado sem perder tempo.
            </Typography>
          </Stack>

          <Grid container spacing={2}>
            {categories.map((category) => {
              const IconComponent = category.icon
              return (
                <Grid key={category.title} size={{ xs: 12, sm: 6, lg: 3 }}>
                  <Paper
                    component={RouterLink}
                    to={category.href}
                    elevation={0}
                    sx={{
                      p: 2,
                      height: '100%',
                      borderRadius: 3,
                      border: '1px solid rgba(255,255,255,0.14)',
                      bgcolor: 'rgba(10,10,10,0.8)',
                      textDecoration: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      transition: 'transform 180ms ease, border-color 180ms ease',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        borderColor: 'rgba(255,223,0,0.5)',
                      },
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: 'rgba(0,156,59,0.2)',
                        }}
                      >
                        <IconComponent sx={{ color: 'primary.main' }} />
                      </Box>
                      <Chip size="small" label={category.chip} variant="outlined" />
                    </Stack>
                    <Typography variant="h6" sx={{ color: 'info.main', fontSize: '1.65rem' }}>
                      {category.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      {category.note}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
                      Ver categoria
                    </Typography>
                  </Paper>
                </Grid>
              )
            })}
          </Grid>
        </Box>

        <Box component="section" id="home-offers">
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h3" sx={{ color: 'info.main', fontSize: 'clamp(2.1rem, 3.2vw, 3.2rem)' }}>
                Ofertas e mais vendidos
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 760 }}>
                Cards claros para comparar preco, beneficio e partir para compra ou orcamento.
              </Typography>
            </Box>
            <Button component={RouterLink} to="/catalog" variant="outlined" color="primary" sx={{ minHeight: 44 }}>
              Ver catalogo completo
            </Button>
          </Stack>

          <Grid container spacing={2}>
            {highlights.map((product) => (
              <Grid key={product.name} size={{ xs: 12, sm: 6, xl: 3 }}>
                <ProductCard product={product} />
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box component="section">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 2.4 },
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.14)',
              bgcolor: 'rgba(9,9,9,0.8)',
            }}
          >
            <Stack spacing={1} sx={{ mb: 2 }}>
              <Typography variant="h3" sx={{ color: 'info.main', fontSize: 'clamp(2.1rem, 3.2vw, 3.2rem)' }}>
                Por que comprar aqui?
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Estrutura de marketplace com apoio local para quem precisa resolver rapido.
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              {trustPillars.map((pillar) => {
                const IconComponent = pillar.icon
                return (
                  <Grid key={pillar.title} size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        height: '100%',
                        borderRadius: 2.5,
                        border: '1px solid rgba(255,255,255,0.14)',
                        bgcolor: 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <Stack spacing={1}>
                        <Box
                          sx={{
                            width: 42,
                            height: 42,
                            borderRadius: 2,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: 'rgba(255,223,0,0.12)',
                            color: 'info.main',
                          }}
                        >
                          <IconComponent />
                        </Box>
                        <Typography variant="subtitle1" sx={{ color: 'info.main', fontWeight: 700 }}>
                          {pillar.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {pillar.note}
                        </Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                )
              })}
            </Grid>
          </Paper>
        </Box>

        <Box component="section">
          <Stack spacing={1.2} sx={{ mb: 2 }}>
            <Typography variant="h3" sx={{ color: 'info.main', fontSize: 'clamp(2.1rem, 3.2vw, 3.2rem)' }}>
              Avaliacoes recentes
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Feedback de clientes sobre atendimento, entrega e experiencia de compra.
            </Typography>
          </Stack>

          <Grid container spacing={2}>
            {reviews.map((review) => (
              <Grid key={review.name} size={{ xs: 12, md: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    height: '100%',
                    borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.14)',
                    bgcolor: 'rgba(10,10,10,0.82)',
                  }}
                >
                  <Stack spacing={1}>
                    <Rating value={review.rating} precision={0.5} readOnly size="small" />
                    <Typography variant="body2" color="text.secondary">
                      "{review.comment}"
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: 'info.main', fontWeight: 700 }}>
                      {review.name}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Paper
          component="section"
          id="home-contact"
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.6 },
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.14)',
            bgcolor: 'rgba(9,9,9,0.84)',
          }}
        >
          <Grid container spacing={2.2}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Stack spacing={1.2}>
                <Typography variant="h3" sx={{ color: 'info.main', fontSize: 'clamp(2rem, 3vw, 3rem)' }}>
                  Loja fisica e atendimento comercial
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 620 }}>
                  Atendimento de segunda a sexta, com retirada local e suporte para orcamento rapido.
                </Typography>

                <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                  <Chip label="Seg a Sex - 08h as 18h" size="small" variant="outlined" />
                  <Chip label="Retirada no balcao" size="small" variant="outlined" />
                  <Chip label="Suporte por WhatsApp" size="small" variant="outlined" />
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    component="a"
                    href={officialLinks.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    variant="contained"
                    color="primary"
                    startIcon={<WhatsAppIcon />}
                    sx={{ minHeight: 44 }}
                  >
                    Falar com vendedor
                  </Button>
                  <Button
                    component="a"
                    href={officialLinks.maps}
                    target="_blank"
                    rel="noreferrer"
                    variant="outlined"
                    color="primary"
                    startIcon={<PlaceRoundedIcon />}
                    sx={{ minHeight: 44 }}
                  >
                    Abrir no mapa
                  </Button>
                </Stack>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, lg: 5 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid rgba(255,255,255,0.14)',
                  bgcolor: 'rgba(255,255,255,0.04)',
                  height: '100%',
                }}
              >
                <Stack spacing={1.2} sx={{ height: '100%' }}>
                  <Typography variant="overline" sx={{ color: 'primary.main' }}>
                    ENDERECO
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'info.main', fontWeight: 700 }}>
                    {storeAddress}
                  </Typography>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.14)' }} />
                  <Typography variant="body2" color="text.secondary">
                    Telefone: +55 45 3037-5858
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    WhatsApp: +55 45 99934-6779
                  </Typography>
                  <Button
                    variant="text"
                    color="primary"
                    startIcon={<ContentCopyRoundedIcon />}
                    onClick={() => void handleCopyAddress()}
                    sx={{ alignSelf: 'flex-start', minHeight: 44 }}
                  >
                    {copiedAddress ? 'Endereco copiado' : 'Copiar endereco'}
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Stack>
    </AppShell>
  )
}
