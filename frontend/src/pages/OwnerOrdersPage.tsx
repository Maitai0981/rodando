import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import OwnerLayout from '../shared/layout/OwnerLayout'
import { api, ApiError, type OwnerOrderSummary } from '../shared/lib/api'
import { formatCurrency } from '../shared/lib'
import { useAssist } from '../shared/context/AssistContext'

const STATUS_OPTIONS = ['created', 'paid', 'shipped', 'completed', 'cancelled']

const ORDER_STATUS_LABEL: Record<string, string> = {
  created: 'Criado',
  confirmed: 'Confirmado',
  processing: 'Em processamento',
  paid: 'Pago',
  shipped: 'Enviado',
  delivered: 'Entregue',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando',
  requires_action: 'Ação necessária',
  authorized: 'Autorizado',
  paid: 'Pago',
  rejected: 'Rejeitado',
  expired: 'Expirado',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
}

const DELIVERY_METHOD_LABEL: Record<string, string> = {
  pickup: 'Retirada',
  delivery: 'Entrega',
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card_credit: 'Cartão de crédito',
  card_debit: 'Cartão de débito',
  pix: 'Pix',
}

type OwnerOrderDetail = {
  id: number
  status: string
  customer: {
    name: string
  }
}

export default function OwnerOrdersPage() {
  const { completeStep } = useAssist()
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
      return
    }
    statusMutation.mutate({ id, status })
  }

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl text-[#f0ede8] font-bold">Pedidos</h1>
          <p className="text-sm text-[#9ca3af]">
            Acompanhe quem comprou, forma de entrega, status de pagamento e timeline operacional.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <label htmlFor="owner-orders-status" className="text-[11px] uppercase tracking-widest text-[#f0c040]">
                Status
              </label>
              <select
                id="owner-orders-status"
                value={filters.status}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, status: event.target.value }))
                  completeStep('filter-used', 'owner-orders')
                }}
                className="w-full h-11 px-3 rounded-xl text-sm outline-none bg-white/[0.06] border border-white/[0.12] text-[#f0ede8]"
              >
                <option value="" className="bg-[#111118]">Status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status} className="bg-[#111118]">{ORDER_STATUS_LABEL[status] ?? status}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="owner-orders-delivery" className="text-[11px] uppercase tracking-widest text-[#f0c040]">
                Entrega
              </label>
              <select
                id="owner-orders-delivery"
                value={filters.deliveryMethod}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, deliveryMethod: event.target.value }))
                  completeStep('filter-used', 'owner-orders')
                }}
                className="w-full h-11 px-3 rounded-xl text-sm outline-none bg-white/[0.06] border border-white/[0.12] text-[#f0ede8]"
              >
                <option value="" className="bg-[#111118]">Entrega</option>
                <option value="pickup" className="bg-[#111118]">Retirada</option>
                <option value="delivery" className="bg-[#111118]">Entrega</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="owner-orders-city" className="text-[11px] uppercase tracking-widest text-[#f0c040]">
                Cidade
              </label>
              <input
                id="owner-orders-city"
                placeholder="Cidade"
                value={filters.city}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, city: event.target.value }))
                  completeStep('filter-used', 'owner-orders')
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  completeStep('filter-used', 'owner-orders')
                  void ordersQuery.refetch()
                }}
                className="w-full h-11 px-3 rounded-xl text-sm outline-none bg-white/[0.06] border border-white/[0.12] text-[#f0ede8]"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="owner-orders-customer" className="text-[11px] uppercase tracking-widest text-[#f0c040]">
                Cliente
              </label>
              <input
                id="owner-orders-customer"
                placeholder="Cliente"
                value={filters.customer}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, customer: event.target.value }))
                  completeStep('filter-used', 'owner-orders')
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  completeStep('filter-used', 'owner-orders')
                  void ordersQuery.refetch()
                }}
                className="w-full h-11 px-3 rounded-xl text-sm outline-none bg-white/[0.06] border border-white/[0.12] text-[#f0ede8]"
              />
            </div>
          </div>
        </div>

        {ordersQuery.isLoading ? (
          <div className="p-3 rounded-xl text-sm bg-white/[0.04] border border-white/[0.08] text-[#9ca3af]">
            Carregando pedidos...
          </div>
        ) : null}

        {feedback ? (
          <div className="p-3 rounded-xl text-sm bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]">
            {feedback}
          </div>
        ) : null}
        {error ? (
          <div className="p-3 rounded-xl text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            {orders.map((order: OwnerOrderSummary) => (
              <div key={order.id} className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-[#f0ede8] font-semibold">Pedido #{order.id}</p>
                  <button
                    className="h-9 px-3 rounded-full text-xs border border-[#d4a843]/40 text-[#d4a843]"
                    onClick={() => {
                      setSelectedOrder(order.id)
                      completeStep('detail-opened', 'owner-orders')
                    }}
                  >
                    Detalhes
                  </button>
                </div>
                <p className="text-xs mt-1 text-[#9ca3af]">
                  {order.customer.name} • {order.customer.email}
                </p>
                <div className="flex flex-wrap gap-3 text-xs mt-2 text-[#6b7280]">
                  <span>Status: {ORDER_STATUS_LABEL[order.status] ?? order.status}</span>
                  <span>Pagamento: {PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}{order.paymentMethod ? ` • ${PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}` : ''}</span>
                  <span>Entrega: {DELIVERY_METHOD_LABEL[order.deliveryMethod] ?? order.deliveryMethod}</span>
                  <span>Cidade: {order.deliveryCity || 'N/I'}</span>
                  <span className="text-[#d4a843] font-bold">{formatCurrency(order.total)}</span>
                </div>
              </div>
            ))}
            {orders.length === 0 && !ordersQuery.isLoading ? (
              <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-[#9ca3af]">
                Nenhum pedido encontrado para o filtro atual.
              </div>
            ) : null}
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] min-h-[220px]">
            <p className="text-sm mb-2 text-[#f0ede8] font-semibold">Detalhe do pedido</p>
            {!selectedOrder ? (
              <p className="text-sm text-[#6b7280]">Selecione um pedido para visualizar.</p>
            ) : detailsQuery.isLoading ? (
              <p className="text-sm text-[#6b7280]">Carregando detalhes...</p>
            ) : detailsQuery.data?.item ? (
              <div className="space-y-2 text-sm text-[#9ca3af]">
                {(() => {
                  const detail = detailsQuery.data?.item as OwnerOrderDetail | null
                  if (!detail) {
                    return <p className="text-sm text-[#6b7280]">Nao foi possivel carregar o pedido.</p>
                  }
                  return (
                    <>
                      <p>Cliente: <strong className="text-[#f0ede8]">{detail.customer.name}</strong></p>
                      <p>Status atual: <strong className="text-[#f0ede8]">{ORDER_STATUS_LABEL[detail.status] ?? detail.status}</strong></p>
                      <div>
                        <label htmlFor="owner-order-status-update" className="text-[11px] uppercase tracking-widest text-[#f0c040]">
                          Atualizar status
                        </label>
                        <select
                          id="owner-order-status-update"
                          value={detail.status}
                          onChange={(event) => requestStatusUpdate(detail.id, event.target.value)}
                          className="w-full mt-2 h-11 px-3 rounded-xl text-sm outline-none bg-white/[0.06] border border-white/[0.12] text-[#f0ede8]"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status} className="bg-[#111118]">{ORDER_STATUS_LABEL[status] ?? status}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )
                })()}
              </div>
            ) : (
              <p className="text-sm text-[#6b7280]">Nao foi possivel carregar o pedido.</p>
            )}
          </div>
        </div>

        {pendingStatusChange ? (
          <div className="p-3 rounded-xl text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
            Confirmar cancelamento do pedido #{pendingStatusChange.id}?{' '}
            <button
              className="ml-2 h-9 px-3 rounded-full text-xs border border-[#ef4444]/40 text-[#f87171]"
              onClick={() => {
                statusMutation.mutate(pendingStatusChange)
                setPendingStatusChange(null)
              }}
            >
              Confirmar
            </button>
            <button
              className="ml-2 h-9 px-3 rounded-full text-xs border border-[#d4a843]/40 text-[#d4a843]"
              onClick={() => setPendingStatusChange(null)}
            >
              Cancelar
            </button>
          </div>
        ) : null}
      </div>
    </OwnerLayout>
  )
}
