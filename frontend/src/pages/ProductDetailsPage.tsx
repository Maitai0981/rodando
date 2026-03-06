import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '../layouts/AppShell'
import { api, ApiError, buildProductUrl, parseProductRouteId } from '../lib/api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { AddToCartBar, Alert, Badge, Breadcrumb, Card, MotionReveal, ProductGallery, ProductCard, QuantityStepper, Skeleton, VariantSelector } from '../ui'

const productMediaBackdropUrl =
  'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=1400&q=80'

export default function ProductDetailsPage() {
  const { idSlug = '' } = useParams()
  const navigate = useNavigate()
  const { addProduct } = useCart()
  const { status } = useAuth()

  const parsed = useMemo(() => parseProductRouteId(idSlug), [idSlug])
  const [quantity, setQuantity] = useState(1)
  const [fitment, setFitment] = useState('')

  const detailsQuery = useQuery({
    queryKey: ['product-details', parsed.id],
    enabled: Number.isInteger(parsed.id) && Number(parsed.id) > 0,
    queryFn: () => api.getPublicProduct(Number(parsed.id)),
  })

  const details = detailsQuery.data
  const item = details?.item
  const safeFitmentOptions = useMemo(
    () => {
      const options = details?.compatibility?.fitments ?? []
      return options.length > 0 ? options : [{ label: 'Aplicacao padrao', value: 'default' }]
    },
    [details?.compatibility?.fitments],
  )

  useEffect(() => {
    if (!item) return
    const canonical = buildProductUrl(item)
    if (canonical !== `/produto/${idSlug}`) {
      navigate(canonical, { replace: true })
    }
  }, [idSlug, item, navigate])

  useEffect(() => {
    if (!safeFitmentOptions.length) return
    setFitment((current) => current || safeFitmentOptions[0].value)
  }, [safeFitmentOptions])

  const relatedQuery = useQuery({
    queryKey: ['product-related', item?.id, item?.category],
    enabled: Boolean(item?.id),
    queryFn: async () => {
      const result = await api.listPublicProducts({
        category: item?.category || undefined,
        sort: 'best-sellers',
        page: 1,
        pageSize: 4,
      })
      return result.items.filter((product) => Number(product.id) !== Number(item?.id)).slice(0, 3)
    },
  })

  async function handleAddToCart() {
    if (!item) return
    await addProduct(item, quantity)
  }

  async function handleBuyNow() {
    if (!item) return
    await addProduct(item, quantity)
    if (status !== 'authenticated') {
      navigate('/auth?returnTo=/checkout')
      return
    }
    navigate('/checkout')
  }

  return (
    <AppShell contained={false}>
      <Stack spacing={{ xs: 2, md: 3 }}>
        <MotionReveal variant="reveal-fade">
          <Card variant="feature">
            <Stack spacing={1}>
              <Breadcrumb>
                <Typography component={RouterLink} to="/" variant="body2" color="text.secondary">Inicio</Typography>
                <Typography component={RouterLink} to="/catalog" variant="body2" color="text.secondary">Catalogo</Typography>
                <Typography variant="body2" color="text.primary">Produto</Typography>
              </Breadcrumb>
            </Stack>
          </Card>
        </MotionReveal>

        {!Number.isInteger(parsed.id) || Number(parsed.id) <= 0 ? (
          <Alert tone="error" title="Produto invalido">
            Nao foi possivel identificar o produto solicitado.
          </Alert>
        ) : null}

        {detailsQuery.error instanceof ApiError ? (
          <Alert tone="error" title="Produto indisponivel">
            {detailsQuery.error.message}
          </Alert>
        ) : null}

        {detailsQuery.isLoading ? (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Skeleton variant="rect" height={420} />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={1}>
                <Skeleton width="60%" />
                <Skeleton width="100%" />
                <Skeleton width="80%" />
                <Skeleton variant="rect" height={180} />
              </Stack>
            </Grid>
          </Grid>
        ) : item && details ? (
          <Grid container spacing={2.2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <MotionReveal variant="reveal-left" delayMs={70}>
                <Card
                  variant="feature"
                  className="ds-hover-lift"
                  sx={{
                    p: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    borderColor: 'rgba(138,115,94,0.34)',
                  }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0.18,
                      pointerEvents: 'none',
                    }}
                  >
                    <Box component="img" src={productMediaBackdropUrl} alt="" className="ds-image-pan" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <ProductGallery
                      mainUrl={details.gallery.mainUrl || item.imageUrl}
                      hoverUrl={details.gallery.hoverUrl || item.hoverImageUrl}
                      extra={details.gallery.extra}
                      alt={item.name}
                    />
                  </Box>
                </Card>
              </MotionReveal>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <MotionReveal variant="reveal-right" delayMs={100}>
                <Stack spacing={1.4}>
                <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap">
                  <Badge label={item.category} tone="neutral" />
                  {details.pricing.discountPercent > 0 ? (
                    <Badge label={`${details.pricing.discountPercent}% OFF`} tone="gold" />
                  ) : null}
                  {details.availability.urgencyLabel ? (
                    <Badge label={details.availability.urgencyLabel} tone="warning" />
                  ) : null}
                </Stack>

                <Typography variant="h3">
                  {item.name}
                </Typography>

                <Typography variant="body1" color="text.secondary">
                  {item.manufacturer} • {details.compatibility.bikeModel}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>

                <Divider />

                <VariantSelector
                  label="Compatibilidade"
                  value={fitment}
                  onChange={setFitment}
                  options={safeFitmentOptions}
                />

                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2" color="text.secondary">Quantidade</Typography>
                  <QuantityStepper value={quantity} min={1} max={Math.max(1, Number(item.stock || 1))} onChange={setQuantity} />
                </Stack>

                <AddToCartBar
                  price={Number(details.pricing.price)}
                  compareAtPrice={details.pricing.compareAtPrice}
                  disabled={Number(item.stock) <= 0}
                  onAddToCart={() => void handleAddToCart()}
                  onBuyNow={() => void handleBuyNow()}
                />

                <Card variant="surface" className="ds-hover-lift" sx={{ p: 1.2 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2">Confianca de compra</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avaliacao media {details.socialProof.averageRating.toFixed(1)} com {details.socialProof.totalReviews} comentario(s).
                    </Typography>
                    <Typography variant="caption" color="text.secondary">SKU: {item.sku}</Typography>
                  </Stack>
                </Card>
                </Stack>
              </MotionReveal>
            </Grid>
          </Grid>
        ) : null}

        {relatedQuery.data && relatedQuery.data.length > 0 ? (
          <MotionReveal variant="reveal-up" delayMs={140}>
            <Stack spacing={1.2}>
            <Typography variant="h5">Relacionados</Typography>
            <Grid container spacing={2}>
              {relatedQuery.data.map((related) => (
                <Grid key={related.id} size={{ xs: 12, md: 4 }}>
                  <ProductCard
                    product={related}
                    onOpenDetails={() => navigate(buildProductUrl(related))}
                    onAddToCart={() => void addProduct(related, 1)}
                    testIdPrefix="pdp-related"
                  />
                </Grid>
              ))}
            </Grid>
            </Stack>
          </MotionReveal>
        ) : null}
      </Stack>
    </AppShell>
  )
}
