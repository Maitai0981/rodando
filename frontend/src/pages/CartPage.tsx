import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Divider, Grid, LinearProgress, MenuItem, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material'
import { motion, useReducedMotion } from 'motion/react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '../layouts/AppShell'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useAssist } from '../context/AssistContext'
import { formatCurrency } from '../lib'
import { api, ApiError, type CheckoutDeliveryMethod, type Product } from '../lib/api'
import { ActionGuardDialog, AssistHintInline } from '../components/assist'

const FREE_SHIPPING_THRESHOLD = 199

const reveal = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
} as const

function RecommendationCard({ product }: { product: Product }) {
  const { addProduct } = useCart()
  return (
    <Paper elevation={0} sx={{ p: 1.6, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Stack spacing={1}>
        <Box sx={{ borderRadius: 2, overflow: 'hidden', height: 120, border: '1px solid', borderColor: 'divider', bgcolor: 'grey.100' }}>
          <Box component="img" src={product.imageUrl} alt={product.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Box>
        <Typography component="p" variant="subtitle2" sx={{ color: 'text.primary', lineHeight: 1.1 }}>
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {formatCurrency(Number(product.price))}
        </Typography>
        <Button data-testid={`cart-rec-add-${product.id}`} size="small" variant="outlined" color="primary" onClick={() => void addProduct(product, 1)}>
          Adicionar
        </Button>
      </Stack>
    </Paper>
  )
}

export default function CartPage() {
  const navigate = useNavigate()
  const { items, total, itemCount, loading, updateQty, removeItem, clear } = useCart()
  const { status, user } = useAuth()
  const { completeStep, trackAssistEvent } = useAssist()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [deliveryMethod, setDeliveryMethod] = useState<CheckoutDeliveryMethod>('pickup')
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [recipientDocument, setRecipientDocument] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const recommendationQuery = useQuery({
    queryKey: ['cart-recommendations', items.map((item) => item.productId).join(',')],
    queryFn: () => api.listCatalogRecommendations({ limit: 4, exclude: items.map((item) => item.productId) }),
  })

  const addressesQuery = useQuery({
    queryKey: ['cart-addresses'],
    queryFn: () => api.listAddresses(),
    enabled: status === 'authenticated',
  })

  const quoteQuery = useQuery({
    queryKey: ['order-quote', deliveryMethod, selectedAddressId, total, itemCount],
    queryFn: () =>
      api.quoteOrder({
        deliveryMethod,
        addressId: selectedAddressId,
      }),
    enabled:
      status === 'authenticated' &&
      items.length > 0 &&
      (deliveryMethod === 'pickup' || Number.isInteger(selectedAddressId)),
  })

  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - total)
  const freeShippingProgress = Math.min(100, Math.round((total / FREE_SHIPPING_THRESHOLD) * 100))
  const recommendations = useMemo(() => recommendationQuery.data?.items ?? [], [recommendationQuery.data?.items])
  const addresses = useMemo(() => addressesQuery.data?.items ?? [], [addressesQuery.data?.items])
  const shippingCost = Number(quoteQuery.data?.quote?.shippingCost || 0)
  const checkoutMissingItems = useMemo(() => {
    const missing: string[] = []
    if (deliveryMethod === 'delivery' && addresses.length === 0) {
      missing.push('Cadastrar ao menos 1 endereço para entrega')
    }
    if (deliveryMethod === 'delivery' && !selectedAddressId) {
      missing.push('Selecionar endereço de entrega')
    }
    if (!String(recipientName || '').trim()) {
      missing.push('Informar nome do destinatário')
    }
    return missing
  }, [addresses.length, deliveryMethod, recipientName, selectedAddressId])

  useEffect(() => {
    setRecipientName(user?.name || '')
    setRecipientDocument(user?.document || '')
    setRecipientPhone(user?.phone || '')
  }, [user?.name, user?.document, user?.phone])

  useEffect(() => {
    if (addresses.length === 0) {
      setSelectedAddressId(null)
      return
    }
    const preferred = addresses.find((address) => address.isDefault) || addresses[0]
    setSelectedAddressId((previous) => (previous && addresses.some((address) => address.id === previous) ? previous : preferred.id))
  }, [addresses])

  useEffect(() => {
    completeStep('method-selected', 'cart')
  }, [completeStep, deliveryMethod])

  useEffect(() => {
    if (deliveryMethod === 'delivery' && selectedAddressId) {
      completeStep('address-selected', 'cart')
    }
  }, [completeStep, deliveryMethod, selectedAddressId])

  useEffect(() => {
    if (String(recipientName || '').trim()) {
      completeStep('recipient-filled', 'cart')
    }
  }, [completeStep, recipientName])

  async function handleCheckout() {
    setCheckoutError(null)
    setCheckoutMessage(null)

    if (items.length === 0) return

    if (status !== 'authenticated') {
      navigate('/auth', { replace: false })
      return
    }

    if (checkoutMissingItems.length > 0) {
      setCheckoutError('Falta concluir alguns dados antes do checkout.')
      trackAssistEvent('assist_guardrail_blocked', {
        routeKey: 'cart',
        reason: 'checkout_missing_fields',
        missing: checkoutMissingItems,
      })
      return
    }

    setCheckoutLoading(true)
    try {
      const result = await api.checkoutOrder({
        deliveryMethod,
        addressId: deliveryMethod === 'delivery' ? selectedAddressId : null,
        recipientName,
        recipientDocument,
        recipientPhone,
      })
      await clear()
      setCheckoutMessage(`Pedido #${result.order.id} criado com sucesso.`)
      completeStep('checkout-complete', 'cart')
    } catch (err) {
      setCheckoutError(err instanceof ApiError ? err.message : 'Falha ao finalizar pedido.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <AppShell contained={false}>
      <Stack spacing={{ xs: 2, md: 3.2 }}>
        <Paper
          className="mobile-premium-hero"
          component={motion.div}
          initial={prefersReducedMotion ? false : 'hidden'}
          animate="visible"
          variants={reveal}
          elevation={0}
          sx={{
            p: { xs: 1.6, md: 2.5 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: { xs: 'divider', md: 'divider' },
            bgcolor: { xs: 'transparent', md: 'background.paper' },
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="caption" sx={{ color: 'primary.main', letterSpacing: '0.12em' }}>
                MOCHILA
              </Typography>
              <Typography variant="h3" sx={{ color: { xs: 'text.primary', md: 'text.primary' }, letterSpacing: '-0.03em', fontSize: { xs: 'clamp(1.6rem, 7vw, 2.15rem)', md: 'inherit' } }}>
                Itens selecionados
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ color: { xs: 'text.secondary', md: 'text.secondary' } }}>
                {status === 'authenticated'
                  ? 'Sincronizada com sua conta.'
                  : 'Local neste navegador. Entre para sincronizar.'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack direction={{ xs: 'column', sm: 'row', md: 'column' }} spacing={1}>
                <Button data-testid="cart-continue-shopping" component={RouterLink} to="/catalog" variant="outlined" color="primary" fullWidth>
                  Continuar comprando
                </Button>
                <Button
                  data-testid="cart-clear"
                  variant="text"
                  color="error"
                  onClick={() => {
                    if (items.length === 0) return
                    setConfirmClearOpen(true)
                  }}
                  disabled={items.length === 0}
                  fullWidth
                >
                  Limpar
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        <Paper className="mobile-premium-card" elevation={0} sx={{ p: { xs: 1.5, md: 2.4 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography component="p" variant="subtitle2" sx={{ color: 'text.primary' }}>
                Frete gratis progressivo
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Meta {formatCurrency(FREE_SHIPPING_THRESHOLD)}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={freeShippingProgress}
              aria-label="Progresso para frete gratis"
              sx={{
                height: 10,
                borderRadius: 999,
                bgcolor: 'rgba(15,23,42,0.08)',
                '& .MuiLinearProgress-bar': { borderRadius: 999, backgroundColor: 'primary.main' },
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {freeShippingRemaining > 0
                ? `Faltam ${formatCurrency(freeShippingRemaining)} para liberar frete gratis.`
                : 'Frete gratis liberado para este pedido.'}
            </Typography>
          </Stack>
        </Paper>

        <Grid container spacing={2.5} alignItems="flex-start">
          <Grid size={{ xs: 12, lg: 7.5 }}>
            <Paper
              className="mobile-premium-card"
              component={motion.div}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                overflow: 'hidden',
              }}
            >
              {loading ? (
                <Box sx={{ p: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Carregando mochila...
                  </Typography>
                </Box>
              ) : items.length === 0 ? (
                <Box sx={{ p: { xs: 2.1, md: 3 } }}>
                  <Typography component="h4" variant="h6" sx={{ color: 'text.primary', mb: 0.5 }}>
                    Sua mochila esta vazia
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Comece por itens com alta saida e ganhe agilidade no fechamento do pedido.
                  </Typography>
                  <Button data-testid="cart-empty-catalog-cta" component={RouterLink} to="/catalog" variant="contained" color="primary">
                    Ir para o catalogo
                  </Button>
                </Box>
              ) : (
                <Stack divider={<Divider sx={{ borderColor: 'divider' }} />}>
                  {items.map((item) => (
                    <Box key={item.productId} sx={{ p: { xs: 2, md: 2.2 } }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 7 }}>
                          <Stack direction="row" spacing={1.2} alignItems="center">
                            <Box
                              sx={{
                                width: 64,
                                height: 64,
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                display: 'grid',
                                placeItems: 'center',
                                flexShrink: 0,
                                overflow: 'hidden',
                                bgcolor: 'grey.100',
                              }}
                            >
                              <Box
                                component="img"
                                src={item.imageUrl}
                                alt={item.name}
                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography component="p" variant="subtitle1" sx={{ color: 'text.primary', lineHeight: 1.15 }}>
                                {item.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                                {item.manufacturer} • {item.bikeModel}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pr: 0.5 }}>
                                SKU: {item.sku} • Estoque: {item.stock}
                              </Typography>
                            </Box>
                          </Stack>
                        </Grid>

                        <Grid size={{ xs: 12, md: 2.5 }}>
                          <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
                            <Button data-testid={`cart-decrease-${item.productId}`} size="small" variant="outlined" onClick={() => void updateQty(item.productId, item.quantity - 1)}>
                              -
                            </Button>
                            <Box
                              sx={{
                                minWidth: 38,
                                height: 32,
                                borderRadius: 1.5,
                                border: '1px solid',
                                borderColor: 'divider',
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: '0.9rem',
                              }}
                            >
                              {item.quantity}
                            </Box>
                            <Button
                              data-testid={`cart-increase-${item.productId}`}
                              size="small"
                              variant="outlined"
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
                          <Typography variant="caption" color="text.secondary">
                            {formatCurrency(Number(item.price))} un.
                          </Typography>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4, md: 12 }}>
                          <Stack direction="row" justifyContent={{ xs: 'flex-start', sm: 'flex-end', md: 'flex-start' }}>
                            <Button data-testid={`cart-remove-${item.productId}`} size="small" color="error" onClick={() => void removeItem(item.productId)}>
                              Remover
                            </Button>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>

            {recommendations.length > 0 ? (
              <Box sx={{ mt: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
                  <Typography component="h4" variant="h6" sx={{ color: 'text.primary' }}>
                    Recomendados para sua compra
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Baseado no catalogo real
                  </Typography>
                </Stack>
                <Grid container spacing={1.5}>
                  {recommendations.map((item) => (
                    <Grid key={`cart-rec-${item.id}`} size={{ xs: 12, sm: 6, lg: 3 }}>
                      <RecommendationCard product={item} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ) : null}
          </Grid>

          <Grid size={{ xs: 12, lg: 4.5 }}>
            <Paper
              className="mobile-premium-card"
              component={motion.div}
              initial={prefersReducedMotion ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.42, ease: 'easeOut', delay: 0.08 }}
              elevation={0}
              sx={{
                p: { xs: 1.6, md: 2.5 },
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                position: { lg: 'sticky' },
                top: { lg: 106 },
              }}
            >
              <Typography component="h4" variant="h6" sx={{ color: 'text.primary', mb: 2 }}>
                Resumo
              </Typography>

              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Itens</Typography>
                  <Typography variant="body2">{itemCount}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  <Typography variant="body2">{formatCurrency(total)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Frete</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {itemCount > 0 ? formatCurrency(shippingCost) : 'No checkout'}
                  </Typography>
                </Stack>
              </Stack>

              <Divider sx={{ my: 2, borderColor: 'divider' }} />

              <Stack spacing={1.1}>
                <TextField
                  select
                  label="Método de entrega"
                  size="small"
                  value={deliveryMethod}
                  onChange={(event) => setDeliveryMethod(event.target.value as CheckoutDeliveryMethod)}
                >
                  <MenuItem value="pickup">Retirada na loja</MenuItem>
                  <MenuItem value="delivery">Entrega</MenuItem>
                </TextField>

                {deliveryMethod === 'delivery' ? (
                  <TextField
                    select
                    label="Endereço"
                    size="small"
                    value={selectedAddressId ?? ''}
                    onChange={(event) => setSelectedAddressId(Number(event.target.value))}
                    helperText={addresses.length === 0 ? 'Cadastre um endereço em Minha conta.' : undefined}
                  >
                    {addresses.map((address) => (
                      <MenuItem key={`cart-address-${address.id}`} value={address.id}>
                        {address.label} • {address.street}, {address.number || 's/n'} - {address.city}/{address.state}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : null}

                <TextField
                  label="Destinatário"
                  size="small"
                  value={recipientName}
                  onChange={(event) => setRecipientName(event.target.value)}
                />

                <Grid container spacing={1}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="CPF/CNPJ"
                      size="small"
                      value={recipientDocument}
                      onChange={(event) => setRecipientDocument(event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Telefone"
                      size="small"
                      value={recipientPhone}
                      onChange={(event) => setRecipientPhone(event.target.value)}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                {quoteQuery.data?.quote ? (
                  <Typography variant="caption" color="text.secondary">
                    Regra aplicada: {quoteQuery.data.quote.ruleApplied} • ETA: {quoteQuery.data.quote.etaDays} dia(s)
                  </Typography>
                ) : null}
                <AssistHintInline tipId="cart-tip-review" routeKey="cart">
                  Revise método, endereço e destinatário antes de finalizar o pedido.
                </AssistHintInline>

                {items.length > 0 && checkoutMissingItems.length > 0 ? (
                  <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.6 }}>
                      Falta concluir:
                    </Typography>
                    <Stack spacing={0.3}>
                      {checkoutMissingItems.map((item) => (
                        <Typography key={item} variant="caption" color="text.secondary">
                          • {item}
                        </Typography>
                      ))}
                    </Stack>
                    {deliveryMethod === 'delivery' && addresses.length === 0 ? (
                      <Button
                        component={RouterLink}
                        to="/account/profile"
                        size="small"
                        color="warning"
                        sx={{ mt: 1 }}
                      >
                        Cadastrar endereço agora
                      </Button>
                    ) : null}
                  </Alert>
                ) : null}
              </Stack>

              <Divider sx={{ my: 2, borderColor: 'divider' }} />

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography component="p" variant="subtitle2" color="text.secondary">Total</Typography>
                <Typography variant="h4" sx={{ color: 'info.main', letterSpacing: '-0.03em' }}>
                  {formatCurrency(total + shippingCost)}
                </Typography>
              </Stack>

              <Button
                data-testid="cart-checkout-button"
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                disabled={
                  items.length === 0
                  || checkoutLoading
                  || (deliveryMethod === 'delivery' && addresses.length === 0)
                  || (deliveryMethod === 'delivery' && !selectedAddressId)
                  || checkoutMissingItems.length > 0
                }
                onClick={() => void handleCheckout()}
              >
                {items.length === 0 ? 'Mochila vazia' : 'Ir para checkout'}
              </Button>
              {checkoutError ? (
                <Alert severity="error" sx={{ mt: 1.5 }}>
                  {checkoutError}
                </Alert>
              ) : null}
            </Paper>
          </Grid>
        </Grid>
      </Stack>

      <Snackbar open={Boolean(checkoutMessage)} autoHideDuration={2800} onClose={() => setCheckoutMessage(null)}>
        <Alert severity="success" variant="filled" onClose={() => setCheckoutMessage(null)}>
          {checkoutMessage}
        </Alert>
      </Snackbar>

      <ActionGuardDialog
        open={confirmClearOpen}
        title="Limpar mochila?"
        description="Essa ação remove todos os itens atuais da mochila."
        impacts={[
          'Você terá que adicionar os itens novamente.',
          'O resumo de frete será recalculado.',
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
