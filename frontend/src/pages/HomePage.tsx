import { AccessTimeRoundedIcon, CategoryRoundedIcon, ExpandMoreRoundedIcon, LocalShippingRoundedIcon, StorefrontRoundedIcon, SupportAgentRoundedIcon, VerifiedRoundedIcon, WhatsAppIcon } from '@/ui/primitives/Icon'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Rating,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '../layouts/AppShell'
import { formatCurrency } from '../lib'
import { api, ApiError, buildProductUrl, type Product } from '../lib/api'
import { useAssist } from '../context/AssistContext'
import { AssistHintInline } from '../components/assist'
import { MotionReveal, ResponsiveImage } from '../ui'

const officialLinks = {
  maps:
    'https://www.google.com/maps/place/Rodando+Moto+Center/@-24.9539372,-53.4823137,17z/data=!3m1!4b1!4m6!3m5!1s0x94f3d6abd0f76d39:0x4c1de863cd816ba6!8m2!3d-24.9539372!4d-53.4823137!16s%2Fg%2F1thnpyhg?entry=ttu&g_ep=EgoyMDI2MDIyMi4wIKXMDSoASAFQAw%3D%3D',
  whatsapp: 'https://wa.me/5545999346779',
}
const BRAND_SLOGAN = 'Rodando te ajudando a continuar rodando'

const storeLocationPhotoUrl =
  'https://lh3.googleusercontent.com/p/AF1QipOIJtyawLBJXkAdD3-zjal0bL54xaGKNWe2KFkU=w1200-h900-k-no'

const heroTextPanelImageUrl =
  'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1600&q=80'

const workshopBackdropUrl =
  'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1600&q=80'

const commercialTextureUrl =
  'https://img.freepik.com/fotos-premium/corrida-de-motocicleta-dinamica-pela-estrada-com-efeito-de-desfocamento-de-movimento-mostrando-velocidade-e-acao_937679-76037.jpg?w=1200'

const contactMotoAccentUrl =
  'https://images.unsplash.com/photo-1580310614729-ccd69652491d?auto=format&fit=crop&w=1000&q=80'

const pillars = [
  { title: 'Loja fisica ativa', note: 'Retirada no balcao e apoio tecnico presencial.', icon: StorefrontRoundedIcon },
  { title: 'Entrega agil', note: 'Despacho rapido para reduzir tempo de moto parada.', icon: LocalShippingRoundedIcon },
  { title: 'Garantia real', note: 'Procedencia validada e politica comercial transparente.', icon: VerifiedRoundedIcon },
  { title: 'Consultoria tecnica', note: 'Equipe orienta aplicacao antes da compra.', icon: SupportAgentRoundedIcon },
]

const categoryIconCycle = [CategoryRoundedIcon, StorefrontRoundedIcon, SupportAgentRoundedIcon, LocalShippingRoundedIcon, VerifiedRoundedIcon]

function formatCommentDate(isoDate: string) {
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('pt-BR')
}

function resolveUrgency(product: Product) {
  const stock = Number(product.stock || 0)
  if (stock <= 3) return 'Ultimas unidades'
  if (product.offerEndsAt) return 'Oferta por tempo limitado'
  return null
}

function pickCategoryIcon(index: number) {
  return categoryIconCycle[index % categoryIconCycle.length] || CategoryRoundedIcon
}

function SectionHeading({
  kicker,
  title,
  subtitle,
}: {
  kicker: string
  title: string
  subtitle?: string
}) {
  return (
    <Stack spacing={0.7} sx={{ mb: 2 }}>
      <Typography component="p" className="store-kicker">
        {kicker}
      </Typography>
      <Typography component="h2" className="store-title">
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
          {subtitle}
        </Typography>
      ) : null}
    </Stack>
  )
}

function ProductCard({ product }: { product: Product }) {
  const urgency = resolveUrgency(product)
  const displayRating = product.discountPercent ? 4.9 : 4.7

  return (
    <Paper className="store-surface store-product-card" elevation={0} sx={{ height: '100%', p: 2.1 }}>
      <Stack spacing={1.25} sx={{ height: '100%' }}>
        <Box
          sx={{
            position: 'relative',
            aspectRatio: '4 / 3',
            borderRadius: 2.4,
            overflow: 'hidden',
            bgcolor: 'grey.100',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <ResponsiveImage
            src={product.imageUrl}
            alt={product.name}
            className="ds-image-pan"
            sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 25vw"
            sx={{
              transition: 'transform 260ms ease, opacity 220ms ease',
              '.store-product-card:hover &': {
                transform: product.hoverImageUrl ? 'scale(1.03)' : 'scale(1.05)',
                opacity: product.hoverImageUrl ? 0 : 1,
              },
            }}
          />
          {product.hoverImageUrl ? (
            <ResponsiveImage
              src={product.hoverImageUrl}
              alt={`${product.name} detalhe`}
              sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 25vw"
              sx={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                transition: 'opacity 220ms ease',
                '.store-product-card:hover &': {
                  opacity: 1,
                },
              }}
            />
          ) : null}
        </Box>

        <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
          <Chip size="small" label={product.category} variant="outlined" color="secondary" />
          {product.discountPercent ? <Chip size="small" label={`${product.discountPercent}% OFF`} color="warning" /> : null}
          {urgency ? <Chip size="small" label={urgency} color="primary" icon={<AccessTimeRoundedIcon size="sm" />} /> : null}
        </Stack>

        <Typography component="p" variant="h6" sx={{ lineHeight: 1.15 }}>
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {product.manufacturer} - {product.bikeModel}
        </Typography>

        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 'auto' }}>
          <Typography variant="h5" sx={{ color: 'info.main', fontWeight: 700 }}>
            {formatCurrency(Number(product.price))}
          </Typography>
          {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) ? (
            <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
              {formatCurrency(Number(product.compareAtPrice))}
            </Typography>
          ) : null}
        </Stack>

        <Stack direction="row" spacing={0.8} alignItems="center">
          <Rating value={displayRating} precision={0.1} readOnly size="small" />
          <Typography variant="caption" color="text.secondary">
            {displayRating.toFixed(1)}
          </Typography>
        </Stack>

        <Button className="ds-pressable ds-action-glint" component={RouterLink} to={buildProductUrl(product)} variant="contained" color="primary">
          Adicionar ao carrinho
        </Button>
      </Stack>
    </Paper>
  )
}

export default function HomePage() {
  const theme = useTheme()
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'))
  const isXlUp = useMediaQuery(theme.breakpoints.up('xl'))
  const { completeStep } = useAssist()
  const socialProofMarkedRef = useRef(false)
  const nextSectionRef = useRef<HTMLDivElement | null>(null)
  const highlightsPerRow = isXlUp ? 4 : isSmUp ? 2 : 1

  const highlightsQuery = useQuery({
    queryKey: ['home-highlights'],
    queryFn: () => api.listCatalogHighlights(),
  })
  const categoriesQuery = useQuery({
    queryKey: ['home-categories-source'],
    queryFn: () => api.listPublicProducts({ page: 1, pageSize: 120, sort: 'best-sellers' }),
  })
  const commentsQuery = useQuery({
    queryKey: ['home-comments'],
    queryFn: () => api.listComments({ limit: 6 }),
  })

  const highlights = useMemo(() => highlightsQuery.data?.items ?? [], [highlightsQuery.data?.items])
  const visibleHighlights = useMemo(() => highlights.slice(0, highlightsPerRow), [highlights, highlightsPerRow])
  const categoryChips = useMemo(() => {
    const groups = new Map<string, number>()
    for (const item of categoriesQuery.data?.items ?? []) {
      const name = String(item.category || '').trim()
      if (!name) continue
      groups.set(name, Number(groups.get(name) || 0) + 1)
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .slice(0, 8)
      .map(([name, total]) => ({ name, total }))
  }, [categoriesQuery.data?.items])

  const comments = commentsQuery.data?.items ?? []
  const commentsSummary = commentsQuery.data?.summary ?? { averageRating: 0, totalReviews: 0 }

  const highlightsError = highlightsQuery.error instanceof ApiError ? highlightsQuery.error.message : null
  const categoriesError = categoriesQuery.error instanceof ApiError ? categoriesQuery.error.message : null
  const commentsError = commentsQuery.error instanceof ApiError ? commentsQuery.error.message : null

  useEffect(() => {
    if (!commentsQuery.isSuccess || socialProofMarkedRef.current) return
    completeStep('social-proof-viewed', 'home')
    socialProofMarkedRef.current = true
  }, [commentsQuery.isSuccess, completeStep])

  const handleScrollToNextSection = useCallback(() => {
    const target = nextSectionRef.current ?? document.getElementById('home-next-section')
    if (!target) return
    const prefersReducedMotion = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [])

  return (
    <AppShell
      contained={false}
      mainProps={{
        className: 'store-page',
        pb: { xs: 4.6, md: 6.8 },
      }}
    >
      <Stack spacing={{ xs: 2.4, md: 3.8 }}>
        <MotionReveal variant="reveal-fade">
          <Paper
            component="section"
            data-testid="home-hero-section"
            className="store-section store-hero store-surface"
            elevation={0}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              minHeight: { xs: 340, sm: 390, md: 430 },
              p: { xs: 1.2, md: 1.8 },
              borderRadius: { xs: 2.2, md: 2.8 },
            }}
          >
          <Box aria-hidden sx={{ position: 'absolute', inset: 0 }}>
            <Box
              component="img"
              src={heroTextPanelImageUrl}
              alt=""
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 56%',
                filter: 'saturate(1.05) contrast(1.02) brightness(0.9)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(9,16,30,0.66) 0%, rgba(9,16,30,0.42) 34%, rgba(9,16,30,0.62) 100%), linear-gradient(108deg, rgba(9,16,30,0.76) 0%, rgba(9,16,30,0.48) 44%, rgba(9,16,30,0.22) 72%, rgba(9,16,30,0.16) 100%)',
              }}
            />
          </Box>

          <Grid container spacing={{ xs: 1.8, md: 2.2 }} sx={{ position: 'relative', zIndex: 1, alignItems: 'flex-start' }}>
            <Grid size={{ xs: 12, lg: 7.6 }}>
              <Paper
                elevation={0}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: { xs: 2, md: 2.6 },
                  border: 'none',
                  borderColor: 'transparent',
                  bgcolor: 'transparent',
                }}
              >
                

                <Stack
                  spacing={{ xs: 1.1, md: 1.6 }}
                  justifyContent="center"
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    py: { xs: 1.6, md: 2.2 },
                    px: { xs: 1.25, md: 1.9 },
                  }}
                >
                  <Typography component="p" className="store-kicker" sx={{ color: 'rgba(255,206,117,0.96)' }}>
                    Rodando Moto Center
                  </Typography>
                  <Typography component="h1" variant="h2" sx={{ maxWidth: 700, color: '#F8FAFC', textShadow: '0 8px 20px rgba(0,0,0,0.35)' }}>
                    Loja de pecas para moto com compra segura e suporte tecnico.
                  </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(241,245,249,0.92)', maxWidth: 680 }}>
                  Operacao local, consultoria tecnica e atendimento comercial rapido para uma compra segura, direta e sem erro de aplicacao.
                </Typography>
                <Typography
                  variant="subtitle2"
                  className="brand-slogan"
                  sx={{
                    color: 'rgba(255,225,166,0.98)',
                    fontWeight: 700,
                    letterSpacing: '0.012em',
                  }}
                >
                  {BRAND_SLOGAN}
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.1}>
                    <Button
                      className="ds-pressable ds-action-glint ds-cta-pulse"
                      data-testid="home-catalog-cta"
                      component={RouterLink}
                      to="/catalog"
                      onClick={() => completeStep('open-catalog', 'home')}
                      variant="contained"
                      color="primary"
                      sx={{ minHeight: 46, width: { xs: '100%', sm: 'auto' }, boxShadow: '0 12px 24px rgba(28,156,75,0.35)' }}
                    >
                      Ver catalogo
                    </Button>
                    <Button
                      className="ds-pressable ds-action-glint"
                      data-testid="home-whatsapp-cta"
                      component="a"
                      href={officialLinks.whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      variant="outlined"
                      color="secondary"
                      startIcon={<WhatsAppIcon size="sm" />}
                      sx={{
                        minHeight: 46,
                        width: { xs: '100%', sm: 'auto' },
                        bgcolor: 'rgba(17,24,39,0.58)',
                        borderColor: 'rgba(255,205,112,0.5)',
                        color: 'rgba(255,239,203,0.98)',
                        '&:hover': {
                          borderColor: 'rgba(255,205,112,0.88)',
                          bgcolor: 'rgba(17,24,39,0.72)',
                        },
                      }}
                    >
                      Atendimento via WhatsApp
                    </Button>
                  </Stack>
                  <AssistHintInline tipId="home-tip-search" routeKey="home">
                    Dica: use a busca do topo para encontrar produto por nome, categoria ou SKU.
                  </AssistHintInline>
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, lg: 4.4 }}>
              <Paper
                elevation={0}
                className="ds-tilt-soft"
                sx={{
                  mt: { xs: 0.3, lg: 1.6 },
                  p: { xs: 1.35, md: 1.8 },
                  borderRadius: { xs: 2, md: 2.4 },
                  border: '1px solid',
                  borderColor: 'rgba(194,138,14,0.34)',
                  bgcolor: 'rgba(255,255,255,0.94)',
                  boxShadow: '0 16px 36px rgba(14,22,37,0.22)',
                }}
              >
                <Stack spacing={1}>
                  <Typography component="p" className="store-kicker">
                    Confianca verificada
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Rating value={commentsSummary.averageRating} readOnly precision={0.1} />
                    <Typography variant="body2" sx={{ color: 'secondary.dark', fontWeight: 700 }}>
                      {commentsSummary.averageRating.toFixed(1)} ({commentsSummary.totalReviews})
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack spacing={0.8}>
                    <Stack direction="row" alignItems="center" spacing={0.7}>
                      <VerifiedRoundedIcon size="md" tone="warning" />
                      <Typography variant="body2" color="text.secondary">
                        Base real de avaliacoes e comentarios.
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.7}>
                      <StorefrontRoundedIcon size="md" tone="warning" />
                      <Typography variant="body2" color="text.secondary">
                        Loja fisica em Cascavel para suporte local.
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.7}>
                      <LocalShippingRoundedIcon size="md" tone="warning" />
                      <Typography variant="body2" color="text.secondary">
                        Fiscal e entrega agil para manter sua moto rodando.
                      </Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Stack
            alignItems="center"
            spacing={0.35}
            sx={{ position: 'absolute', zIndex: 2, left: '50%', bottom: 14, transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.92)' }}
          >
            <Box
              component="button"
              type="button"
              className="ds-pressable ds-attention-float"
              onClick={handleScrollToNextSection}
              data-testid="home-next-section-trigger"
              aria-label="Ir para a proxima secao da Home"
              sx={{
                width: 40,
                height: 40,
                borderRadius: '999px',
                display: 'grid',
                placeItems: 'center',
                border: '1px solid',
                borderColor: 'rgba(255,232,186,0.65)',
                bgcolor: 'rgba(255,255,255,0.86)',
                boxShadow: '0 10px 22px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                },
              }}
            >
              <ExpandMoreRoundedIcon size="md" tone="warning" />
            </Box>
            <Typography variant="caption" sx={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Explore a proxima secao
            </Typography>
          </Stack>
          </Paper>
        </MotionReveal>

        <MotionReveal variant="reveal-up" delayMs={80}>
          <Paper
            id="home-next-section"
            ref={nextSectionRef}
            component="section"
            className="store-surface"
            elevation={0}
            sx={{
              p: { xs: 1.7, md: 2.6 },
              position: 'relative',
              overflow: 'hidden',
              background:
                'linear-gradient(95deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.94) 54%, rgba(249,248,245,0.92) 100%)',
            }}
          >
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: { xs: 0, md: '36%' },
              height: '100%',
              opacity: 0.26,
              pointerEvents: 'none',
              display: { xs: 'none', md: 'block' },
            }}
          >
            <Box
              component="img"
              src={workshopBackdropUrl}
              alt=""
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>

          <SectionHeading
            kicker="Institucional"
            title="Por que escolher a Rodando"
            subtitle="Combinamos estoque estrategico, atendimento especializado e estrutura local para reduzir duvidas e acelerar sua compra."
          />
          <Grid container spacing={{ xs: 1.6, md: 1.9 }} sx={{ position: 'relative', zIndex: 1 }}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Grid container spacing={1.6}>
                {pillars.map((pillar) => {
                  const Icon = pillar.icon
                  return (
                    <Grid key={pillar.title} size={{ xs: 12, sm: 6 }}>
                      <Paper elevation={0} className="store-surface ds-hover-lift" sx={{ p: 1.6, bgcolor: 'rgba(255,255,255,0.92)', height: '100%' }}>
                        <Stack spacing={0.9}>
                          <Box
                            sx={{
                              width: 42,
                              height: 42,
                              borderRadius: 2.4,
                              display: 'grid',
                              placeItems: 'center',
                              bgcolor: 'rgba(194,138,14,0.15)',
                            }}
                          >
                            <Icon tone="warning" size="md" />
                          </Box>
                          <Typography component="p" variant="subtitle1" sx={{ fontWeight: 700 }}>
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
            </Grid>
    
          </Grid>
          </Paper>
        </MotionReveal>

        <MotionReveal variant="reveal-up" delayMs={120}>
          <Box component="section" id="home-offers" className="store-grid-tight" sx={{ position: 'relative' }}>
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: '0 auto auto 0',
                width: { xs: '100%', md: '48%' },
                height: { xs: 96, md: 128 },
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'rgba(138,115,94,0.2)',
                opacity: 0.22,
                pointerEvents: 'none',
                zIndex: 0,

                backgroundImage: `url(${commercialTextureUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',

                WebkitMaskImage:
                  'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 100%)',
                maskImage:
                  'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 100%)',
              }}
            >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, rgba(243,239,230,0.7) 0%, rgba(243,239,230,0.16) 28%, rgba(243,239,230,0.16) 72%, rgba(243,239,230,0.7) 100%)',
              }}
            />
          </Box>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'flex-start' }}
            spacing={1.4}
            sx={{ mb: 1.8, position: 'relative', zIndex: 1 }}
          >
            <Box>
              <SectionHeading
                kicker="Selecao comercial"
                title="Destaques da semana"
                subtitle="Produtos com alto giro e condicoes de compra imediata."
              />
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" sx={{ alignSelf: { md: 'center' } }}>
              <Button
                className="ds-pressable ds-action-glint"
                component={RouterLink}
                to="/catalog?promo=true&sort=discount-desc"
                variant="outlined"
                color="secondary"
                sx={{ minHeight: 44, px: 2.4, whiteSpace: 'nowrap' }}
              >
                Ver promocoes
              </Button>
              <Button
                className="ds-pressable ds-link-slide"
                component={RouterLink}
                to="/catalog"
                variant="text"
                color="primary"
                sx={{ minHeight: 44, px: 2.2, whiteSpace: 'nowrap' }}
              >
                Catalogo completo
              </Button>
            </Stack>
          </Stack>

          {highlightsError ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {highlightsError}
            </Alert>
          ) : null}

          <Grid container spacing={1.7}>
            {highlightsQuery.isLoading
              ? Array.from({ length: highlightsPerRow }).map((_, index) => (
                  <Grid key={`card-skeleton-${index}`} size={{ xs: 12, sm: 6, xl: 3 }}>
                    <Paper elevation={0} className="store-surface" sx={{ p: 2 }}>
                      <Stack spacing={1.1}>
                        <Skeleton variant="rounded" sx={{ width: '100%', aspectRatio: '4 / 3', borderRadius: 2 }} />
                        <Skeleton variant="text" width={120} />
                        <Skeleton variant="text" width="70%" />
                        <Skeleton variant="rounded" height={44} />
                      </Stack>
                    </Paper>
                  </Grid>
                ))
              : highlights.length === 0 ? (
                  <Grid size={{ xs: 12 }}>
                    <Paper data-testid="home-highlights-empty-state" elevation={0} className="store-surface" sx={{ p: { xs: 1.5, md: 2 } }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Nenhum destaque publico no momento. Confira o catalogo completo ou as promocoes ativas.
                        </Typography>
                        <Button className="ds-pressable ds-action-glint" component={RouterLink} to="/catalog" variant="contained" color="primary" size="small">
                          Ver catalogo
                        </Button>
                      </Stack>
                    </Paper>
                  </Grid>
                ) : (
                    visibleHighlights.map((product) => (
                      <Grid data-testid="home-highlight-card" key={`highlight-${product.id}`} size={{ xs: 12, sm: 6, xl: 3 }}>
                        <ProductCard product={product} />
                      </Grid>
                    ))
                  )}
          </Grid>
          </Box>
        </MotionReveal>

        <MotionReveal variant="reveal-up" delayMs={160}>
          <Paper component="section" className="store-surface" elevation={0} sx={{ p: { xs: 1.7, md: 2.5 }, position: 'relative', overflow: 'hidden' }}>
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              // height: { xs: 78, md: 96 },
              opacity: 0.16,
              width: { xs: '100%', md: '48%' },
              height: { xs: 96, md: 128 },
              pointerEvents: 'none',
              borderBottom: '1px solid',
              borderColor: 'rgba(138,115,94,0.2)',
              zIndex: 0,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
          </Box>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
          <SectionHeading
            kicker="Navegacao rapida"
            title="Categorias para decidir mais rapido"
            subtitle="Acesse direto os grupos com maior demanda e encontre a peca certa em menos tempo."
          />
          {categoriesError ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {categoriesError}
            </Alert>
          ) : null}
          {categoryChips.length === 0 ? (
            <Paper data-testid="home-categories-empty-state" elevation={0} className="store-surface" sx={{ p: 1.4, bgcolor: 'grey.50' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Sem categorias publicas ativas ainda.
                </Typography>
                <Button className="ds-pressable ds-action-glint" component={RouterLink} to="/catalog" variant="contained" color="primary" size="small">
                  Ver catálogo geral
                </Button>
              </Stack>
            </Paper>
          ) : (
            <Grid container spacing={1.2}>
              {categoryChips.map((category, index) => {
                const Icon = pickCategoryIcon(index)
                return (
                  <Grid key={category.name} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Paper
                      component={RouterLink}
                      to={`/catalog?category=${encodeURIComponent(category.name)}`}
                      elevation={0}
                      className="store-surface ds-pressable ds-action-glint"
                      sx={{
                        p: 1.4,
                        textDecoration: 'none',
                        color: 'inherit',
                        minHeight: 80,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.2,
                        borderColor: 'rgba(194,138,14,0.28)',
                        transition: 'transform 170ms ease, box-shadow 220ms ease, border-color 200ms ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          borderColor: 'rgba(194,138,14,0.56)',
                          boxShadow: '0 12px 22px rgba(10,18,33,0.09)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: '999px',
                          bgcolor: 'rgba(194,138,14,0.15)',
                          border: '1px solid',
                          borderColor: 'rgba(194,138,14,0.36)',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon tone="warning" size="md" />
                      </Box>
                      <Stack spacing={0.1} sx={{ minWidth: 0 }}>
                        <Typography component="span" variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 700 }}>
                          {category.name}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary">
                          {category.total} itens
                        </Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                )
              })}
            </Grid>
          )}
          </Box>
          </Paper>
        </MotionReveal>

        <MotionReveal variant="reveal-up" delayMs={200}>
          <Box component="section" className="store-grid-tight">
          <SectionHeading
            kicker="Avaliacoes verificadas"
            title="O que os clientes estao dizendo"
            subtitle="Feedbacks reais para apoiar sua decisao com mais seguranca."
          />
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Rating value={commentsSummary.averageRating} readOnly precision={0.1} />
            <Typography variant="body2" sx={{ color: 'secondary.dark', fontWeight: 700 }}>
              {commentsSummary.averageRating.toFixed(1)} ({commentsSummary.totalReviews} avaliacoes)
            </Typography>
          </Stack>

          {commentsError ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {commentsError}
            </Alert>
          ) : null}

          <Grid container spacing={1.7}>
            {commentsQuery.isLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <Grid key={`comment-skeleton-${index}`} size={{ xs: 12, md: 4 }}>
                    <Paper elevation={0} className="store-surface" sx={{ p: 2 }}>
                      <Skeleton variant="text" width={100} />
                      <Skeleton variant="text" width="100%" />
                      <Skeleton variant="text" width="70%" />
                    </Paper>
                  </Grid>
                ))
              : comments.length === 0 ? (
                  <Grid size={{ xs: 12 }}>
                    <Paper data-testid="home-reviews-empty-state" elevation={0} className="store-surface" sx={{ p: { xs: 1.5, md: 2 } }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Ainda nao existem avaliacoes publicadas por usuarios reais.
                        </Typography>
                        <Button className="ds-pressable ds-action-glint" component={RouterLink} to="/catalog" variant="contained" color="primary" size="small">
                          Avaliar no catálogo
                        </Button>
                      </Stack>
                    </Paper>
                  </Grid>
                ) : (
                    comments.map((review, index) => (
                      <Grid key={review.id} size={{ xs: 12, md: 4 }}>
                        <Paper
                          elevation={0}
                          className="store-surface ds-hover-lift"
                          sx={{ p: 2, height: '100%', animationDelay: `${Math.min(index, 5) * 80}ms` }}
                        >
                          <Stack spacing={1}>
                            <Rating value={review.rating} precision={0.5} readOnly size="small" />
                            <Typography variant="body2" color="text.secondary">
                              "{review.message}"
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Produto: {review.productName}
                            </Typography>
                            <Typography component="p" variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 700 }}>
                              {review.authorName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatCommentDate(review.createdAt)}
                            </Typography>
                          </Stack>
                        </Paper>
                      </Grid>
                    ))
                  )}
          </Grid>

          {comments.length > 0 ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
              <Button className="ds-pressable ds-action-glint" component={RouterLink} to="/catalog" variant="contained" color="primary">
                Avaliar no catálogo
              </Button>
              <Button className="ds-pressable ds-action-glint" component={RouterLink} to="/catalog?promo=true&sort=discount-desc" variant="outlined" color="secondary">
                Ver promocoes ativas
              </Button>
            </Stack>
          ) : null}
          </Box>
        </MotionReveal>

        <MotionReveal variant="reveal-up" delayMs={240}>
          <Box component="section" id="home-contact" data-testid="home-contact-section" className="store-grid-tight">
          <Grid container spacing={{ xs: 1.5, md: 2 }} alignItems="flex-start">
            <Grid size={{ xs: 12, lg: 7 }} sx={{ alignSelf: 'flex-start' }}>
              <Paper elevation={0} className="store-surface ds-hover-lift" sx={{ p: { xs: 1.6, md: 2.5 }, position: 'relative', overflow: 'hidden', alignSelf: 'flex-start' }}>
                <Box
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: { xs: 0, md: '100%' },
                    height: { xs: 0, md: '100%' },
                    opacity: 0.12,
                    display: { xs: 'none', md: 'block' },
                    pointerEvents: 'none',
                    zIndex: 0,
                    backgroundImage: `url(${contactMotoAccentUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                </Box>
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                <SectionHeading
                  kicker="Presenca local"
                  title="Loja física e atendimento comercial"
                  subtitle="Atendimento de segunda a sexta, retirada local e suporte rapido para orcamento e validacao de aplicacao."
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.4 }}>
                  <Button className="ds-pressable ds-action-glint" component="a" href={officialLinks.whatsapp} target="_blank" rel="noreferrer" variant="contained" color="primary" startIcon={<WhatsAppIcon size="sm" />}>
                    Falar com vendedor
                  </Button>
                  <Button className="ds-pressable ds-action-glint" component="a" href={officialLinks.maps} target="_blank" rel="noreferrer" variant="outlined" color="secondary">
                    Abrir no mapa
                  </Button>
                </Stack>
                <Paper elevation={0} className="store-surface" sx={{ p: { xs: 1.4, md: 1.7 }, bgcolor: 'grey.50' }}>
                  <Typography component="p" variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 700, mb: 0.6 }}>
                    Atendimento local com horario comercial
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.4 }}>
                    Seg a Sex: 08h as 18h
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Retirada no balcao e suporte tecnico para compra certa.
                  </Typography>
                </Paper>
                <Paper
                  elevation={0}
                  className="store-surface"
                  sx={{
                    mt: 1.2,
                    p: { xs: 1.25, md: 1.5 },
                    bgcolor: 'rgba(255,255,255,0.92)',
                  }}
                >
                  <Stack spacing={0.55}>
                    <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 700 }}>
                      Suporte para compra sem erro de aplicacao
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Validacao de compatibilidade antes do pedido.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Confirmacao de estoque em tempo real para retirada ou envio.
                    </Typography>
                  </Stack>
                </Paper>
                </Box>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Paper elevation={0} className="store-surface ds-hover-lift" sx={{ p: { xs: 1.2, md: 1.6 } }}>
                <Stack spacing={1.2}>
                  <Box
                    component="a"
                    href={officialLinks.maps}
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      display: 'block',
                      borderRadius: 2.4,
                      border: '1px solid',
                      borderColor: 'divider',
                      overflow: 'hidden',
                      aspectRatio: { xs: '16 / 11', md: '5 / 4' },
                      bgcolor: 'grey.100',
                    }}
                  >
                    <ResponsiveImage
                      src={storeLocationPhotoUrl}
                      alt="Foto da loja física Rodando Moto Center"
                      className="ds-image-pan"
                      sizes="(max-width: 900px) 100vw, 40vw"
                    />
                  </Box>
                  <Paper elevation={0} className="store-surface" sx={{ p: { xs: 1.4, md: 1.8 }, bgcolor: 'grey.50' }}>
                    <Typography variant="overline" sx={{ color: 'secondary.dark', fontWeight: 700 }}>
                      ENDERECO
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 700, mb: 0.8 }}>
                      Av. Brasil, 8708 - Cascavel - PR
                    </Typography>
                    <Divider sx={{ my: 1.2 }} />
                    <Typography variant="body2" color="text.secondary">
                      Telefone: +55 45 3037-5858
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      WhatsApp: +55 45 99934-6779
                    </Typography>
                  </Paper>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
          </Box>
        </MotionReveal>
      </Stack>
    </AppShell>
  )
}

