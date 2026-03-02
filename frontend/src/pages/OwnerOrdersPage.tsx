import { useMemo, useState } from 'react'
import { Alert, Button, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import OwnerLayout from '../layouts/OwnerLayout'
import { api, ApiError, type OwnerOrderSummary } from '../lib/api'
import { formatCurrency } from '../lib'
import { useAssist } from '../context/AssistContext'
import { ActionGuardDialog, AssistHintInline } from '../components/assist'

const STATUS_OPTIONS = ['created', 'paid', 'shipped', 'completed', 'cancelled']

export default function OwnerOrdersPage() {
  const { completeStep, trackAssistEvent } = useAssist()
  const [filters, setFilters] = useState({
    status: '',
    deliveryMethod: '',
    city: '',
    customer: '',
    limit: 50,
  })
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null)
  const [pendingStatusChange, setPendingStatusChange] = useState<{ id: number; status: string } | null>(null)

  const ordersQuery = useQuery({
    queryKey: ['owner-orders', filters],
    queryFn: () => api.listOwnerOrders(filters),
  })

  const detailsQuery = useQuery({
    queryKey: ['owner-order-details', selectedOrder],
    queryFn: () => api.getOwnerOrder(Number(selectedOrder)),
    enabled: Boolean(selectedOrder),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.updateOwnerOrderStatus(id, status),
    onSuccess: async () => {
      setFeedback('Status atualizado com sucesso.')
      setError(null)
      completeStep('status-updated', 'owner-orders')
      await ordersQuery.refetch()
      if (selectedOrder) {
        await detailsQuery.refetch()
      }
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Falha ao atualizar status.')
    },
  })

  const orders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data?.items])

  function requestStatusUpdate(id: number, status: string) {
    if (!status) return
    if (status === 'cancelled') {
      setPendingStatusChange({ id, status })
      trackAssistEvent('assist_guardrail_blocked', {
        routeKey: 'owner-orders',
        reason: 'owner_cancel_requires_confirmation',
        orderId: id,
      })
      return
    }
    statusMutation.mutate({ id, status })
  }

  return (
    <OwnerLayout>
      <Stack spacing={2}>
        <Typography variant="h4">Pedidos</Typography>
        <Typography variant="body2" color="text.secondary">
          Acompanhe quem comprou, forma de entrega, status de pagamento e timeline operacional.
        </Typography>
        <AssistHintInline tipId="owner-orders-tip-status" routeKey="owner-orders">
          Dica: filtre por status primeiro e só cancele pedidos com confirmação.
        </AssistHintInline>

        <Paper sx={{ p: 1.8, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Grid container spacing={1}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                select
                size="small"
                label="Status"
                value={filters.status}
                fullWidth
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, status: event.target.value }))
                  completeStep('filter-used', 'owner-orders')
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                {STATUS_OPTIONS.map((status) => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                select
                size="small"
                label="Entrega"
                value={filters.deliveryMethod}
                fullWidth
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, deliveryMethod: event.target.value }))
                  completeStep('filter-used', 'owner-orders')
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="pickup">Retirada</MenuItem>
                <MenuItem value="delivery">Entrega</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                size="small"
                label="Cidade"
                value={filters.city}
                fullWidth
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, city: event.target.value }))
                  completeStep('filter-used', 'owner-orders')
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                size="small"
                label="Cliente"
                value={filters.customer}
                fullWidth
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, customer: event.target.value }))
                  completeStep('filter-used', 'owner-orders')
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        {ordersQuery.isLoading ? (
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">Carregando pedidos...</Typography>
          </Paper>
        ) : null}

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Stack spacing={1}>
              {orders.map((order: OwnerOrderSummary) => (
                <Paper key={order.id} sx={{ p: 1.7, borderRadius: 2.4, border: '1px solid', borderColor: 'divider' }}>
                  <Stack spacing={0.6}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1">Pedido #{order.id}</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setSelectedOrder(order.id)
                          completeStep('detail-opened', 'owner-orders')
                        }}
                      >
                        Detalhes
                      </Button>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {order.customer.name} • {order.customer.email}
                    </Typography>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap">
                      <Typography variant="caption">Status: {order.status}</Typography>
                      <Typography variant="caption">Pagamento: {order.paymentStatus}</Typography>
                      <Typography variant="caption">Entrega: {order.deliveryMethod}</Typography>
                      <Typography variant="caption">Cidade: {order.deliveryCity || 'N/I'}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.main' }}>
                        {formatCurrency(order.total)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
              {orders.length === 0 && !ordersQuery.isLoading ? (
                <Paper sx={{ p: 2, borderRadius: 2.4, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2" color="text.secondary">Nenhum pedido encontrado para o filtro atual.</Typography>
                </Paper>
              ) : null}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Paper sx={{ p: 1.8, borderRadius: 2.4, border: '1px solid', borderColor: 'divider', minHeight: 220 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Detalhe do pedido
              </Typography>
              {!selectedOrder ? (
                <Typography variant="body2" color="text.secondary">Selecione um pedido para visualizar.</Typography>
              ) : null}
              {detailsQuery.isLoading ? (
                <Typography variant="body2" color="text.secondary">Carregando...</Typography>
              ) : null}
              {detailsQuery.data?.item ? (
                <Stack spacing={1}>
                  <Typography variant="body2">Status atual: <strong>{String((detailsQuery.data.item as Record<string, unknown>).status || '')}</strong></Typography>
                  <TextField
                    select
                    size="small"
                    label="Atualizar status"
                    defaultValue=""
                    onChange={(event) => {
                      if (!selectedOrder || !event.target.value) return
                      requestStatusUpdate(selectedOrder, event.target.value)
                    }}
                  >
                    <MenuItem value="">Selecione</MenuItem>
                    {STATUS_OPTIONS.map((status) => (
                      <MenuItem key={`owner-order-status-${status}`} value={status}>{status}</MenuItem>
                    ))}
                  </TextField>
                  <Typography variant="body2" color="text.secondary">
                    Use este painel para atualizar workflow de preparação, envio e conclusão.
                  </Typography>
                </Stack>
              ) : null}
            </Paper>
          </Grid>
        </Grid>

        {feedback ? <Alert severity="success">{feedback}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>

      <ActionGuardDialog
        open={Boolean(pendingStatusChange)}
        title="Cancelar pedido?"
        description="Essa ação interrompe o fluxo operacional e pode impactar cliente e estoque."
        impacts={[
          'Pedido ficará com status cancelado.',
          'A operação poderá exigir contato com o cliente.',
        ]}
        confirmColor="error"
        confirmLabel="Sim, cancelar pedido"
        onCancel={() => setPendingStatusChange(null)}
        onConfirm={() => {
          if (!pendingStatusChange) return
          statusMutation.mutate(pendingStatusChange)
          setPendingStatusChange(null)
        }}
      />
    </OwnerLayout>
  )
}
