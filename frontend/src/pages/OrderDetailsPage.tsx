import { useEffect } from 'react'
import { Alert, Button, Divider, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '../layouts/AppShell'
import { useAuth } from '../context/AuthContext'
import { useAssist } from '../context/AssistContext'
import { api } from '../lib/api'
import { formatCurrency } from '../lib'

export default function OrderDetailsPage() {
  const { status } = useAuth()
  const { completeStep } = useAssist()
  const params = useParams()
  const id = Number(params.id)
  const isValidId = Number.isInteger(id) && id > 0

  const orderQuery = useQuery({
    queryKey: ['order-details', id],
    queryFn: () => api.getOrder(id),
    enabled: status === 'authenticated' && isValidId,
  })

  const order = orderQuery.data?.item

  useEffect(() => {
    if (order?.events?.length) {
      completeStep('timeline-viewed', 'order-details')
    }
  }, [completeStep, order?.events?.length])

  if (status !== 'authenticated') {
    return (
      <AppShell>
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h5" sx={{ mb: 1 }}>
            Detalhe do pedido
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Faça login para visualizar este pedido.
          </Typography>
          <Button component={RouterLink} to="/auth" variant="contained">Entrar</Button>
        </Paper>
      </AppShell>
    )
  }

  if (!isValidId) {
    return (
      <AppShell>
        <Alert severity="warning">Pedido inválido.</Alert>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Pedido #{id}</Typography>
          <Button component={RouterLink} to="/orders" variant="outlined">Voltar</Button>
        </Stack>
        {orderQuery.isLoading ? (
          <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">Carregando pedido...</Typography>
          </Paper>
        ) : null}
        {orderQuery.isError ? (
          <Alert severity="error">Não foi possível carregar os detalhes do pedido.</Alert>
        ) : null}
        {order ? (
          <>
            <Paper sx={{ p: 2.2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Stack spacing={0.7}>
                <Typography variant="subtitle1">Resumo</Typography>
                <Typography variant="body2">Status: <strong>{order.status}</strong></Typography>
                <Typography variant="body2">Pagamento: <strong>{order.paymentStatus}</strong></Typography>
                <Typography variant="body2">Entrega: <strong>{order.deliveryMethod}</strong> • ETA: <strong>{order.etaDays ?? 1} dia(s)</strong></Typography>
                <Typography variant="body2">Subtotal: {formatCurrency(order.subtotal)}</Typography>
                <Typography variant="body2">Frete: {formatCurrency(order.shipping)}</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'info.main' }}>Total: {formatCurrency(order.total)}</Typography>
              </Stack>
            </Paper>

            <Paper sx={{ p: 2.2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Itens</Typography>
              <Stack spacing={1}>
                {order.items.map((item) => (
                  <Stack key={`${item.orderId}-${item.productId}`} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">{item.name} • {item.quantity}x</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(item.lineTotal)}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>

            <Paper sx={{ p: 2.2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Timeline</Typography>
              <Stack spacing={1}>
                {order.events.map((event, index) => (
                  <Stack key={event.id} spacing={0.4}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{event.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(event.createdAt).toLocaleString('pt-BR')} • {event.status}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{event.description}</Typography>
                    {index < order.events.length - 1 ? <Divider /> : null}
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </>
        ) : null}
      </Stack>
    </AppShell>
  )
}
