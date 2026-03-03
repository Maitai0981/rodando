import { useEffect } from 'react'
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '../layouts/AppShell'
import { useAuth } from '../context/AuthContext'
import { useAssist } from '../context/AssistContext'
import { api } from '../lib/api'
import { formatCurrency } from '../lib'
import { TaskEmptyStateGuide } from '../components/assist'

export default function OrdersPage() {
  const { status } = useAuth()
  const { completeStep } = useAssist()

  const ordersQuery = useQuery({
    queryKey: ['orders-list'],
    queryFn: () => api.listOrders(),
    enabled: status === 'authenticated',
  })

  useEffect(() => {
    if (ordersQuery.data?.items && ordersQuery.data.items.length > 0) {
      completeStep('orders-viewed', 'orders')
    }
  }, [ordersQuery.data?.items, completeStep])

  if (status !== 'authenticated') {
    return (
      <AppShell>
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h5" sx={{ mb: 1 }}>
            Meus pedidos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Faça login para acompanhar seus pedidos.
          </Typography>
          <Button component={RouterLink} to="/auth" variant="contained">
            Entrar
          </Button>
        </Paper>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Stack spacing={1.5}>
        <Typography variant="h4">Meus pedidos</Typography>
        <Typography variant="body2" color="text.secondary">
          Histórico completo com status, método de entrega e total.
        </Typography>

        {ordersQuery.isLoading ? (
          <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              Carregando pedidos...
            </Typography>
          </Paper>
        ) : null}

        {ordersQuery.isError ? (
          <Alert severity="error">Não foi possível carregar os pedidos.</Alert>
        ) : null}

        {ordersQuery.data?.items?.length === 0 ? (
          <TaskEmptyStateGuide
            title="Você ainda não possui pedidos"
            description="Navegue no catálogo, adicione itens na mochila e finalize o checkout."
            ctaLabel="Ir para o catálogo"
            ctaComponent={(
              <Button component={RouterLink} to="/catalog" variant="contained">
                Ir para o catálogo
              </Button>
            )}
          />
        ) : null}

        {ordersQuery.data?.items?.map((order) => (
          <Paper key={order.id} sx={{ p: 2, borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
            <Stack spacing={0.8}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1">Pedido #{order.id}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(order.createdAt).toLocaleString('pt-BR')}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Typography variant="body2">Status: <Box component="span" sx={{ fontWeight: 600 }}>{order.status}</Box></Typography>
                <Typography variant="body2">Pagamento: <Box component="span" sx={{ fontWeight: 600 }}>{order.paymentStatus || 'pending'}</Box></Typography>
                <Typography variant="body2">Método: <Box component="span" sx={{ fontWeight: 600 }}>{order.deliveryMethod || 'pickup'}</Box></Typography>
                <Typography variant="body2">Total: <Box component="span" sx={{ fontWeight: 700, color: 'info.main' }}>{formatCurrency(order.total)}</Box></Typography>
              </Stack>
              <Stack direction="row" justifyContent="flex-end">
                <Button
                  size="small"
                  component={RouterLink}
                  to={`/orders/${order.id}`}
                  variant="outlined"
                  onClick={() => completeStep('details-opened', 'orders')}
                >
                  Ver detalhes
                </Button>
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </AppShell>
  )
}
