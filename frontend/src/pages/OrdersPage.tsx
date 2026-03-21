import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BackButton } from '../shared/ui/primitives/BackButton'
import { AccountSidebar } from '../shared/ui/primitives/AccountSidebar'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../shared/lib/api'
import { useAuth } from '../shared/context/AuthContext'
import { useAssist } from '../shared/context/AssistContext'
import { formatCurrency } from '../shared/lib'

const ORDER_STATUS_LABEL: Record<string, string> = {
  created: 'Criado',
  confirmed: 'Confirmado',
  processing: 'Em processamento',
  shipped: 'Enviado',
  delivered: 'Entregue',
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

export default function OrdersPage() {
  const { status } = useAuth()
  const { completeStep } = useAssist()
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null)

  const ordersQuery = useQuery({
    queryKey: ['orders-list'],
    queryFn: () => api.listOrders(),
    enabled: status === 'authenticated',
  })

  const orders = useMemo(
    () => (ordersQuery.data?.items ?? []).filter((order) => order.status !== 'cancelled'),
    [ordersQuery.data?.items],
  )

  function canCancelOrder(order: { status: string; paymentStatus?: string }) {
    return order.status === 'created' && ['pending', 'requires_action', 'rejected', 'expired'].includes(String(order.paymentStatus || 'pending'))
  }

  async function handleCancelOrder(orderId: number) {
    if (cancellingOrderId) return
    setCancellingOrderId(orderId)
    setFeedback(null)
    setError(null)
    try {
      await api.cancelOrder(orderId)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders-list'] }),
        queryClient.invalidateQueries({ queryKey: ['bag'] }),
      ])
      setFeedback(`Pedido #${orderId} cancelado.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel cancelar o pedido.')
    } finally {
      setCancellingOrderId(null)
    }
  }

  useEffect(() => {
    if (ordersQuery.data?.items && ordersQuery.data.items.length > 0) {
      completeStep('orders-viewed', 'orders')
    }
  }, [ordersQuery.data?.items, completeStep])

  if (status === 'loading') {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#9ca3af]">
            Carregando...
          </div>
        </div>
      </div>
    )
  }

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <h1 className="text-2xl mb-2 text-[#f0ede8] font-bold">Meus pedidos</h1>
            <p className="text-sm mb-4 text-[#6b7280]">Faça login para acompanhar seus pedidos.</p>
            <Link to="/auth?returnTo=/orders" className="inline-flex px-4 py-2 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <BackButton />
        <div className="flex gap-8 items-start">
        <div className="hidden md:block sticky top-28"><AccountSidebar /></div>
        <div className="flex-1">
        <div className="mb-6">
          <h1 className="text-2xl text-[#f0ede8] font-bold">Meus pedidos</h1>
          <p className="text-sm text-[#6b7280]">Histórico completo com status, método de entrega e total.</p>
        </div>

        {ordersQuery.isLoading ? (
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#9ca3af]">
            Carregando pedidos...
          </div>
        ) : null}

        {ordersQuery.isError ? (
          <div className="p-4 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
            Não foi possível carregar os pedidos.
          </div>
        ) : null}
        {feedback ? (
          <div className="mb-4 p-4 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]">
            {feedback}
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 p-4 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
            {error}
          </div>
        ) : null}

        {orders.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <h2 className="text-lg mb-2 text-[#f0ede8] font-semibold">Você ainda não possui pedidos</h2>
            <p className="text-sm mb-4 text-[#6b7280]">Navegue no catálogo, adicione itens na mochila e finalize o checkout.</p>
            <Link to="/catalog" className="inline-flex px-4 py-2 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold">
              Ir para o catálogo
            </Link>
          </div>
        ) : null}

        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                <h3 className="text-sm text-[#f0ede8] font-semibold">Pedido #{order.id}</h3>
                <span className="text-xs text-[#6b7280]">{new Date(order.createdAt).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-[#9ca3af]">
                <span>Status: <strong className="text-[#f0ede8]">{ORDER_STATUS_LABEL[order.status] ?? order.status}</strong></span>
                <span>Pagamento: <strong className="text-[#f0ede8]">{PAYMENT_STATUS_LABEL[order.paymentStatus ?? 'pending'] ?? order.paymentStatus}</strong></span>
                <span>Método: <strong className="text-[#f0ede8]">{DELIVERY_METHOD_LABEL[order.deliveryMethod ?? 'pickup'] ?? order.deliveryMethod}</strong></span>
                <span>Total: <strong className="text-[#d4a843]">{formatCurrency(order.total)}</strong></span>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                {canCancelOrder(order) ? (
                  <button
                    type="button"
                    onClick={() => void handleCancelOrder(order.id)}
                    disabled={cancellingOrderId === order.id}
                    className="px-3 py-1.5 rounded-lg text-xs border border-[#ef4444]/40 text-[#f87171] disabled:opacity-60"
                  >
                    {cancellingOrderId === order.id ? 'Cancelando...' : 'Cancelar pedido'}
                  </button>
                ) : null}
                <Link
                  to={`/orders/${order.id}`}
                  className="px-3 py-1.5 rounded-lg text-xs border border-[#d4a843]/40 text-[#d4a843]"
                  onClick={() => completeStep('details-opened', 'orders')}
                >
                  Ver detalhes
                </Link>
              </div>
            </div>
          ))}
        </div>
        </div>{/* flex-1 */}
        </div>{/* flex row */}
      </div>
    </div>
  )
}
