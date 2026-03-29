import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, Loader2, RefreshCw } from 'lucide-react'
import OwnerLayout from '../shared/layout/OwnerLayout'
import { api, friendlyError, type OwnerOrderSummary } from '../shared/lib/api'
import { formatCurrency } from '../shared/lib'
import { useAssist } from '../shared/context/AssistContext'

/* ── Constantes ─────────────────────────────────────────────── */

const STATUS_OPTIONS = ['created', 'paid', 'shipped', 'completed', 'cancelled']

const ORDER_STATUS_LABEL: Record<string, string> = {
  created:    'Criado',
  confirmed:  'Confirmado',
  processing: 'Em processamento',
  paid:       'Pago',
  shipped:    'Enviado',
  delivered:  'Entregue',
  completed:  'Concluído',
  cancelled:  'Cancelado',
  refunded:   'Reembolsado',
}

const ORDER_STATUS_STYLE: Record<string, string> = {
  created:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  confirmed:  'bg-sky-500/10 text-sky-400 border-sky-500/20',
  processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  paid:       'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  shipped:    'bg-violet-500/10 text-violet-400 border-violet-500/20',
  delivered:  'bg-teal-500/10 text-teal-400 border-teal-500/20',
  completed:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled:  'bg-red-500/10 text-red-400 border-red-500/20',
  refunded:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending:         'Aguardando',
  requires_action: 'Ação necessária',
  authorized:      'Autorizado',
  paid:            'Pago',
  rejected:        'Rejeitado',
  expired:         'Expirado',
  refunded:        'Reembolsado',
  cancelled:       'Cancelado',
}

const DELIVERY_METHOD_LABEL: Record<string, string> = {
  pickup:   'Retirada',
  delivery: 'Entrega',
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card_credit: 'Cartão de crédito',
  card_debit:  'Cartão de débito',
  pix:         'Pix',
}

type OwnerOrderDetail = { id: number; status: string; customer: { name: string } }

/* ── Sub-componentes ────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const style = ORDER_STATUS_STYLE[status] ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${style}`}>
      {ORDER_STATUS_LABEL[status] ?? status}
    </span>
  )
}

/* ── Página ─────────────────────────────────────────────────── */

export default function OwnerOrdersPage() {
  const { completeStep } = useAssist()
  const [filters, setFilters] = useState({
    status: '',
    deliveryMethod: '',
    city: '',
    customer: '',
    limit: 50,
  })
  const [feedback, setFeedback]         = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null)
  const [pendingCancel, setPendingCancel] = useState<number | null>(null)

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
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.updateOwnerOrderStatus(id, status),
    onSuccess: async () => {
      setFeedback('Status atualizado com sucesso.')
      setError(null)
      completeStep('status-updated', 'owner-orders')
      await ordersQuery.refetch()
      if (selectedOrder) await detailsQuery.refetch()
    },
    onError: (err) => {
      setError(friendlyError(err, 'Falha ao atualizar status.'))
    },
  })

  const orders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data?.items])

  function requestStatusUpdate(id: number, status: string) {
    if (!status) return
    if (status === 'cancelled') { setPendingCancel(id); return }
    statusMutation.mutate({ id, status })
  }

  const detail = detailsQuery.data?.item as OwnerOrderDetail | null

  return (
    <OwnerLayout>
      <div className="space-y-6">

        {/* ── Cabeçalho ────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#f0ede8]">Pedidos</h1>
            <p className="mt-0.5 text-xs text-[#6b7280]">
              Gerencie status, método de entrega e pagamento de cada venda.
            </p>
          </div>
          <button
            onClick={() => void ordersQuery.refetch()}
            disabled={ordersQuery.isFetching}
            className="flex items-center gap-2 h-9 px-3 rounded-lg text-xs bg-[#d4a843]/10 border border-[#d4a843]/30 text-[#d4a843] hover:bg-[#d4a843]/15 transition-colors disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${ordersQuery.isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* ── Filtros ──────────────────────────────────────────── */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label htmlFor="owner-orders-status" className="block text-[10px] uppercase tracking-widest text-[#6b7280] mb-1">
                Status
              </label>
              <select
                id="owner-orders-status"
                value={filters.status}
                onChange={(e) => { setFilters((p) => ({ ...p, status: e.target.value })); completeStep('filter-used', 'owner-orders') }}
                className="w-full h-9 px-2.5 rounded-lg text-xs outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
              >
                <option value="" className="bg-[#111118]">Todos</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="bg-[#111118]">{ORDER_STATUS_LABEL[s] ?? s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="owner-orders-delivery" className="block text-[10px] uppercase tracking-widest text-[#6b7280] mb-1">
                Entrega
              </label>
              <select
                id="owner-orders-delivery"
                value={filters.deliveryMethod}
                onChange={(e) => { setFilters((p) => ({ ...p, deliveryMethod: e.target.value })); completeStep('filter-used', 'owner-orders') }}
                className="w-full h-9 px-2.5 rounded-lg text-xs outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
              >
                <option value="" className="bg-[#111118]">Todos</option>
                <option value="pickup" className="bg-[#111118]">Retirada</option>
                <option value="delivery" className="bg-[#111118]">Entrega</option>
              </select>
            </div>
            <div>
              <label htmlFor="owner-orders-city" className="block text-[10px] uppercase tracking-widest text-[#6b7280] mb-1">
                Cidade
              </label>
              <input
                id="owner-orders-city"
                placeholder="Filtrar por cidade"
                value={filters.city}
                onChange={(e) => { setFilters((p) => ({ ...p, city: e.target.value })); completeStep('filter-used', 'owner-orders') }}
                onKeyDown={(e) => { if (e.key === 'Enter') void ordersQuery.refetch() }}
                className="w-full h-9 px-2.5 rounded-lg text-xs outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8] placeholder:text-[#4b5563]"
              />
            </div>
            <div>
              <label htmlFor="owner-orders-customer" className="block text-[10px] uppercase tracking-widest text-[#6b7280] mb-1">
                Cliente
              </label>
              <input
                id="owner-orders-customer"
                placeholder="Nome ou e-mail"
                value={filters.customer}
                onChange={(e) => { setFilters((p) => ({ ...p, customer: e.target.value })); completeStep('filter-used', 'owner-orders') }}
                onKeyDown={(e) => { if (e.key === 'Enter') void ordersQuery.refetch() }}
                className="w-full h-9 px-2.5 rounded-lg text-xs outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8] placeholder:text-[#4b5563]"
              />
            </div>
          </div>
        </div>

        {/* ── Feedback ─────────────────────────────────────────── */}
        {feedback ? (
          <div className="flex items-center gap-2 p-3 rounded-lg text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            {feedback}
          </div>
        ) : null}
        {error ? (
          <div className="flex items-center gap-2 p-3 rounded-lg text-xs bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        ) : null}

        {/* ── Conteúdo ─────────────────────────────────────────── */}
        {ordersQuery.isLoading ? (
          <div className="flex items-center gap-2 p-4 rounded-xl text-sm text-[#6b7280] bg-white/[0.03] border border-white/[0.07]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando pedidos...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">

            {/* Lista de pedidos */}
            <div className="space-y-2">
              {orders.length === 0 ? (
                <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.07] text-sm text-[#6b7280] text-center">
                  Nenhum pedido encontrado para os filtros atuais.
                </div>
              ) : null}

              {orders.map((order: OwnerOrderSummary) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => { setSelectedOrder(order.id); completeStep('detail-opened', 'owner-orders') }}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    selectedOrder === order.id
                      ? 'bg-white/[0.06] border-[#d4a843]/25'
                      : 'bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-[#f0ede8]">Pedido #{order.id}</p>
                      <p className="text-xs text-[#6b7280] mt-0.5">
                        {order.customer.name}
                        {order.customer.email ? ` · ${order.customer.email}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#6b7280]">
                    <span>{DELIVERY_METHOD_LABEL[order.deliveryMethod] ?? order.deliveryMethod}</span>
                    <span>
                      {PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}
                      {order.paymentMethod ? ` · ${PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}` : ''}
                    </span>
                    {order.deliveryCity ? <span>{order.deliveryCity}</span> : null}
                    <span className="text-[#d4a843] font-semibold ml-auto">{formatCurrency(order.total)}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Painel de detalhe */}
            <div className="sticky top-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-sm font-semibold text-[#f0ede8]">Detalhe do pedido</p>
              </div>

              <div className="p-4">
                {!selectedOrder ? (
                  <p className="text-sm text-[#4b5563] text-center py-6">
                    Selecione um pedido para ver os detalhes.
                  </p>
                ) : detailsQuery.isLoading ? (
                  <div className="flex items-center gap-2 py-6 justify-center text-sm text-[#6b7280]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando...
                  </div>
                ) : !detail ? (
                  <p className="text-sm text-red-400 text-center py-4">
                    Não foi possível carregar o pedido.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Resumo */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#6b7280]">Pedido</span>
                        <span className="text-[#f0ede8] font-semibold">#{detail.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6b7280]">Cliente</span>
                        <span className="text-[#f0ede8] font-semibold">{detail.customer.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#6b7280]">Status atual</span>
                        <StatusBadge status={detail.status} />
                      </div>
                    </div>

                    {/* Alterar status */}
                    <div>
                      <label htmlFor="owner-order-status-update" className="block text-[10px] uppercase tracking-widest text-[#6b7280] mb-1.5">
                        Alterar status
                      </label>
                      <div className="relative">
                        <select
                          id="owner-order-status-update"
                          value={detail.status}
                          onChange={(e) => requestStatusUpdate(detail.id, e.target.value)}
                          disabled={statusMutation.isPending}
                          className="w-full h-10 pl-3 pr-8 rounded-xl text-sm outline-none bg-white/[0.06] border border-white/[0.12] text-[#f0ede8] appearance-none disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s} className="bg-[#111118]">
                              {ORDER_STATUS_LABEL[s] ?? s}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                      </div>
                      {statusMutation.isPending ? (
                        <p className="mt-1.5 text-xs text-[#6b7280] flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Atualizando...
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Modal de confirmação de cancelamento ─────────────── */}
        {pendingCancel !== null ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="w-full max-w-sm rounded-2xl bg-[#0d0d14] border border-white/[0.1] p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#f0ede8]">Cancelar pedido #{pendingCancel}?</p>
                  <p className="text-xs text-[#6b7280] mt-0.5">Esta ação não pode ser desfeita.</p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  className="flex-1 h-9 rounded-xl text-xs border border-white/[0.1] text-[#9ca3af] hover:text-[#f0ede8] transition-colors"
                  onClick={() => setPendingCancel(null)}
                >
                  Voltar
                </button>
                <button
                  className="flex-1 h-9 rounded-xl text-xs bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors font-semibold"
                  onClick={() => {
                    statusMutation.mutate({ id: pendingCancel, status: 'cancelled' })
                    setPendingCancel(null)
                  }}
                >
                  Confirmar cancelamento
                </button>
              </div>
            </div>
          </div>
        ) : null}

      </div>
    </OwnerLayout>
  )
}
