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

const pillars = [
  { title: 'Loja fisica ativa', note: 'Retirada no balcao e apoio tecnico presencial.', icon: StorefrontRoundedIcon },
  { title: 'Entrega agil', note: 'Despacho rapido para reduzir tempo de moto parada.', icon: LocalShippingRoundedIcon },
  { title: 'Garantia real', note: 'Procedencia validada e politica comercial transparente.', icon: VerifiedRoundedIcon },
  { title: 'Consultoria tecnica', note: 'Equipe orienta aplicacao antes da compra.', icon: SupportAgentRoundedIcon },
]

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
      <Typography component="p" className="home-luxe-kicker">
        {kicker}
      </Typography>
      <Typography component="h2" className="home-luxe-title">
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

  return (
    <Paper className="home-luxe-surface home-luxe-card home-luxe-appear" elevation={0} sx={{ height: '100%', p: 2.1 }}>
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
          <Box
            component="img"
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 260ms ease, opacity 220ms ease',
              '.home-luxe-card:hover &': {
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
                '.home-luxe-card:hover &': {
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

        <Typography component="p" variant="h6" sx={{ fontSize: '1.24rem', lineHeight: 1.15 }}>
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

        <Button component={RouterLink} to={`/catalog?q=${encodeURIComponent(product.name)}`} variant="contained" color="primary">
          Comprar / Orcar
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
    if (!commentsQuery.isSuccess) return
    completeStep('social-proof-viewed', 'home')
  }, [commentsQuery.isSuccess, completeStep])

  return (
    <AppShell
      contained={false}
      mainProps={{
        className: 'home-luxe-main',
        pb: { xs: 4.6, md: 6.8 },
      }}
    >
      <Stack spacing={{ xs: 2.4, md: 3.8 }}>
        <Paper component="section" data-testid="home-hero-section" className="home-luxe-hero home-luxe-surface home-luxe-appear" elevation={0}>
          <Grid container spacing={{ xs: 2.2, md: 3.2 }} alignItems="center">
            <Grid size={{ xs: 12, lg: 7.5 }}>
              <Stack spacing={1.2}>
                <Typography component="p" className="home-luxe-kicker">
                  Rodando Moto Center
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 620 }}>
                  Operacao local, consultoria tecnica e atendimento comercial rapido para uma compra segura, direta e sem erro de aplicacao.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.1}>
                  <Button
                    data-testid="home-catalog-cta"
                    component={RouterLink}
                    to="/catalog"
                    onClick={() => completeStep('open-catalog', 'home')}
                    variant="contained"
                    color="primary"
                    sx={{ minHeight: 47, width: { xs: '100%', sm: 'auto' } }}
                  >
                    Ver catalogo
                  </Button>
                  <Button
                    data-testid="home-whatsapp-cta"
                    component="a"
                    href={officialLinks.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    variant="outlined"
                    color="secondary"
                    startIcon={<WhatsAppIcon />}
                    sx={{ minHeight: 47, width: { xs: '100%', sm: 'auto' } }}
                  >
                    Atendimento via WhatsApp
                  </Button>
                </Stack>
                <AssistHintInline tipId="home-tip-search" routeKey="home">
                  Dica: use a busca do topo para encontrar produto por nome, categoria ou SKU.
                </AssistHintInline>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 4.5 }}>
              <Paper elevation={0} className="home-luxe-surface" sx={{ p: { xs: 1.6, md: 2 }, bgcolor: 'rgba(255,255,255,0.82)' }}>
                <Stack spacing={1.1}>
                  <Typography component="p" className="home-luxe-kicker">
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
                      <VerifiedRoundedIcon sx={{ fontSize: 18, color: 'secondary.dark' }} />
                      <Typography variant="body2" color="text.secondary">Base real de avaliacoes e comentarios.</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.7}>
                      <StorefrontRoundedIcon sx={{ fontSize: 18, color: 'secondary.dark' }} />
                      <Typography variant="body2" color="text.secondary">Loja fisica em Cascavel para suporte local.</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.7}>
                      <LocalShippingRoundedIcon sx={{ fontSize: 18, color: 'secondary.dark' }} />
                      <Typography variant="body2" color="text.secondary">Fluxo de entrega agil para manter sua moto rodando.</Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Paper>

        <Paper component="section" className="home-luxe-surface home-luxe-appear" elevation={0} sx={{ p: { xs: 1.7, md: 2.6 } }}>
          <SectionHeading
            kicker="Institucional"
            title="Por que escolher a Rodando"
            subtitle="Combinamos estoque estrategico, atendimento especializado e estrutura local para reduzir duvidas e acelerar sua compra."
          />
          <Grid container spacing={1.6}>
            {pillars.map((pillar) => {
              const Icon = pillar.icon
              return (
                <Grid key={pillar.title} size={{ xs: 12, sm: 6, xl: 3 }}>
                  <Paper elevation={0} className="home-luxe-surface" sx={{ p: 1.6, bgcolor: 'rgba(255,255,255,0.72)', height: '100%' }}>
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
                        <Icon sx={{ color: 'secondary.dark' }} />
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
        </Paper>

        <Box component="section" id="home-offers" className="home-luxe-appear">
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.4} sx={{ mb: 1.8 }}>
            <Box>
              <SectionHeading
                kicker="Selecao comercial"
                title="Destaques da semana"
                subtitle="Produtos com alto giro e condicoes de compra imediata."
              />
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button component={RouterLink} to="/catalog?promo=true&sort=discount-desc" variant="outlined" color="secondary">
                Ver promocoes
              </Button>
              <Button component={RouterLink} to="/catalog" variant="text" color="primary">
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
                    <Paper elevation={0} className="home-luxe-surface" sx={{ p: 2 }}>
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
                    <Paper data-testid="home-highlights-empty-state" elevation={0} className="home-luxe-surface" sx={{ p: { xs: 1.5, md: 2 } }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Nenhum destaque publico no momento. Confira o catalogo completo ou as promocoes ativas.
                        </Typography>
                        <Button component={RouterLink} to="/catalog" variant="contained" color="primary" size="small">
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

        <Paper component="section" className="home-luxe-surface home-luxe-appear" elevation={0} sx={{ p: { xs: 1.7, md: 2.5 } }}>
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
            <Paper data-testid="home-categories-empty-state" elevation={0} className="home-luxe-surface" sx={{ p: 1.4, bgcolor: 'grey.50' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Sem categorias publicas ativas ainda.
                </Typography>
                <Button component={RouterLink} to="/catalog" variant="contained" color="primary" size="small">
                  Ver catalogo geral
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

        <Box component="section" className="home-luxe-appear">
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
                    <Paper elevation={0} className="home-luxe-surface" sx={{ p: 2 }}>
                      <Skeleton variant="text" width={100} />
                      <Skeleton variant="text" width="100%" />
                      <Skeleton variant="text" width="70%" />
                    </Paper>
                  </Grid>
                ))
              : comments.length === 0 ? (
                  <Grid size={{ xs: 12 }}>
                    <Paper data-testid="home-reviews-empty-state" elevation={0} className="home-luxe-surface" sx={{ p: { xs: 1.5, md: 2 } }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Ainda nao existem avaliacoes publicadas por usuarios reais.
                        </Typography>
                        <Button component={RouterLink} to="/catalog" variant="contained" color="primary" size="small">
                          Avaliar no catalogo
                        </Button>
                      </Stack>
                    </Paper>
                  </Grid>
                ) : (
                    comments.map((review, index) => (
                      <Grid key={review.id} size={{ xs: 12, md: 4 }}>
                        <Paper
                          elevation={0}
                          className="home-luxe-surface home-luxe-appear"
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
              <Button component={RouterLink} to="/catalog" variant="contained" color="primary">
                Avaliar no catalogo
              </Button>
              <Button component={RouterLink} to="/catalog?promo=true&sort=discount-desc" variant="outlined" color="secondary">
                Ver promocoes ativas
              </Button>
            </Stack>
          ) : null}
        </Box>

        <Box component="section" id="home-contact" data-testid="home-contact-section" className="home-luxe-appear">
          <Grid container spacing={{ xs: 1.5, md: 2 }} alignItems="stretch">
            <Grid size={{ xs: 12, lg: 7 }}>
              <Paper elevation={0} className="home-luxe-surface" sx={{ p: { xs: 1.6, md: 2.5 }, height: '100%' }}>
                <SectionHeading
                  kicker="Presenca local"
                  title="Loja fisica e atendimento comercial direto"
                  subtitle="Atendimento de segunda a sexta, retirada local e suporte rapido para orcamento e validacao de aplicacao."
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.4 }}>
                  <Button component="a" href={officialLinks.whatsapp} target="_blank" rel="noreferrer" variant="contained" color="primary" startIcon={<WhatsAppIcon />}>
                    Falar com vendedor
                  </Button>
                  <Button component="a" href={officialLinks.maps} target="_blank" rel="noreferrer" variant="outlined" color="secondary">
                    Abrir no mapa
                  </Button>
                </Stack>
                <Paper elevation={0} className="home-luxe-surface" sx={{ p: { xs: 1.4, md: 1.7 }, bgcolor: 'grey.50' }}>
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
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Paper elevation={0} className="home-luxe-surface" sx={{ p: { xs: 1.2, md: 1.6 }, height: '100%' }}>
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
                    <Box
                      component="img"
                      src={storeLocationPhotoUrl}
                      alt="Foto da loja fisica Rodando Moto Center"
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
                  <Paper elevation={0} className="home-luxe-surface" sx={{ p: { xs: 1.4, md: 1.8 }, bgcolor: 'grey.50' }}>
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
      </Stack>
    </AppShell>
  )
}
