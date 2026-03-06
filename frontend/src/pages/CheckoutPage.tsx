import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '../layouts/AppShell'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { api, ApiError, type CheckoutDeliveryMethod } from '../lib/api'
import { formatCurrency } from '../lib'
import { Alert, Button, Card, Input, MotionReveal, Select, Toast } from '../ui'

const checkoutHeaderBackdropUrl =
  'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1400&q=80'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { status, user } = useAuth()
  const { items, total, itemCount, clear } = useCart()

  const [deliveryMethod, setDeliveryMethod] = useState<CheckoutDeliveryMethod>('pickup')
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [recipientDocument, setRecipientDocument] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const addressesQuery = useQuery({
    queryKey: ['checkout-addresses'],
    queryFn: () => api.listAddresses(),
    enabled: status === 'authenticated',
  })

  const quoteQuery = useQuery({
    queryKey: ['checkout-quote', deliveryMethod, selectedAddressId, total, itemCount],
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

  useEffect(() => {
    if (status === 'anonymous') {
      navigate('/auth?returnTo=/checkout', { replace: true })
    }
  }, [navigate, status])

  useEffect(() => {
    setRecipientName(user?.name || '')
    setRecipientDocument(user?.document || '')
    setRecipientPhone(user?.phone || '')
  }, [user?.document, user?.name, user?.phone])

  useEffect(() => {
    const addresses = addressesQuery.data?.items ?? []
    if (addresses.length === 0) {
      setSelectedAddressId(null)
      return
    }
    const preferred = addresses.find((address) => address.isDefault) || addresses[0]
    setSelectedAddressId((current) => current || preferred.id)
  }, [addressesQuery.data?.items])

  const addresses = addressesQuery.data?.items ?? []
  const shippingCost = Number(quoteQuery.data?.quote?.shippingCost || 0)
  const finalTotal = total + shippingCost

  const blockers = useMemo(() => {
    const missing: string[] = []
    if (items.length === 0) missing.push('Carrinho vazio')
    if (!recipientName.trim()) missing.push('Informar nome do destinatario')
    if (deliveryMethod === 'delivery' && addresses.length === 0) missing.push('Cadastrar endereco para entrega')
    if (deliveryMethod === 'delivery' && !selectedAddressId) missing.push('Selecionar endereco')
    return missing
  }, [addresses.length, deliveryMethod, items.length, recipientName, selectedAddressId])

  async function handleCheckout() {
    if (blockers.length > 0 || loading) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.checkoutOrder({
        deliveryMethod,
        addressId: deliveryMethod === 'delivery' ? selectedAddressId : null,
        recipientName,
        recipientDocument,
        recipientPhone,
      })
      await clear()
      setSuccessMessage(`Pedido #${result.order.id} criado com sucesso.`)
      navigate(`/orders/${result.order.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao finalizar pedido.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell contained={false}>
      <Stack spacing={{ xs: 2, md: 3 }}>
        <MotionReveal variant="reveal-fade">
          <Card variant="feature" className="ds-hover-lift" sx={{ position: 'relative', overflow: 'hidden' }}>
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: 0,
                opacity: 0.14,
                pointerEvents: 'none',
              }}
            >
              <Box component="img" src={checkoutHeaderBackdropUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
            <Stack spacing={0.6} sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="overline" color="secondary.main">Checkout</Typography>
              <Typography variant="h3">Finalizacao de compra</Typography>
              <Typography variant="body2" color="text.secondary">
                Fluxo rapido de 1 etapa para confirmar entrega, destinatario e pagamento.
              </Typography>
            </Stack>
          </Card>
        </MotionReveal>

        {items.length === 0 ? (
          <MotionReveal variant="reveal-up" delayMs={80}>
            <Card className="ds-hover-lift">
            <Stack spacing={1.2}>
              <Typography variant="h6">Sua mochila esta vazia</Typography>
              <Typography variant="body2" color="text.secondary">Adicione produtos no catalogo para seguir ao checkout.</Typography>
              <Button className="ds-pressable" component={RouterLink} to="/catalog" variant="primary" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                Voltar ao catalogo
              </Button>
            </Stack>
            </Card>
          </MotionReveal>
        ) : (
          <MotionReveal variant="reveal-up" delayMs={80}>
            <Grid container spacing={2.2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card className="ds-hover-lift">
                <Stack spacing={1.2}>
                  <Typography variant="h6">Dados de entrega</Typography>
                  <Select
                    label="Metodo de entrega"
                    value={deliveryMethod}
                    onChange={(event) => setDeliveryMethod(event.target.value as CheckoutDeliveryMethod)}
                    options={[
                      { label: 'Retirada na loja', value: 'pickup' },
                      { label: 'Entrega', value: 'delivery' },
                    ]}
                  />

                  {deliveryMethod === 'delivery' ? (
                    <Select
                      label="Endereco"
                      value={selectedAddressId ? String(selectedAddressId) : ''}
                      onChange={(event) => setSelectedAddressId(Number(event.target.value))}
                      hint={addresses.length === 0 ? 'Cadastre um endereco em Minha conta.' : undefined}
                      options={addresses.map((address) => ({
                        value: String(address.id),
                        label: `${address.label} • ${address.street}, ${address.number || 's/n'} - ${address.city}/${address.state}`,
                      }))}
                    />
                  ) : null}

                  <Input
                    label="Destinatario"
                    value={recipientName}
                    onChange={(event) => setRecipientName(event.target.value)}
                  />
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Input
                        label="CPF/CNPJ"
                        value={recipientDocument}
                        onChange={(event) => setRecipientDocument(event.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Input
                        label="Telefone"
                        value={recipientPhone}
                        onChange={(event) => setRecipientPhone(event.target.value)}
                      />
                    </Grid>
                  </Grid>

                  {blockers.length > 0 ? (
                    <Alert tone="warning" title="Ajustes necessarios">
                      <Stack spacing={0.3}>
                        {blockers.map((item) => (
                          <Typography key={item} variant="caption" color="text.secondary">• {item}</Typography>
                        ))}
                      </Stack>
                    </Alert>
                  ) : null}

                  {error ? <Alert tone="error">{error}</Alert> : null}
                </Stack>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Card className="ds-hover-lift">
                <Stack spacing={1.1}>
                  <Typography variant="h6">Resumo do pedido</Typography>
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
                    <Typography variant="body2">{formatCurrency(shippingCost)}</Typography>
                  </Stack>
                  {quoteQuery.data?.quote ? (
                    <Typography variant="caption" color="text.secondary">
                      Regra: {quoteQuery.data.quote.ruleApplied} • ETA: {quoteQuery.data.quote.etaDays} dia(s)
                    </Typography>
                  ) : null}
                  <Divider />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" color="text.secondary">Total</Typography>
                    <Typography variant="h4" sx={{ color: 'info.main' }}>{formatCurrency(finalTotal)}</Typography>
                  </Stack>
                  <Button
                    className="ds-pressable"
                    data-testid="checkout-submit-button"
                    variant="primary"
                    fullWidth
                    loading={loading}
                    disabled={blockers.length > 0}
                    onClick={() => void handleCheckout()}
                  >
                    Finalizar pedido
                  </Button>
                  <Button className="ds-pressable" component={RouterLink} to="/cart" variant="outline" fullWidth>
                    Voltar para mochila
                  </Button>
                </Stack>
              </Card>
            </Grid>
            </Grid>
          </MotionReveal>
        )}

        <Toast
          open={Boolean(successMessage)}
          tone="success"
          message={successMessage || ''}
          onClose={() => setSuccessMessage(null)}
          durationMs={2200}
        />
      </Stack>
    </AppShell>
  )
}
