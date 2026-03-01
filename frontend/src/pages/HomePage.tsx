import { useEffect, useMemo } from 'react'
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
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded'
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '../layouts/AppShell'
import { formatCurrency } from '../lib'
import { api, ApiError, type Product } from '../lib/api'
import { useAssist } from '../context/AssistContext'
import { AssistHintInline } from '../components/assist'

const officialLinks = {
  maps:
    'https://www.google.com/maps/place/Rodando+Moto+Center/@-24.9539372,-53.4823137,17z/data=!3m1!4b1!4m6!3m5!1s0x94f3d6abd0f76d39:0x4c1de863cd816ba6!8m2!3d-24.9539372!4d-53.4823137!16s%2Fg%2F1thnpyhg?entry=ttu&g_ep=EgoyMDI2MDIyMi4wIKXMDSoASAFQAw%3D%3D',
  whatsapp: 'https://wa.me/5545999346779',
}
const storeLocationPhotoUrl =
  'https://lh3.googleusercontent.com/p/AF1QipOIJtyawLBJXkAdD3-zjal0bL54xaGKNWe2KFkU=w408-h544-k-no'

function formatCommentDate(isoDate: string) {
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('pt-BR')
}

function resolveUrgency(product: Product) {
  const stock = Number(product.stock || 0)
  if (stock <= 3) return 'Últimas unidades'
  if (product.offerEndsAt) return 'Oferta por tempo limitado'
  return null
}

function ProductCard({ product }: { product: Product }) {
  const urgency = resolveUrgency(product)

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.2,
        transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: 'primary.main',
          boxShadow: '0 8px 24px rgba(15,23,42,0.16)',
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          aspectRatio: '4 / 3',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'grey.100',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          component="img"
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 260ms ease, opacity 200ms ease',
            '.MuiPaper-root:hover &': {
              transform: product.hoverImageUrl ? 'scale(1.03)' : 'scale(1.05)',
              opacity: product.hoverImageUrl ? 0 : 1,
            },
          }}
        />
        {product.hoverImageUrl ? (
          <Box
            component="img"
            src={product.hoverImageUrl}
            alt={`${product.name} detalhe`}
            loading="lazy"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0,
              transition: 'opacity 220ms ease',
              '.MuiPaper-root:hover &': {
                opacity: 1,
              },
            }}
          />
        ) : null}
      </Box>

      <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
        <Chip size="small" label={product.category} variant="outlined" color="secondary" />
        {product.discountPercent ? <Chip size="small" label={`${product.discountPercent}% OFF`} color="warning" /> : null}
        {urgency ? <Chip size="small" label={urgency} color="primary" icon={<AccessTimeRoundedIcon sx={{ fontSize: 16 }} />} /> : null}
      </Stack>

      <Typography component="p" variant="h6" sx={{ color: 'text.primary', fontSize: '1.25rem', lineHeight: 1.15 }}>
        {product.name}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {product.manufacturer} • {product.bikeModel}
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

      <Button component={RouterLink} to={`/catalog?q=${encodeURIComponent(product.name)}`} variant="contained" color="primary" sx={{ minHeight: 44 }}>
        Comprar / Orçar
      </Button>
    </Paper>
  )
}

export default function HomePage() {
  const theme = useTheme()
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'))
  const isXlUp = useMediaQuery(theme.breakpoints.up('xl'))
  const { completeStep } = useAssist()
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
  const visibleHighlights = useMemo(
    () => highlights.slice(0, highlightsPerRow),
    [highlights, highlightsPerRow],
  )
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
    if (!commentsQuery.isSuccess) return
    completeStep('social-proof-viewed', 'home')
  }, [commentsQuery.isSuccess, completeStep])

  return (
    <AppShell
      contained={false}
      mainProps={{
        pb: { xs: 4.2, md: 6.5 },
      }}
    >
      <Stack spacing={{ xs: 2.2, md: 3.4 }}>
        <Paper
          component="section"
          data-testid="home-hero-section"
          className="mobile-premium-hero"
          elevation={0}
          sx={{
            p: { xs: 1.6, sm: 1.9, md: 2.5 },
            borderRadius: { xs: 3, md: 4 },
            border: '1px solid',
            borderColor: { xs: 'divider', md: 'divider' },
            bgcolor: { xs: 'transparent', md: 'background.paper' },
            backgroundImage: { xs: 'none', md: 'none' },
          }}
        >
          <Grid container spacing={{ xs: 1.4, md: 2.8 }} alignItems="center">
            <Grid size={{ xs: 12, lg: 8 }}>
              <Stack spacing={{ xs: 0.95, md: 1.2 }}>
                <Typography component="p" variant="subtitle2" className="mobile-premium-kicker" sx={{ color: { xs: 'secondary.dark', md: 'info.main' } }}>
                  Loja física, operação local e atendimento técnico
                </Typography>
                <Typography
                  component="h1"
                  sx={{
                    fontFamily: '"Sora", "Manrope", "Space Grotesk", sans-serif',
                    fontSize: {
                      xs: 'clamp(1.9rem, 8vw, 2.45rem)',
                      sm: 'clamp(2.1rem, 6vw, 2.85rem)',
                      md: 'clamp(2.2rem, 3.5vw, 3.15rem)',
                    },
                    lineHeight: { xs: 1.03, sm: 1.05, md: 1.06 },
                    letterSpacing: '-0.03em',
                    color: { xs: 'text.primary', md: 'text.primary' },
                    maxWidth: { xs: '100%', md: 700 },
                  }}
                >
                  Peças certas para a sua moto, com compra segura e suporte de verdade.
                </Typography>
                <Typography
                    variant="body1"
                  color="text.secondary"
                  sx={{
                    maxWidth: { xs: '100%', md: 590 },
                    color: { xs: 'text.secondary', md: 'text.secondary' },
                  }}
                >
                  Compare aplicações, valide compatibilidade e feche seu pedido com atendimento comercial direto.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.8, sm: 1.1 }}>
                  <Button
                    data-testid="home-catalog-cta"
                    component={RouterLink}
                    to="/catalog"
                    onClick={() => completeStep('open-catalog', 'home')}
                    variant="contained"
                    color="primary"
                    sx={{ minHeight: 45, width: { xs: '100%', sm: 'auto' } }}
                  >
                    Ver catálogo
                  </Button>
                  <Button
                    data-testid="home-whatsapp-cta"
                    component="a"
                    href={officialLinks.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    variant="outlined"
                    color="primary"
                    startIcon={<WhatsAppIcon />}
                    sx={{ minHeight: 45, width: { xs: '100%', sm: 'auto' } }}
                  >
                    Falar no WhatsApp
                  </Button>
                </Stack>
                <AssistHintInline tipId="home-tip-search" routeKey="home">
                  Dica: use a busca do topo para encontrar produto por nome, categoria ou SKU.
                </AssistHintInline>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 1.4, sm: 1.7, md: 1.8 },
                  borderRadius: { xs: 2.4, md: 3 },
                  border: '1px solid',
                  borderColor: { xs: 'divider', md: 'divider' },
                  bgcolor: { xs: 'rgba(255,255,255,0.88)', md: 'grey.50' },
                }}
              >
                <Typography component="p" variant="subtitle2" sx={{ color: { xs: 'text.secondary', md: 'text.secondary' }, mb: 0.8 }}>
                  Prova social verificada
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }}>
                  <Rating value={commentsSummary.averageRating} readOnly precision={0.1} />
                  <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 700 }}>
                    {commentsSummary.averageRating.toFixed(1)} ({commentsSummary.totalReviews})
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ color: { xs: 'text.secondary', md: 'text.secondary' } }}>
                  Média e avaliações publicadas por clientes reais, sem dados simulados.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>

        <Box component="section" id="home-offers">
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.4} sx={{ mb: 1.8 }}>
            <Box>
              <Typography component="p" variant="subtitle2" sx={{ color: 'info.main', mb: 0.4 }}>
                Seleção comercial
              </Typography>
              <Typography
                component="h2"
                variant="h3"
                sx={{ color: 'secondary.dark', fontSize: { xs: 'clamp(1.72rem, 8vw, 2.3rem)', md: 'clamp(2rem, 3.1vw, 3.1rem)' } }}
              >
                Destaques da semana
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Itens com maior giro e melhor condição para compra imediata.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button component={RouterLink} to="/catalog?promo=true&sort=discount-desc" variant="outlined" color="secondary" sx={{ minHeight: 44 }}>
                Ver promoções
              </Button>
              <Button component={RouterLink} to="/catalog" variant="text" color="primary" sx={{ minHeight: 44 }}>
                Ver catálogo completo
              </Button>
            </Stack>
          </Stack>

          {highlightsError ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {highlightsError}
            </Alert>
          ) : null}

          <Grid container spacing={2}>
            {highlightsQuery.isLoading
              ? Array.from({ length: highlightsPerRow }).map((_, index) => (
                  <Grid key={`card-skeleton-${index}`} size={{ xs: 12, sm: 6, xl: 3 }}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
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
                    <Paper
                      data-testid="home-highlights-empty-state"
                      elevation={0}
                      sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                    >
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.2}
                        alignItems={{ sm: 'center' }}
                        justifyContent="space-between"
                      >
                        <Typography variant="body2" color="text.secondary">
                          Nenhum destaque público no momento. Confira o catálogo completo ou as promoções ativas.
                        </Typography>
                        <Button component={RouterLink} to="/catalog" variant="contained" color="primary" size="small">
                          Ver catálogo
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

        <Paper component="section" className="mobile-premium-card" elevation={0} sx={{ p: { xs: 1.6, md: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1.2} sx={{ mb: 2 }}>
            <Typography component="p" variant="subtitle2" sx={{ color: 'info.main' }}>
              Navegação rápida
            </Typography>
            <Typography
              component="h2"
              variant="h3"
              sx={{ color: 'secondary.dark', fontSize: { xs: 'clamp(1.72rem, 8vw, 2.25rem)', md: 'clamp(2rem, 3.1vw, 3rem)' } }}
            >
              Categorias para compra rápida
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Entre direto na categoria certa e reduza tempo de busca.
            </Typography>
          </Stack>
          {categoriesError ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {categoriesError}
            </Alert>
          ) : null}
          {categoryChips.length === 0 ? (
            <Paper
              data-testid="home-categories-empty-state"
              elevation={0}
              sx={{ p: 1.4, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Sem categorias públicas ativas ainda.
                </Typography>
                <Button component={RouterLink} to="/catalog" variant="contained" color="primary" size="small">
                  Ver catálogo geral
                </Button>
              </Stack>
            </Paper>
          ) : (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {categoryChips.map((category) => (
                <Chip
                  key={category.name}
                  component={RouterLink}
                  to={`/catalog?category=${encodeURIComponent(category.name)}`}
                  clickable
                  label={`${category.name} (${category.total})`}
                  icon={<CategoryRoundedIcon sx={{ fontSize: 18 }} />}
                  variant="outlined"
                  color="secondary"
                />
              ))}
            </Stack>
          )}
        </Paper>

        <Paper component="section" className="mobile-premium-card" elevation={0} sx={{ p: { xs: 1.6, md: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Typography component="p" variant="subtitle2" sx={{ color: 'info.main' }}>
              Estrutura e suporte
            </Typography>
            <Typography
              component="h2"
              variant="h3"
              sx={{ color: 'secondary.dark', fontSize: { xs: 'clamp(1.72rem, 8vw, 2.25rem)', md: 'clamp(2rem, 3.1vw, 3rem)' } }}
            >
              Por que comprar aqui?
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Operação local com atendimento direto e entrega previsível.
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            {[
              { title: 'Loja física', note: 'Retirada no balcão com suporte local.', icon: StorefrontRoundedIcon },
              { title: 'Entrega ágil', note: 'Despacho rápido para reduzir parada.', icon: LocalShippingRoundedIcon },
              { title: 'Garantia real', note: 'Produtos com procedência e política clara.', icon: VerifiedRoundedIcon },
              { title: 'Suporte especializado', note: 'Equipe pronta para orientar a compra.', icon: SupportAgentRoundedIcon },
            ].map((pillar) => {
              const Icon = pillar.icon
              return (
                <Grid key={pillar.title} size={{ xs: 12, sm: 6, lg: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 1.6, md: 2 },
                      borderRadius: 2.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'grey.50',
                      minHeight: { xs: 'auto', md: 170 },
                    }}
                  >
                    <Stack spacing={{ xs: 0.8, md: 1 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(194,138,14,0.16)' }}>
                        <Icon sx={{ color: 'secondary.dark' }} />
                      </Box>
                      <Typography component="p" variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 700 }}>
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

        <Box component="section">
          <Stack spacing={0.8} sx={{ mb: 2 }}>
            <Typography component="p" variant="subtitle2" sx={{ color: 'info.main' }}>
              Opiniões verificadas
            </Typography>
            <Typography
              component="h2"
              variant="h3"
              sx={{ color: 'secondary.dark', fontSize: { xs: 'clamp(1.72rem, 8vw, 2.25rem)', md: 'clamp(2rem, 3.1vw, 3rem)' } }}
            >
              Avaliações recentes
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Rating value={commentsSummary.averageRating} readOnly precision={0.1} />
              <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 700 }}>
                {commentsSummary.averageRating.toFixed(1)} ({commentsSummary.totalReviews} avaliações)
              </Typography>
            </Stack>
          </Stack>

          {commentsError ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {commentsError}
            </Alert>
          ) : null}

          <Grid container spacing={2}>
            {commentsQuery.isLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <Grid key={`comment-skeleton-${index}`} size={{ xs: 12, md: 4 }}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                      <Skeleton variant="text" width={100} />
                      <Skeleton variant="text" width="100%" />
                      <Skeleton variant="text" width="70%" />
                    </Paper>
                  </Grid>
                ))
              : comments.length === 0 ? (
                  <Grid size={{ xs: 12 }}>
                    <Paper
                      data-testid="home-reviews-empty-state"
                      elevation={0}
                      sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                    >
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.2}
                        alignItems={{ sm: 'center' }}
                        justifyContent="space-between"
                      >
                        <Typography variant="body2" color="text.secondary">
                          Ainda não existem avaliações publicadas por usuários reais.
                        </Typography>
                        <Button component={RouterLink} to="/catalog" variant="contained" color="primary" size="small">
                          Avaliar no catálogo
                        </Button>
                      </Stack>
                    </Paper>
                  </Grid>
                ) : (
                    comments.map((review) => (
                      <Grid key={review.id} size={{ xs: 12, md: 4 }}>
                        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
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
                <Button component={RouterLink} to="/catalog" variant="contained" color="primary">
                Avaliar no catálogo
              </Button>
              <Button component={RouterLink} to="/catalog?promo=true&sort=discount-desc" variant="outlined" color="secondary">
                Ver promoções ativas
              </Button>
            </Stack>
          ) : null}
        </Box>

        <Box component="section" id="home-contact" data-testid="home-contact-section">
          <Grid container spacing={{ xs: 1.5, md: 2 }} alignItems="flex-start">
            <Grid size={{ xs: 12, lg: 7 }}>
              <Paper elevation={0} sx={{ p: { xs: 1.6, md: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Stack spacing={{ xs: 1, md: 1.2 }}>
                  <Typography component="p" variant="subtitle2" sx={{ color: 'info.main' }}>
                    Presença local
                  </Typography>
                  <Typography
                    component="h2"
                    variant="h3"
                    sx={{ color: 'secondary.dark', fontSize: { xs: 'clamp(1.7rem, 7.6vw, 2.2rem)', md: 'clamp(1.9rem, 3vw, 2.8rem)' } }}
                  >
                    Loja física e atendimento comercial
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Atendimento de segunda a sexta, retirada local e suporte rápido para orçamento.
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button component="a" href={officialLinks.whatsapp} target="_blank" rel="noreferrer" variant="contained" color="primary" startIcon={<WhatsAppIcon />}>
                      Falar com vendedor
                    </Button>
                    <Button component="a" href={officialLinks.maps} target="_blank" rel="noreferrer" variant="outlined" color="secondary">
                      Abrir no mapa
                    </Button>
                  </Stack>
                  <Paper elevation={0} sx={{ p: { xs: 1.4, md: 1.8 }, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                    <Typography component="p" variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 700, mb: 0.6 }}>
                      Atendimento local com horário comercial
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.4 }}>
                      Seg a Sex: 08h às 18h
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Retirada no balcão e suporte técnico para compra certa.
                    </Typography>
                  </Paper>
                </Stack>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Paper elevation={0} sx={{ p: { xs: 1.2, md: 1.6 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Stack spacing={1.3}>
                  <Box
                    component="a"
                    href={officialLinks.maps}
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      display: 'block',
                      borderRadius: 2.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      overflow: 'hidden',
                      aspectRatio: { xs: '16 / 11', md: '5 / 4' },
                      bgcolor: 'grey.100',
                    }}
                  >
                    <Box
                      component="img"
                      src={storeLocationPhotoUrl}
                      alt="Foto da loja física Rodando Moto Center"
                      loading="lazy"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 220ms ease',
                        '&:hover': { transform: 'scale(1.02)' },
                      }}
                    />
                  </Box>

                  <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                    <Typography variant="overline" sx={{ color: 'secondary.dark', fontWeight: 700 }}>ENDEREÇO</Typography>
                    <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>
                      Av. Brasil, 8708 - Cascavel - PR
                    </Typography>
                    <Divider sx={{ my: 1.4 }} />
                    <Typography variant="body2" color="text.secondary">Telefone: +55 45 3037-5858</Typography>
                    <Typography variant="body2" color="text.secondary">WhatsApp: +55 45 99934-6779</Typography>
                  </Paper>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Stack>
    </AppShell>
  )
}
