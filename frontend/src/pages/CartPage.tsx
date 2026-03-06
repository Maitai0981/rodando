import { useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '../layouts/AppShell'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../lib'
import { api, type Product } from '../lib/api'
import { ActionGuardDialog } from '../components/assist'
import { Button, Card, MotionReveal, ResponsiveImage } from '../ui'
import { prefetchRouteChunk } from '../routes/prefetch'

const cartHeaderBackdropUrl =
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1400&q=80'

function RecommendationCard({ product }: { product: Product }) {
  const { addProduct } = useCart()

  return (
    <Card variant="surface" interactive sx={{ p: 1.4 }}>
      <Stack spacing={1}>
        <Box sx={{ borderRadius: 2, overflow: 'hidden', height: 120, border: '1px solid', borderColor: 'divider', bgcolor: 'grey.100' }}>
          <ResponsiveImage src={product.imageUrl} alt={product.name} sizes="(max-width: 600px) 100vw, 25vw" />
        </Box>
        <Typography component="p" variant="subtitle2" sx={{ lineHeight: 1.2 }}>{product.name}</Typography>
        <Typography variant="body2" color="text.secondary">{formatCurrency(Number(product.price))}</Typography>
        <Button data-testid={`cart-rec-add-${product.id}`} variant="outline" size="sm" onClick={() => void addProduct(product, 1)}>
          Adicionar
        </Button>
      </Stack>
    </Card>
  )
}

export default function CartPage() {
  const navigate = useNavigate()
  const { status } = useAuth()
  const { items, total, itemCount, loading, updateQty, removeItem, clear } = useCart()
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const queryClient = useQueryClient()

  const recommendationQuery = useQuery({
    queryKey: ['cart-recommendations', items.map((item) => item.productId).join(',')],
    queryFn: () => api.listCatalogRecommendations({ limit: 4, exclude: items.map((item) => item.productId) }),
  })

  const recommendations = useMemo(() => recommendationQuery.data?.items ?? [], [recommendationQuery.data?.items])

  function goToCheckout() {
    if (items.length === 0) return
    if (status !== 'authenticated') {
      navigate('/auth?returnTo=/checkout')
      return
    }
    navigate('/checkout')
  }

  function handleCheckoutIntentPrefetch() {
    prefetchRouteChunk('/checkout')
    if (status === 'authenticated') {
      void queryClient.prefetchQuery({
        queryKey: ['checkout-addresses'],
        queryFn: () => api.listAddresses(),
        staleTime: 30_000,
      })
    }
  }

  return (
    <AppShell contained={false}>
      <Stack spacing={{ xs: 2, md: 3 }}>
        <MotionReveal variant="reveal-fade">
          <Card variant="feature" sx={{ position: 'relative', overflow: 'hidden' }}>
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: 0,
                opacity: 0.16,
                pointerEvents: 'none',
              }}
            >
              <Box component="img" src={cartHeaderBackdropUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
            <Grid container spacing={2} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
              <Grid size={{ xs: 12, md: 8 }}>
                <Typography variant="overline" color="secondary.main">Mochila</Typography>
                <Typography variant="h3">Itens selecionados</Typography>
                <Typography variant="body2" color="text.secondary">
                  {status === 'authenticated' ? 'Sincronizada com sua conta.' : 'Local neste navegador. Entre para sincronizar.'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack direction={{ xs: 'column', sm: 'row', md: 'column' }} spacing={1}>
                  <Button className="ds-pressable" data-testid="cart-continue-shopping" component={RouterLink} to="/catalog" variant="outline" fullWidth>
                    Continuar comprando
                  </Button>
                  <Button
                    className="ds-pressable"
                    data-testid="cart-clear"
                    variant="ghost"
                    fullWidth
                    disabled={items.length === 0}
                    onClick={() => setConfirmClearOpen(true)}
                  >
                    Limpar
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Card>
        </MotionReveal>

        <MotionReveal variant="reveal-up" delayMs={80}>
          <Grid container spacing={2.2} alignItems="flex-start">
          <Grid size={{ xs: 12, lg: 7.5 }}>
            <Card className="ds-hover-lift">
              {loading ? (
                <Typography variant="body2" color="text.secondary">Carregando mochila...</Typography>
              ) : items.length === 0 ? (
                <Stack spacing={1.2}>
                  <Typography component="h4" variant="h5">Sua mochila esta vazia</Typography>
                  <Typography variant="body2" color="text.secondary">Adicione produtos para iniciar o checkout.</Typography>
                  <Button className="ds-pressable" data-testid="cart-empty-catalog-cta" component={RouterLink} to="/catalog" variant="primary" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    Ir para o catalogo
                  </Button>
                </Stack>
              ) : (
                <Stack divider={<Divider sx={{ borderColor: 'divider' }} />}>
                  {items.map((item) => (
                    <Box key={item.productId} sx={{ py: 1.6 }}>
                      <Grid container spacing={1.4} alignItems="center">
                        <Grid size={{ xs: 12, md: 7 }}>
                          <Stack direction="row" spacing={1.1} alignItems="center">
                            <Box sx={{ width: 64, height: 64, borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'grey.100', flexShrink: 0 }}>
                              <ResponsiveImage src={item.imageUrl} alt={item.name} sizes="64px" />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography component="p" variant="subtitle1" sx={{ lineHeight: 1.1 }}>{item.name}</Typography>
                              <Typography variant="body2" color="text.secondary">{item.manufacturer} • {item.bikeModel}</Typography>
                              <Typography variant="caption" color="text.secondary">SKU: {item.sku} • Estoque: {item.stock}</Typography>
                            </Box>
                          </Stack>
                        </Grid>

                        <Grid size={{ xs: 12, md: 2.5 }}>
                          <Stack direction="row" spacing={0.8} alignItems="center">
                            <Button data-testid={`cart-decrease-${item.productId}`} variant="outline" size="sm" onClick={() => void updateQty(item.productId, item.quantity - 1)}>
                              -
                            </Button>
                            <Typography sx={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{item.quantity}</Typography>
                            <Button
                              data-testid={`cart-increase-${item.productId}`}
                              variant="outline"
                              size="sm"
                              disabled={item.quantity >= item.stock}
                              onClick={() => void updateQty(item.productId, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </Stack>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 8, md: 2.5 }}>
                          <Typography component="p" variant="subtitle1" sx={{ color: 'info.main', fontWeight: 700 }}>
                            {formatCurrency(Number(item.price) * Number(item.quantity))}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{formatCurrency(Number(item.price))} un.</Typography>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4, md: 12 }}>
                          <Stack direction="row" justifyContent={{ xs: 'flex-start', sm: 'flex-end', md: 'flex-start' }}>
                            <Button data-testid={`cart-remove-${item.productId}`} variant="ghost" size="sm" onClick={() => void removeItem(item.productId)}>
                              Remover
                            </Button>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </Stack>
              )}
            </Card>

            {recommendations.length > 0 ? (
              <MotionReveal variant="reveal-up" delayMs={120}>
                <Box sx={{ mt: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.1 }}>
                  <Typography variant="h6">Recomendados para sua compra</Typography>
                  <Typography variant="caption" color="text.secondary">Baseado no catalogo real</Typography>
                </Stack>
                <Grid container spacing={1.2}>
                  {recommendations.map((item) => (
                    <Grid key={`cart-rec-${item.id}`} size={{ xs: 12, sm: 6, lg: 3 }}>
                      <RecommendationCard product={item} />
                    </Grid>
                  ))}
                </Grid>
                </Box>
              </MotionReveal>
            ) : null}
          </Grid>

          <Grid size={{ xs: 12, lg: 4.5 }}>
            <Card className="ds-hover-lift" sx={{ position: { lg: 'sticky' }, top: { lg: 106 } }}>
              <Typography component="h4" variant="h6" sx={{ mb: 1.2 }}>Resumo</Typography>

              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Itens</Typography>
                  <Typography variant="body2">{itemCount}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  <Typography variant="body2">{formatCurrency(total)}</Typography>
                </Stack>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography component="p" variant="subtitle2" color="text.secondary">Total</Typography>
                <Typography variant="h4" sx={{ color: 'info.main', letterSpacing: '-0.03em' }}>{formatCurrency(total)}</Typography>
              </Stack>

              <Button
                className="ds-pressable"
                data-testid="cart-checkout-button"
                fullWidth
                variant="primary"
                size="lg"
                disabled={items.length === 0}
                onMouseEnter={handleCheckoutIntentPrefetch}
                onFocus={handleCheckoutIntentPrefetch}
                onTouchStart={handleCheckoutIntentPrefetch}
                onClick={goToCheckout}
              >
                {items.length === 0 ? 'Mochila vazia' : 'Ir para checkout'}
              </Button>
            </Card>
          </Grid>
          </Grid>
        </MotionReveal>
      </Stack>

      <ActionGuardDialog
        open={confirmClearOpen}
        title="Limpar mochila?"
        description="Essa acao remove todos os itens atuais da mochila."
        impacts={[
          'Voce tera que adicionar os itens novamente.',
          'O resumo sera recalculado no checkout.',
        ]}
        confirmLabel="Sim, limpar mochila"
        confirmColor="error"
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          setConfirmClearOpen(false)
          void clear()
        }}
      />
    </AppShell>
  )
}
